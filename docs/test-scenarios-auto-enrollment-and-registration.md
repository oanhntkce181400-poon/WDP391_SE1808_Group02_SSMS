# Test Scenarios: Auto Enrollment, Registration Guardrails, Lecturer Timetable

This document describes end-to-end test scenarios for the features recently implemented in backend and frontend.

## Data prerequisites

- Auto-enrollment now supports `dryRun = true` on `POST /api/auto-enrollment/trigger`.
- Before running a live enrollment, verify:
  - active students have `majorCode`
  - active students have `enrollmentYear`
  - at least one active `Curriculum` exists for each target major
  - open class sections exist in the selected semester
- If these prerequisites are missing, the Auto Enrollment page will show them in the `Preflight` block instead of silently failing with generic errors.

## 1. Manual auto enrollment from Admin

### Goal
Verify that an admin can trigger auto enrollment for a selected semester and receive execution logs.

### Preconditions
- A semester exists in `Semester`.
- At least 2 active students exist in `Student` with `isActive = true`.
- Each student has a valid curriculum returned by curriculum lookup.
- At least one `ClassSection` exists for each subject in the students' current curriculum semester.
- Some class sections still have free capacity.

### Steps
1. Log in as `admin` or `staff`.
2. Open Admin page `Auto Enrollment`.
3. Select a semester.
4. Click `Run auto enrollment`.

### Expected result
- API `POST /api/auto-enrollment/trigger` returns `200`.
- Summary shows:
  - total students processed
  - total enrollments created
  - waitlisted count
  - duplicate count
  - failed count
- Preflight shows:
  - active curriculum count
  - open class count
  - missing `enrollmentYear` count
  - students without curriculum by major/reason
- Execution log is visible per student.
- New rows are created in `ClassEnrollment`.
- `ClassSection.currentEnrollment` increases accordingly.

### Dry-run variant
1. Enable `Dry run only` on the Admin page.
2. Click `Run dry check`.

Expected result:
- No enrollment or waitlist documents are created.
- Summary and preflight still show what would happen in a live run.

### Negative checks
- If all matching classes are full, student is added to `Waitlist`.
- If student is already enrolled in the subject for that semester, it is logged as skipped/duplicate.

## 2. Automatic enrollment when semester becomes current

### Goal
Verify that auto enrollment is triggered automatically when a semester is set as current.

### Preconditions
- At least one non-current semester exists.
- Auto-enrollment data setup is ready as in Scenario 1.

### Steps
1. Log in as `admin` or `staff`.
2. Open Admin `Semester Management`.
3. Edit a semester that is currently not marked as current.
4. Check `isCurrent`.
5. Confirm the popup asking to run auto enrollment.
6. Save.

### Expected result
- Semester update succeeds.
- The selected semester becomes the only record with `isCurrent = true`.
- Auto-enrollment summary is returned in the update response.
- Frontend shows the latest auto-enrollment summary block.

### Negative checks
- If the user cancels the popup, the save action is aborted.

## 3. Overload limit control

### Goal
Verify that a student cannot register more than 2 overload courses in one semester.

### Preconditions
- One student exists with a valid curriculum.
- Current semester exists.
- Student already has:
  - 2 enrollments marked as overload, or
  - 2 enrolled subjects outside the current curriculum semester.
- Another overload class is available.

### Steps
1. Log in as the student.
2. Open `Course Registration`.
3. Locate a class that is outside the student curriculum semester.
4. Click `Check`.
5. Click `Register`.

### Expected result
- Validation response marks overload as not allowed.
- UI shows a warning about overload limit.
- Register button stays disabled after validation.
- Direct API registration attempt is rejected.

### Positive variant
- If the student has only 1 overload course, a second overload course is still allowed.

## 4. Prerequisite validation

### Goal
Verify prerequisite blocking for a class whose subject requires previous passed subjects.

### Preconditions
- Subject A has prerequisite Subject B.
- Student has not completed Subject B with grade >= 5.
- A published class section exists for Subject A.

### Steps
1. Log in as the student.
2. Open `Course Registration`.
3. Click `Check` for Subject A class.

### Expected result
- Validation response includes `prerequisites.eligible = false`.
- UI shows prerequisite warning and block reason.
- Registration API rejects the action.

### Positive variant
- If the student has a completed enrollment for Subject B with grade >= 5, registration proceeds.

## 5. Cohort eligibility

### Goal
Verify that only allowed cohorts can register during the active registration period.

### Preconditions
- A `RegistrationPeriod` exists with `status = active`.
- `allowedCohorts` contains only specific cohorts, for example `[18, 19]`.
- Test student belongs to a cohort outside that list, for example `20`.

### Steps
1. Log in as the student.
2. Open `Course Registration`.
3. Trigger class validation.

### Expected result
- Eligibility summary reports `cohortAccess.allowed = false`.
- UI shows cohort warning.
- Registration is blocked even if other validations pass.

### Positive variant
- A student in an allowed cohort can continue if other checks pass.

## 6. Credit limit check

### Goal
Verify that total registered credits cannot exceed the configured limit.

### Preconditions
- Student already has enrolled credits close to the limit.
- Another class is available with enough credits to push total above the limit.

### Steps
1. Log in as the student.
2. Open `Course Registration`.
3. Review the credit counter.
4. Click `Check` for the extra class.

### Expected result
- Validation response includes `credit.allowed = false`.
- UI shows current credits and max credits.
- Progress bar reflects current load.
- Registration is blocked when projected credits exceed max.

## 7. Lecturer teaching timetable

### Goal
Verify that a lecturer or staff-linked teacher account can view assigned teaching classes.

### Preconditions
- A `Teacher` exists and is linked to a `User` through `userId`.
- At least one `ClassSection` is assigned to that teacher.
- Optional schedules exist in `Schedule`.

### Steps
1. Log in using the linked lecturer/staff account.
2. Open `Teaching Schedule`.

### Expected result
- API `GET /api/lecturer/teaching-schedule` returns `200`.
- Page lists assigned class sections.
- Subject, semester, academic year, enrollment count, and schedule count are visible.

## 8. Backend smoke checklist

### API checks
- `POST /api/auto-enrollment/trigger` returns expected summary payload.
- `POST /api/auto-enrollment/trigger` with `{ dryRun: true }` does not write enrollment data.
- `GET /api/registrations/eligibility-summary` returns student, semester, overload, credit, and cohort access.
- `POST /api/registrations/validate-all` returns prerequisite, capacity, wallet, overload, credit, and cohort validation.
- `POST /api/classes/:classId/self-enroll` succeeds only when all validations pass.
- `GET /api/lecturer/teaching-schedule` resolves the linked teacher correctly.

### Database checks
- `ClassEnrollment.isOverload` is persisted for overload enrollments.
- `Waitlist` receives records only when no available class exists or class is full.
- `Semester.isCurrent` is unique in practice after updates.

## 9. Frontend smoke checklist

### Admin pages
- `Auto Enrollment` page loads semester dropdown and displays logs after execution.
- `Semester Management` shows confirmation before setting `isCurrent = true`.

### Student page
- `Course Registration` loads class list.
- Credit counter and progress bar render.
- Cohort warning renders when blocked.
- `Check` updates validation state correctly.
- `Register` succeeds only for valid classes and refreshes summary after success.

### Lecturer page
- `Teaching Schedule` renders data without crashing when schedule list is empty.
