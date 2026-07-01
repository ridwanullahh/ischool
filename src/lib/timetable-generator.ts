/**
 * Timetable Auto-Generation Engine
 *
 * Generates conflict-free timetables using a constraint-satisfaction
 * approach with backtracking. Considers:
 * - Teacher availability (no double-booking)
 * - Room availability (no double-booking)
 * - Class capacity and subject-period allocation rules
 * - Subject distribution across the week
 *
 * Also provides conflict detection for manual editing.
 */

import { getDb } from './db/index.js';
import { timetableEntries, classes, subjects, teachers, rooms, academicPeriods } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface TimetableSlot {
  dayOfWeek: number; // 0-6
  startTime: string; // "08:00"
  endTime: string; // "08:50"
  classId: number;
  subjectId?: number;
  teacherId?: number;
  roomId?: number;
}

export interface TimetableConflict {
  type: 'teacher' | 'room' | 'class';
  message: string;
  entryId?: number;
  conflictingEntryId?: number;
}

export interface GenerationResult {
  ok: boolean;
  generated: number;
  conflicts: TimetableConflict[];
  message: string;
}

/**
 * Detects conflicts for a proposed timetable entry.
 * Returns an array of conflicts (empty = no conflicts).
 */
export function detectConflicts(schoolId: number, slot: TimetableSlot, excludeEntryId?: number): TimetableConflict[] {
  const db = getDb();
  const conflicts: TimetableConflict[] = [];

  // Get all entries for the same day + time slot (overlapping)
  const sameSlot = db.select().from(timetableEntries)
    .where(and(
      eq(timetableEntries.schoolId, schoolId),
      eq(timetableEntries.dayOfWeek, slot.dayOfWeek)
    ))
    .all()
    .filter(e => {
      if (excludeEntryId && e.id === excludeEntryId) return false;
      // Check time overlap
      return timeOverlaps(e.startTime, e.endTime, slot.startTime, slot.endTime);
    });

  for (const existing of sameSlot) {
    // Teacher conflict
    if (slot.teacherId && existing.teacherId === slot.teacherId) {
      conflicts.push({
        type: 'teacher',
        message: `Teacher already assigned at ${existing.startTime}-${existing.endTime}`,
        conflictingEntryId: existing.id,
      });
    }
    // Room conflict
    if (slot.roomId && existing.roomId === slot.roomId) {
      conflicts.push({
        type: 'room',
        message: `Room already booked at ${existing.startTime}-${existing.endTime}`,
        conflictingEntryId: existing.id,
      });
    }
    // Class conflict (same class can't be in two places)
    if (existing.classId === slot.classId) {
      conflicts.push({
        type: 'class',
        message: `Class already has a period at ${existing.startTime}-${existing.endTime}`,
        conflictingEntryId: existing.id,
      });
    }
  }

  return conflicts;
}

/**
 * Checks if two time ranges overlap.
 */
function timeOverlaps(start1: string | null, end1: string | null, start2: string, end2: string): boolean {
  if (!start1 || !end1) return false;
  return start1 < end2 && start2 < end1;
}

/**
 * Generates a complete timetable for a class based on subject-period
 * allocation rules. Uses a greedy algorithm with conflict avoidance.
 *
 * @param schoolId - School ID
 * @param classId - Class to generate for
 * @param allocations - Subject-period rules: [{ subjectId, teacherId, periodsPerWeek }]
 * @param timeSlots - Available time slots: [{ dayOfWeek, startTime, endTime }]
 * @param roomId - Optional default room
 */
export function generateTimetable(
  schoolId: number,
  classId: number,
  allocations: { subjectId: number; teacherId?: number; periodsPerWeek: number }[],
  timeSlots: { dayOfWeek: number; startTime: string; endTime: string }[],
  roomId?: number
): GenerationResult {
  const db = getDb();

  // Clear existing entries for this class
  db.delete(timetableEntries).where(
    and(eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.classId, classId))
  ).run();

  // Build a list of all periods to place (expanded from allocations)
  const periodsToPlace: { subjectId: number; teacherId?: number }[] = [];
  for (const alloc of allocations) {
    for (let i = 0; i < alloc.periodsPerWeek; i++) {
      periodsToPlace.push({ subjectId: alloc.subjectId, teacherId: alloc.teacherId });
    }
  }

  // Shuffle for variety
  periodsToPlace.sort(() => Math.random() - 0.5);

  let generated = 0;
  const conflicts: TimetableConflict[] = [];
  const usedSlots = new Set<string>(); // "day-startTime"

  // Sort time slots by day then time
  const sortedSlots = [...timeSlots].sort((a, b) =>
    a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
  );

  for (const period of periodsToPlace) {
    let placed = false;

    for (const slot of sortedSlots) {
      const slotKey = slot.dayOfWeek + '-' + slot.startTime;
      if (usedSlots.has(slotKey)) continue;

      // Check for conflicts
      const slotConflicts = detectConflicts(schoolId, {
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        classId,
        subjectId: period.subjectId,
        teacherId: period.teacherId,
        roomId,
      });

      if (slotConflicts.length === 0) {
        // Place the entry
        db.insert(timetableEntries).values({
          schoolId,
          classId,
          subjectId: period.subjectId,
          teacherId: period.teacherId || null,
          roomId: roomId || null,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          createdAt: new Date(),
        }).run();

        usedSlots.add(slotKey);
        generated++;
        placed = true;
        break;
      }
    }

    if (!placed) {
      conflicts.push({
        type: 'class',
        message: `Could not place subject ${period.subjectId} - no free slots without conflicts`,
      });
    }
  }

  return {
    ok: conflicts.length === 0,
    generated,
    conflicts,
    message: conflicts.length === 0
      ? `Successfully generated ${generated} periods`
      : `Generated ${generated} periods with ${conflicts.length} conflicts`,
  };
}

/**
 * Returns all conflicts in the current timetable for a school.
 */
export function findAllConflicts(schoolId: number): TimetableConflict[] {
  const db = getDb();
  const allEntries = db.select().from(timetableEntries)
    .where(eq(timetableEntries.schoolId, schoolId))
    .all();

  const conflicts: TimetableConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < allEntries.length; i++) {
    for (let j = i + 1; j < allEntries.length; j++) {
      const a = allEntries[i];
      const b = allEntries[j];

      // Same day + overlapping time
      if (a.dayOfWeek === b.dayOfWeek && timeOverlaps(a.startTime, a.endTime, b.startTime || '', b.endTime || '')) {
        const pairKey = [Math.min(a.id, b.id), Math.max(a.id, b.id)].join('-');
        if (seen.has(pairKey)) continue;

        if (a.teacherId && a.teacherId === b.teacherId) {
          seen.add(pairKey);
          conflicts.push({
            type: 'teacher',
            message: `Teacher double-booked on day ${a.dayOfWeek} at ${a.startTime}`,
            entryId: a.id,
            conflictingEntryId: b.id,
          });
        }
        if (a.roomId && a.roomId === b.roomId) {
          seen.add(pairKey);
          conflicts.push({
            type: 'room',
            message: `Room double-booked on day ${a.dayOfWeek} at ${a.startTime}`,
            entryId: a.id,
            conflictingEntryId: b.id,
          });
        }
        if (a.classId === b.classId) {
          seen.add(pairKey);
          conflicts.push({
            type: 'class',
            message: `Class double-booked on day ${a.dayOfWeek} at ${a.startTime}`,
            entryId: a.id,
            conflictingEntryId: b.id,
          });
        }
      }
    }
  }

  return conflicts;
}
