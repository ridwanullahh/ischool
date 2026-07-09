import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { vehicleMaintenance, vehicleDocuments, vehicles, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const action = url.searchParams.get('action');

  if (action === 'documents') {
    const docs = db.select({
      id: vehicleDocuments.id, vehicleId: vehicleDocuments.vehicleId, driverId: vehicleDocuments.driverId,
      documentType: vehicleDocuments.documentType, documentNumber: vehicleDocuments.documentNumber,
      issueDate: vehicleDocuments.issueDate, expiryDate: vehicleDocuments.expiryDate,
      fileUrl: vehicleDocuments.fileUrl, notes: vehicleDocuments.notes,
      vehicleName: vehicles.name, vehiclePlate: vehicles.plateNumber,
    }).from(vehicleDocuments)
      .leftJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
      .where(eq(vehicleDocuments.schoolId, schoolId))
      .orderBy(desc(vehicleDocuments.expiryDate)).all();
    return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
  }

  const maintenance = db.select({
    id: vehicleMaintenance.id, vehicleId: vehicleMaintenance.vehicleId,
    serviceType: vehicleMaintenance.serviceType, description: vehicleMaintenance.description,
    serviceDate: vehicleMaintenance.serviceDate, nextServiceDate: vehicleMaintenance.nextServiceDate,
    odometer: vehicleMaintenance.odometer, cost: vehicleMaintenance.cost,
    serviceProvider: vehicleMaintenance.serviceProvider, status: vehicleMaintenance.status,
    notes: vehicleMaintenance.notes, createdAt: vehicleMaintenance.createdAt,
    vehicleName: vehicles.name, vehiclePlate: vehicles.plateNumber,
  }).from(vehicleMaintenance)
    .leftJoin(vehicles, eq(vehicleMaintenance.vehicleId, vehicles.id))
    .where(eq(vehicleMaintenance.schoolId, schoolId))
    .orderBy(desc(vehicleMaintenance.serviceDate)).all();
  return new Response(JSON.stringify(maintenance), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.action === 'add_document') {
    if (!data.documentType || !data.expiryDate) return new Response(JSON.stringify({ error: 'documentType and expiryDate required' }), { status: 400 });
    const result = db.insert(vehicleDocuments).values({
      schoolId,
      vehicleId: data.vehicleId || null,
      driverId: data.driverId || null,
      documentType: data.documentType,
      documentNumber: data.documentNumber || null,
      issueDate: data.issueDate || null,
      expiryDate: data.expiryDate,
      fileUrl: data.fileUrl || null,
      notes: data.notes || null,
      createdAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.vehicleId || !data.serviceDate) {
    return new Response(JSON.stringify({ error: 'vehicleId and serviceDate required' }), { status: 400 });
  }
  const result = db.insert(vehicleMaintenance).values({
    schoolId, vehicleId: data.vehicleId,
    serviceType: data.serviceType || 'routine',
    description: data.description || null,
    serviceDate: data.serviceDate,
    nextServiceDate: data.nextServiceDate || null,
    odometer: data.odometer || null,
    cost: data.cost || null,
    serviceProvider: data.serviceProvider || null,
    status: data.status || 'completed',
    notes: data.notes || null,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  if (data.type === 'document') {
    db.update(vehicleDocuments).set({
      documentType: data.documentType, documentNumber: data.documentNumber,
      issueDate: data.issueDate, expiryDate: data.expiryDate, notes: data.notes,
      updatedAt: new Date(),
    }).where(and(eq(vehicleDocuments.id, data.id), eq(vehicleDocuments.schoolId, schoolId))).run();
  } else {
    db.update(vehicleMaintenance).set({
      serviceType: data.serviceType, description: data.description,
      serviceDate: data.serviceDate, nextServiceDate: data.nextServiceDate,
      odometer: data.odometer, cost: data.cost, serviceProvider: data.serviceProvider,
      status: data.status, notes: data.notes, updatedAt: new Date(),
    }).where(and(eq(vehicleMaintenance.id, data.id), eq(vehicleMaintenance.schoolId, schoolId))).run();
  }
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id, type } = await request.json();
  const db = getDb();
  if (type === 'document') {
    db.delete(vehicleDocuments).where(and(eq(vehicleDocuments.id, id), eq(vehicleDocuments.schoolId, schoolId))).run();
  } else {
    db.delete(vehicleMaintenance).where(and(eq(vehicleMaintenance.id, id), eq(vehicleMaintenance.schoolId, schoolId))).run();
  }
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
