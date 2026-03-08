# Class Specification - Registration Period Management

## b. Class Specifications

| No | Method | Description |
|----|--------|-------------|
| **RegistrationPeriodService** | | |
| 01 | `getAllPeriods(): RegistrationPeriod[]` | **- Function:** Service retrieves all registration periods with auto-updated status.<br>**- Input:** None<br>**- Output:** Array of RegistrationPeriod objects with current status<br>**- Notes:** Automatically updates status based on current date vs startDate/endDate |
| 02 | `getPeriodById(id): RegistrationPeriod` | **- Function:** Service retrieves single registration period by ID.<br>**- Input:** id(periodId)<br>**- Output:** RegistrationPeriod object or throws NotFoundError |
| 03 | `createPeriod(data, userId): RegistrationPeriod` | **- Function:** Service creates new registration period with overlap validation.<br>**- Input:** data(CreatePeriodPayload), userId(createdBy)<br>**- Output:** Created RegistrationPeriod object<br>**- Notes:** Validates date range, checks for overlapping periods with same cohorts |
| 04 | `configurePeriod(id, updates, userId): RegistrationPeriod` | **- Function:** Service updates registration period configuration.<br>**- Input:** id(periodId), updates(UpdatePeriodPayload), userId(updatedBy)<br>**- Output:** Updated RegistrationPeriod object<br>**- Notes:** Validates status transitions, prevents modification of cancelled periods |
| 05 | `checkPeriodOverlap(dates, cohorts, excludeId?): boolean` | **- Function:** Service validates if period dates overlap with existing periods for same cohorts.<br>**- Input:** dates{ startDate, endDate }, cohorts(number[]), excludeId(optional for updates)<br>**- Output:** Boolean indicating overlap detected<br>**- Notes:** Critical for preventing conflicting registration periods |
| 06 | `autoUpdateStatus(period): string` | **- Function:** Service automatically determines period status based on dates.<br>**- Input:** period(RegistrationPeriod object)<br>**- Output:** Calculated status string (upcoming/active/closed)<br>**- Notes:** Logic: if now < startDate → upcoming; if startDate ≤ now ≤ endDate → active; if now > endDate → closed |
| 07 | `validateStatusTransition(currentStatus, nextStatus): void` | **- Function:** Service ensures only valid status transitions are allowed.<br>**- Input:** currentStatus(current), nextStatus(desired new status)<br>**- Output:** void or throws ValidationError<br>**- Notes:** Valid transitions: upcoming→active/cancelled, active→closed/cancelled, closed→(no change) |
| **RegistrationPeriodRepository** | | |
| 08 | `findAll(): RegistrationPeriod[]` | **- Function:** Repository queries all registration periods from database.<br>**- Input:** None<br>**- Output:** Array of RegistrationPeriod documents sorted by startDate DESC |
| 09 | `findById(id): RegistrationPeriod` | **- Function:** Repository retrieves single period by ID.<br>**- Input:** id(periodId)<br>**- Output:** RegistrationPeriod document or null |
| 10 | `create(data): RegistrationPeriod` | **- Function:** Repository inserts new registration period document.<br>**- Input:** data(period object with required fields)<br>**- Output:** Created RegistrationPeriod document with generated _id |
| 11 | `update(id, data): RegistrationPeriod` | **- Function:** Repository updates registration period document.<br>**- Input:** id(periodId), data(update fields)<br>**- Output:** Updated RegistrationPeriod document |
| 12 | `findOverlapping(dates, cohorts, excludeId?): RegistrationPeriod[]` | **- Function:** Repository queries periods that overlap with given date range and cohorts.<br>**- Input:** dates{ startDate, endDate }, cohorts(array), excludeId(optional)<br>**- Output:** Array of overlapping RegistrationPeriod documents<br>**- Notes:** Complex MongoDB query with date range and array intersection |
| **RegistrationPeriodController** | | |
| 13 | `getRegistrationPeriods(req, res): void` | **- Function:** Controller handles HTTP GET request for period list.<br>**- Input:** req(query params), res(response object)<br>**- Output:** HTTP 200 with periods array or error response<br>**- Notes:** Delegates to service, formats response with auto-updated statuses |
| 14 | `createRegistrationPeriod(req, res): void` | **- Function:** Controller handles HTTP POST request to create period.<br>**- Input:** req(CreatePeriodPayload in body), res(response object)<br>**- Output:** HTTP 201 Created or error response (400 Conflict if overlap)<br>**- Notes:** Admin-only operation, validates date range before creation |
| 15 | `updatePeriod(req, res): void` | **- Function:** Controller handles HTTP PUT request to update period configuration.<br>**- Input:** req(periodId in params, UpdatePeriodPayload in body), res<br>**- Output:** HTTP 200 OK with updated data or error response<br>**- Notes:** Cannot modify cancelled periods, validates new overlap if dates changed |
| 16 | `updateStatus(req, res): void` | **- Function:** Controller handles HTTP PATCH request to manually update status.<br>**- Input:** req(periodId in params, StatusDto{ status } in body), res<br>**- Output:** HTTP 200 OK or 400 Bad Request if invalid transition<br>**- Notes:** Validates status transition rules before applying |

