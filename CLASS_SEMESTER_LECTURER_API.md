# Class, Semester & Lecturer Management — API Usage Guide

> **Stack**: Node.js / Express / Mongoose  
> **Auth**: Bearer JWT (access token) in `Authorization` header or `accessToken` cookie  
> **Base URL**: `/api`

---

## Table of Contents

1. [Authentication & Roles](#authentication--roles)
2. [Semester API](#semester-api)
3. [Class Section API](#class-section-api)
4. [Class Enrollment API](#class-enrollment-api)
5. [Lecturer API](#lecturer-api)
6. [Frontend Services](#frontend-services)
7. [Frontend Pages](#frontend-pages)
8. [Module Structure](#module-structure)

---

## Authentication & Roles

All endpoints require a valid JWT access token.

```
Authorization: Bearer <accessToken>
```

Write operations (POST / PUT / PATCH / DELETE) additionally require the `admin` or `staff` role.

| Role    | Read | Write |
| ------- | ---- | ----- |
| admin   | ✅   | ✅    |
| staff   | ✅   | ✅    |
| student | ✅   | ❌    |

---

## Semester API

Base path: `/api/semesters`

### GET /api/semesters

List all semesters with optional filters.

**Query Parameters**

| Param        | Type   | Description                   |
| ------------ | ------ | ----------------------------- |
| academicYear | string | Filter by academic year       |
| semesterNum  | number | Filter by semester number 1–3 |
| isCurrent    | bool   | `true` / `false`              |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "HK1-2024-2025",
      "name": "Học kỳ 1 - 2024/2025",
      "semesterNum": 1,
      "academicYear": "2024-2025",
      "startDate": "2024-09-01T00:00:00.000Z",
      "endDate": "2025-01-15T00:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

### GET /api/semesters/:id

Get a single semester by ID.

**Response**

```json
{ "success": true, "data": { ... } }
```

---

### POST /api/semesters _(admin/staff only)_

Create a new semester.

**Request Body (JSON)**

```json
{
  "code": "HK1-2024-2025",
  "name": "Học kỳ 1 - 2024/2025",
  "semesterNum": 1,
  "academicYear": "2024-2025",
  "startDate": "2024-09-01",
  "endDate": "2025-01-15",
  "isCurrent": true
}
```

> If `isCurrent: true`, all other semesters will have `isCurrent` set to `false` automatically.

**Required fields**: `code`, `name`, `semesterNum`, `academicYear`, `startDate`, `endDate`

---

### PUT /api/semesters/:id _(admin/staff only)_

Update a semester. Same body as POST, all fields optional.

---

### DELETE /api/semesters/:id _(admin/staff only)_

Delete a semester.

**Response**

```json
{ "success": true, "message": "Semester deleted successfully" }
```

---

## Class Section API

Base path: `/api/classes`

### GET /api/classes

List class sections with pagination and search.

**Query Parameters**

| Param        | Type   | Description                                     |
| ------------ | ------ | ----------------------------------------------- |
| search       | string | Search by classCode, className, or subject name |
| status       | string | `active` / `cancelled` / `completed`            |
| semester     | number | Filter by semester number                       |
| academicYear | string | Filter by academic year                         |
| teacher      | string | Teacher ObjectId                                |
| page         | number | Page number (default: 1)                        |
| limit        | number | Items per page (default: 20, max: 100)          |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "classCode": "CS101-01",
      "className": "Lập trình căn bản - Nhóm 01",
      "subject": { "_id": "...", "subjectCode": "CS101", "subjectName": "..." },
      "teacher": {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "teacherCode": "GV001"
      },
      "room": { "_id": "...", "roomCode": "A101" },
      "timeslot": { "_id": "...", "slotName": "Ca 1" },
      "semester": 1,
      "academicYear": "2024-2025",
      "maxCapacity": 40,
      "currentEnrollment": 12,
      "status": "active",
      "dayOfWeek": "Monday"
    }
  ],
  "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### GET /api/classes/:classId

Get a single class section by ID (fully populated).

---

### POST /api/classes _(admin/staff only)_

Create a new class section.

**Request Body (JSON)**

```json
{
  "classCode": "CS101-01",
  "className": "Lập trình căn bản - Nhóm 01",
  "subject": "<subjectId>",
  "teacher": "<teacherId>",
  "room": "<roomId>",
  "timeslot": "<timeslotId>",
  "semester": 1,
  "academicYear": "2024-2025",
  "maxCapacity": 40,
  "dayOfWeek": "Monday",
  "status": "active"
}
```

**Required fields**: `classCode`, `className`, `subject`, `semester`, `academicYear`

---

### PATCH /api/classes/:classId _(admin/staff only)_

Update a class section. All fields optional.

> **Note**: Cannot delete a class that has active enrollments.

---

### DELETE /api/classes/:classId _(admin/staff only)_

Delete a class section.

> Returns `400` if the class has active enrolled students. Remove enrollments first.

---

## Class Enrollment API

These endpoints are nested under `/api/classes`.

### POST /api/classes/enrollment/create _(admin/staff only)_

Enroll a student in a class.

**Request Body (JSON)**

```json
{
  "classId": "<classSectionId>",
  "studentId": "<studentId>"
}
```

**Business Rules**:

- Class must not be full (`currentEnrollment < maxCapacity`)
- Student must exist
- Student cannot be enrolled in the same class twice

---

### POST /api/classes/enrollment/:enrollmentId/drop

Drop (withdraw) a student from a class. Sets status to `dropped` and decrements `currentEnrollment`.

**Response**

```json
{ "success": true, "message": "Course dropped successfully", "data": { ... } }
```

---

### GET /api/classes/student/:studentId/enrollments

Get all enrollments for a student.

**Query Parameters**

| Param  | Type   | Description                       |
| ------ | ------ | --------------------------------- |
| status | string | `enrolled` / `dropped` (optional) |

---

### GET /api/classes/:classId/enrollments

Get all enrollments for a class.

**Query Parameters**

| Param  | Type   | Description                       |
| ------ | ------ | --------------------------------- |
| status | string | `enrolled` / `dropped` (optional) |

---

## Lecturer API

Base path: `/api/lecturers`

### GET /api/lecturers

List lecturers with pagination and filters.

**Query Parameters**

| Param  | Type   | Description                                   |
| ------ | ------ | --------------------------------------------- |
| name   | string | Search by fullName, email, or teacherCode     |
| dept   | string | Filter by department (partial match)          |
| status | string | `active` / `inactive`                         |
| degree | string | `bachelors` / `masters` / `phd` / `professor` |
| gender | string | `male` / `female` / `other`                   |
| page   | number | Page number (default: 1)                      |
| limit  | number | Items per page (default: 12, max: 100)        |

**Response**

```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 25, "page": 1, "limit": 12, "totalPages": 3 }
}
```

---

### GET /api/lecturers/:id

Get a single lecturer by ID.

---

### POST /api/lecturers _(admin/staff only)_

Create a new lecturer. This endpoint uses `multipart/form-data` because it supports avatar upload.

**Form Data Fields**

| Field          | Type   | Required | Description                                   |
| -------------- | ------ | -------- | --------------------------------------------- |
| teacherCode    | string | ✅       | Unique lecturer code (e.g. `GV001`)           |
| fullName       | string | ✅       | Full name                                     |
| email          | string | ✅       | Work email (also used for login)              |
| department     | string | ✅       | Department name                               |
| phone          | string | ❌       | Phone number                                  |
| specialization | string | ❌       | Area of expertise                             |
| degree         | string | ❌       | `bachelors` / `masters` / `phd` / `professor` |
| gender         | string | ❌       | `male` / `female` / `other`                   |
| avatar         | file   | ❌       | Profile photo (uploaded to Cloudinary)        |

**Business Logic**:

- Creates a **User** account + **Teacher** profile in a single MongoDB transaction
- Default login password: `Teacher@123` (user must change on first login)
- If avatar is provided, it is uploaded to Cloudinary and the URL is stored in both User and Teacher records

**Response**

```json
{
  "success": true,
  "message": "Default password: Teacher@123 (must change on first login)",
  "data": {
    "_id": "...",
    "teacherCode": "GV001",
    "fullName": "Nguyễn Văn A",
    "email": "nva@school.edu.vn",
    "department": "Công nghệ thông tin",
    "degree": "masters",
    "isActive": true,
    "userId": { "email": "nva@school.edu.vn", "status": "active" },
    ...
  }
}
```

---

### PUT /api/lecturers/:id _(admin/staff only)_

Update lecturer profile. Supports avatar upload (same `multipart/form-data` format as POST).

**Updatable Fields**: `fullName`, `department`, `phone`, `specialization`, `degree`, `gender`, `isActive`, `avatar`

> Setting `isActive: false` also deactivates the linked User account.

---

### DELETE /api/lecturers/:id _(admin/staff only)_

Soft-delete (deactivate) a lecturer. Sets `isActive: false` on both Teacher and linked User.

**Response**

```json
{ "success": true, "message": "Lecturer deactivated successfully" }
```

---

## Frontend Services

Located in `frontend-web/src/services/`.

### semesterService.js

```js
import * as semesterService from "@/services/semesterService";

// List semesters
const { data } = await semesterService.getAll({ academicYear: "2024-2025" });

// Get one semester
const { data } = await semesterService.getById(id);

// Create
const { data } = await semesterService.create({
  code,
  name,
  semesterNum,
  academicYear,
  startDate,
  endDate,
  isCurrent,
});

// Update
const { data } = await semesterService.update(id, updatedFields);

// Delete
await semesterService.remove(id);
```

### lecturerService.js

```js
import * as lecturerService from "@/services/lecturerService";

// List lecturers
const { data, pagination } = await lecturerService.getAll({
  name: "Nguyen",
  status: "active",
});

// Create (automatically wraps in FormData if avatar included)
const { data } = await lecturerService.create({
  teacherCode,
  fullName,
  email,
  department,
  avatar: fileObject,
});

// Update
const { data } = await lecturerService.update(id, {
  fullName: "New Name",
  avatar: fileObject,
});

// Toggle active status
await lecturerService.toggleStatus(id, false); // deactivate

// Delete
await lecturerService.remove(id);
```

### classService.js (existing)

See `frontend-web/src/services/classService.js` for class section and enrollment API calls.

---

## Frontend Pages

### /admin/classes — Class Management

**Component**: `frontend-web/src/pages/admin/ClassManagement.jsx`

Features:

- Table view of all class sections with populated subject / teacher / room
- Search bar (classCode / className / subject name)
- Status filter dropdown (`active` / `cancelled` / `completed`)
- Pagination
- Create / Edit modal with dropdown selectors for Subject, Semester, Teacher, Room, Timeslot
- Delete button with enrollment guard (blocked if active enrollments exist, shows enrolled count)

**Visit**: Navigate to `Lớp học` in the admin sidebar or go directly to `/admin/classes`

---

### /admin/lecturers — Lecturer Management

**Component**: `frontend-web/src/pages/admin/LecturerManagement.jsx`

Features:

- Card grid layout with avatar display
- Active / Inactive toggle per card
- Sidebar filter panel: name search, department, degree, gender, status
- Create / Edit modal with avatar upload and live preview
- Soft-delete (deactivate) button

**Visit**: Navigate to `Giảng viên` in the admin sidebar or go directly to `/admin/lecturers`

---

## Module Structure

All three features follow the 4-layer module pattern (same as `auth` and `actors`):

```
backend-api/src/modules/
├── semester/
│   ├── semester.repository.js    ← Pure DB queries (Mongoose, no business logic)
│   ├── semester.service.js       ← Business logic, validation, format functions
│   ├── semester.controller.js    ← HTTP handlers, calls service, maps errors to status codes
│   └── semester.routes.js        ← Express Router with authMiddleware + rbacMiddleware
│
├── classSection/
│   ├── classSection.repository.js
│   ├── classSection.service.js
│   ├── classSection.controller.js
│   └── classSection.routes.js
│
└── lecturer/
    ├── lecturer.repository.js
    ├── lecturer.service.js       ← Includes MongoDB transaction for User+Teacher create
    ├── lecturer.controller.js
    └── lecturer.routes.js        ← Includes avatarUpload.single('avatar') middleware
```

### Layer Responsibilities

| Layer      | File              | Responsibility                                               |
| ---------- | ----------------- | ------------------------------------------------------------ |
| Repository | `*.repository.js` | Direct Mongoose calls only. No `req`/`res`. Returns raw docs |
| Service    | `*.service.js`    | Validates input, orchestrates repo calls, formats output     |
| Controller | `*.controller.js` | Extracts from `req`, calls service, sends `res`              |
| Routes     | `*.routes.js`     | Registers paths + middleware chain, imports controller       |

**Error propagation**: Service throws plain `Error` objects. Controller's `handleError()` maps message keywords to HTTP status codes:

- `"not found"` → `404`
- `"required"` / `"already exists"` / `"Cannot delete"` → `400`
- Everything else → `500`
