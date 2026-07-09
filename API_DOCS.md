# iSchool API Documentation

## Base URL

```
Development: http://localhost:4321
Production: https://your-domain.com
```

## Authentication

All dashboard API endpoints require a valid session cookie.

```
Cookie: session=<session-id>
```

Sessions are created via `POST /api/auth/login` and expire after 24 hours of inactivity.

## Error Responses

All errors follow a standardized format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of the error",
    "details": {}
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid input |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | Permission denied |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate or conflicting state |
| 413 | PAYLOAD_TOO_LARGE | File too large |
| 415 | UNSUPPORTED_MEDIA_TYPE | File type not allowed |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 10 requests per minute per IP |
| `/api/auth/register` | 5 requests per minute per IP |
| `/api/auth/password-reset` | 3 requests per hour per IP |
| All other `/api/*` | 120 requests per minute per IP |

Rate-limited responses include `Retry-After` header.

## RBAC Permissions

All dashboard APIs enforce role-based access control via `guardPermission()`.

| Role | Description |
|------|-------------|
| super_admin | Full platform access |
| school_admin | Full school access |
| teacher | Teaching-related modules |
| student | Student portal access |
| parent | Parent portal access |
| staff | Staff-level access |
| accountant | Finance module access |
| librarian | Library module access |
| it_admin | IT administration |

## Module APIs

### SIS (Module 1)

#### Students
- `GET /api/dashboard/students` — List students (permission: `students.view`)
- `GET /api/dashboard/students?search=query` — Search students
- `GET /api/dashboard/students?status=active` — Filter by status
- `GET /api/dashboard/students?action=export` — Export CSV
- `POST /api/dashboard/students` — Create student (`students.create`)
- `POST /api/dashboard/students` (action: `bulk_import`) — Bulk import from CSV
- `PUT /api/dashboard/students` — Update student (`students.edit`)
- `DELETE /api/dashboard/students` — Delete student (`students.delete`)

#### Student Medical Records
- `GET /api/dashboard/student-medical?studentId=X` — List medical records
- `POST /api/dashboard/student-medical` — Create medical record
- `PUT /api/dashboard/student-medical` — Update medical record
- `DELETE /api/dashboard/student-medical` — Delete medical record

#### Student Documents
- `GET /api/dashboard/student-documents?studentId=X` — List documents
- `POST /api/dashboard/student-documents` — Upload document
- `PUT /api/dashboard/student-documents` — Update document
- `DELETE /api/dashboard/student-documents` — Delete document

#### Attendance
- `GET /api/dashboard/attendance?date=YYYY-MM-DD` — List by date
- `GET /api/dashboard/attendance?studentId=X` — List by student
- `GET /api/dashboard/attendance?action=export` — Export CSV
- `POST /api/dashboard/attendance` — Mark attendance
- `POST /api/dashboard/attendance` (action: `bulk`) — Bulk mark
- `PUT /api/dashboard/attendance` — Update record
- `DELETE /api/dashboard/attendance` — Delete record

#### Classes
- `POST /api/dashboard/classes` — Create/update/delete class (form data)

#### Class Subjects
- `GET /api/dashboard/class-subjects?classId=X` — List subjects
- `POST /api/dashboard/class-subjects` — Assign subject to class
- `PUT /api/dashboard/class-subjects` — Update assignment
- `DELETE /api/dashboard/class-subjects` — Remove assignment

### LMS (Module 2)

#### Courses
- `GET /api/dashboard/courses` — List courses
- `POST /api/dashboard/courses` — Create course
- `PUT /api/dashboard/courses` — Update course
- `DELETE /api/dashboard/courses` — Delete course

#### Lessons
- `GET /api/dashboard/lessons?courseId=X` — List lessons with units
- `POST /api/dashboard/lessons` (action: `create_unit`) — Create unit
- `POST /api/dashboard/lessons` (action: `update_unit`) — Update unit
- `POST /api/dashboard/lessons` (action: `delete_unit`) — Delete unit
- `POST /api/dashboard/lessons` — Create lesson
- `PUT /api/dashboard/lessons` — Update lesson
- `DELETE /api/dashboard/lessons` — Delete lesson

