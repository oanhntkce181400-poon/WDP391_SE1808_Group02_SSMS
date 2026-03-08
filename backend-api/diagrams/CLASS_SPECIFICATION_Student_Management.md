# Class Specification - Student Management

## b. Class Specifications

| No | Method | Description |
|----|--------|-------------|
| **StudentService** | | |
| 01 | `getStudents(query): Student[]` | **- Function:** Service retrieves list of students with pagination and filtering.<br>**- Input:** query{ page, limit, filters }<br>**- Output:** { students: Student[], total: number, page: number, totalPages: number } |
| 02 | `searchAndFilter(criteria): Student[]` | **- Function:** Service performs search and filter operations with multiple criteria.<br>**- Input:** criteria{ keyword, majorCode, cohort, status }<br>**- Output:** Filtered array of Student objects<br>**- Notes:** Uses regex for keyword search, applies debounce on client side |
| 03 | `createStudent(data, userId): Student` | **- Function:** Service creates new student record, auto-creates User account and Wallet.<br>**- Input:** data(CreateStudentPayload), userId(createdBy)<br>**- Output:** Created Student object<br>**- Notes:** Validates uniqueness of studentCode and email before creation |
| 04 | `updateStudent(id, data, userId): Student` | **- Function:** Service updates existing student information.<br>**- Input:** id(studentId), data(UpdateStudentPayload), userId(updatedBy)<br>**- Output:** Updated Student object<br>**- Notes:** Validates email uniqueness if changed, sets updatedBy and updatedAt |
| 05 | `deleteStudent(id, userId): void` | **- Function:** Service performs soft delete on student record.<br>**- Input:** id(studentId), userId(deletedBy)<br>**- Output:** void<br>**- Notes:** Checks for active enrollments before deletion, deactivates linked User account |
| **StudentRepository** | | |
| 06 | `findAll(filter): Student[]` | **- Function:** Repository queries database for students with filters and pagination.<br>**- Input:** filter{ conditions, page, limit, sort }<br>**- Output:** Array of Student documents from database |
| 07 | `findById(id): Student` | **- Function:** Repository retrieves single student by ID.<br>**- Input:** id(studentId)<br>**- Output:** Student document or null if not found |
| 08 | `create(data): Student` | **- Function:** Repository inserts new student document into database.<br>**- Input:** data(student object with all required fields)<br>**- Output:** Created Student document with generated _id |
| 09 | `update(id, data): Student` | **- Function:** Repository updates student document in database.<br>**- Input:** id(studentId), data(update fields)<br>**- Output:** Updated Student document |
| 10 | `softDelete(id): void` | **- Function:** Repository sets isActive flag to false instead of deleting record.<br>**- Input:** id(studentId)<br>**- Output:** void<br>**- Notes:** Maintains data integrity, allows for recovery |
| **StudentController** | | |
| 11 | `getStudents(req, res): void` | **- Function:** Controller handles HTTP GET request for student list.<br>**- Input:** req(query parameters), res(response object)<br>**- Output:** HTTP 200 with student data or error response<br>**- Notes:** Extracts query params, delegates to service, formats response |
| 12 | `createStudent(req, res): void` | **- Function:** Controller handles HTTP POST request to create student.<br>**- Input:** req(CreateStudentPayload in body), res(response object)<br>**- Output:** HTTP 201 Created or error response<br>**- Notes:** Validates payload via middleware, extracts userId from auth token |
| 13 | `updateStudent(req, res): void` | **- Function:** Controller handles HTTP PUT request to update student.<br>**- Input:** req(studentId in params, UpdateStudentPayload in body), res<br>**- Output:** HTTP 200 OK with updated data or error response |
| 14 | `deleteStudent(req, res): void` | **- Function:** Controller handles HTTP DELETE request to remove student.<br>**- Input:** req(studentId in params), res(response object)<br>**- Output:** HTTP 200 OK or error response<br>**- Notes:** Checks permissions before deletion |

## Entity Descriptions

### Student
**Purpose:** Core entity representing student information in the school management system.

**Key Fields:**
- `studentCode`: Unique identifier for student (e.g., SE18001)
- `userId`: Reference to User account for authentication
- `majorCode`: Reference to Major entity
- `academicStatus`: Current enrollment status (enrolled, suspended, graduated, dropped)
- `isActive`: Soft delete flag

### User
**Purpose:** Represents system user account with authentication credentials.

**Key Fields:**
- `email`: Unique email for login
- `passwordHash`: Encrypted password
- `role`: User role (student, teacher, admin, staff)
- `status`: Account status (active, inactive, locked)

### CreateStudentPayload
**Purpose:** DTO for creating new student with required validation.

**Required Fields:** studentCode, fullName, email, majorCode, cohort, identityNumber

### UpdateStudentPayload
**Purpose:** DTO for updating student with optional fields.

**Optional Fields:** fullName, email, phone, academicStatus, avatar

### SearchFilterDto
**Purpose:** DTO for search and filter operations with pagination.

**Fields:** keyword(optional), majorCode, cohort, status, page, limit

## Notes
- All Service methods include transaction support for data consistency
- Repository layer uses Mongoose ODM for MongoDB operations
- Controller layer includes authentication and authorization middleware
- Soft delete used to maintain historical data integrity