## Entity Descriptions

### RegistrationPeriod
**Purpose:** Core entity representing a time period when students can register for classes.

**Key Fields:**
- `periodCode`: Unique identifier (auto-generated)
- `periodName`: Display name (e.g., "Đăng ký Kỳ 1 2025-2026")
- `startDate`: Registration start date/time
- `endDate`: Registration end date/time
- `allowedCohorts`: Array of cohort numbers eligible for registration
- `status`: Current status with workflow (upcoming → active → closed, or cancelled)
- `maxCoursesPerStudent`: Maximum course enrollment limit

**Status Workflow:**
- **upcoming**: Period created but not started yet (now < startDate)
- **active**: Currently accepting registrations (startDate ≤ now ≤ endDate)
- **closed**: Period ended (now > endDate)
- **cancelled**: Manually cancelled by admin (can be set from any status)

### User
**Purpose:** Represents admin/staff user who creates and manages registration periods.

**Key Fields:**
- `role`: Must be admin or academic_staff to manage periods
- `email`: Used for audit trail and notifications

### CreatePeriodPayload
**Purpose:** DTO for creating new registration period with validation.

**Required Fields:** periodName, startDate, endDate, allowedCohorts, description

**Validation Rules:**
- endDate must be after startDate
- allowedCohorts must be non-empty array
- No overlap with existing periods for same cohorts

### UpdatePeriodPayload
**Purpose:** DTO for updating period configuration with optional fields.

**Optional Fields:** periodName, description, endDate, allowedCohorts, status

**Business Rules:**
- Cannot modify cancelled periods
- Cannot change startDate after period created
- If dates changed, must re-validate overlap

### StatusDto
**Purpose:** DTO for manual status updates.

**Field:** status(string) - must be one of: upcoming, active, closed, cancelled

**Validation:** Must follow valid transition rules

### PeriodNote
**Purpose:** Audit trail for period modifications and admin notes.

**Key Fields:**
- `periodId`: Reference to RegistrationPeriod
- `note`: Text description of change or comment
- `createdBy`: Admin who made the note
- `createdAt`: Timestamp for history tracking

## Business Rules

1. **Overlap Prevention**: Two periods cannot have overlapping dates if they share any cohorts in allowedCohorts
2. **Status Auto-Update**: Status is automatically calculated based on current date whenever period is retrieved
3. **Status Transition**: Only specific transitions are allowed:
   - upcoming → active (auto when startDate reached)
   - upcoming → cancelled (manual)
   - active → closed (auto when endDate reached)
   - active → cancelled (manual)
   - closed → (no further changes except cancelled)
4. **Immutable Fields**: periodCode, createdBy, createdAt cannot be changed after creation
5. **Date Validation**: endDate must always be after startDate
6. **Admin Only**: Only users with admin or academic_staff role can create/modify periods

## Notes
- All date/time fields use ISO 8601 format with timezone
- Repository uses Mongoose with MongoDB for data persistence
- Service layer includes comprehensive validation before database operations
- Controller layer enforces role-based access control (RBAC)
- Status transitions are logged in PeriodNote for audit trail