#### Assignments
- `GET /api/dashboard/assignments` — List assignments
- `GET /api/dashboard/assignments?action=submissions&assignmentId=X` — List submissions
- `POST /api/dashboard/assignments` — Create assignment
- `POST /api/dashboard/assignments` (action: `grade_submission`) — Grade + sync to gradebook
- `PUT /api/dashboard/assignments` — Update assignment
- `DELETE /api/dashboard/assignments` — Delete assignment

### Timetable (Module 3)

#### Timetable Entries
- `GET /api/dashboard/timetable?classId=X` — List entries
- `GET /api/dashboard/timetable?action=export` — Export CSV
- `GET /api/dashboard/timetable?action=prayer_schedules` — List prayer schedules
- `GET /api/dashboard/timetable?action=academic_periods` — List academic periods
- `POST /api/dashboard/timetable` (action: `create_period`) — Create academic period
- `POST /api/dashboard/timetable` (action: `create_prayer_schedule`) — Create prayer schedule
- `POST /api/dashboard/timetable` (action: `create_entry`) — Create timetable entry
- `PUT /api/dashboard/timetable` — Update entry
- `DELETE /api/dashboard/timetable` — Delete entry

### Finance (Module 5)

#### Invoices
- `GET /api/dashboard/invoices` — List invoices
- `GET /api/dashboard/invoices?action=export` — Export CSV
- `POST /api/dashboard/invoices` — Create invoice
- `POST /api/dashboard/invoices` (action: `bulk_generate`) — Bulk generate from fee structure
- `PUT /api/dashboard/invoices` — Update invoice
- `DELETE /api/dashboard/invoices` — Delete invoice

#### Payments
- `POST /api/dashboard/payments` (action: `initiate`) — Initiate online payment
- `POST /api/dashboard/payments` (action: `verify`) — Verify payment
- `POST /api/dashboard/payments` (action: `manual`) — Record manual payment (cash/transfer)

### CBT (Module 16)

#### CBT Exams
- `GET /api/dashboard/cbt` — List exams
- `POST /api/dashboard/cbt` — Create exam
- `PUT /api/dashboard/cbt` — Update exam
- `DELETE /api/dashboard/cbt` — Delete exam

#### CBT Candidates
- `GET /api/dashboard/cbt-candidates` — List candidates
- `GET /api/dashboard/cbt-candidates?action=attempts` — List all attempts
- `GET /api/dashboard/cbt-candidates?action=proctoring_logs&attemptId=X` — List proctoring logs
- `POST /api/dashboard/cbt-candidates` — Register candidate
- `POST /api/dashboard/cbt-candidates` (action: `bulk_register_class`) — Bulk register
- `POST /api/dashboard/cbt-candidates` (action: `disqualify`) — Disqualify attempt
- `POST /api/dashboard/cbt-candidates` (action: `add_proctor_note`) — Add proctor note
- `DELETE /api/dashboard/cbt-candidates` — Delete candidate or attempt

### File Uploads

#### Upload
- `POST /api/upload` — Upload file (multipart/form-data)
  - Max sizes: Images 10MB, Videos 50MB, Audio 20MB, Documents 5MB
  - Returns: `{ url, publicId, thumbnailUrl, ... }`
  - Uses Cloudinary if configured, falls back to local storage

### Health Check
- `GET /api/health` — System health status (no auth required)

## Webhooks

Configure webhooks in Dashboard → IT Administration → Webhooks.

Events:
- `student.enrolled` — New student enrolled
- `student.withdrawn` — Student withdrawn
- `fee.paid` — Invoice fully paid
- `fee.partial` — Partial payment received
- `attendance.marked` — Attendance recorded
- `exam.result_published` — Exam results released
- `announcement.broadcast` — Announcement sent

Webhook payloads include HMAC-SHA256 signature in `X-Webhook-Signature` header.

## SDK Example

```javascript
// Login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  body: new FormData({ email, password }),
});
// Session cookie is set automatically

// List students
const students = await fetch('/api/dashboard/students').then(r => r.json());

// Create student
const newStudent = await fetch('/api/dashboard/students', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Ahmad',
    lastName: 'Rashid',
    studentId: 'STU001',
    gender: 'male',
  }),
}).then(r => r.json());
```
