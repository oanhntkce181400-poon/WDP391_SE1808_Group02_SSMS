# Use Case Description - Requested 7 Features

Project: WDP391_SE1808_Group02_SSMS  
Document Version: 1.0  
Date Created: 18/Mar/2026  
Created By: GitHub Copilot

---

## UC201 - Register Course Wishlist

| Field | Details |
|-------|---------|
| UC ID and Name | UC201_Register_Course_Wishlist |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Student |
| Secondary Actors | System, Database, Admin/Staff (approval step) |
| Trigger | Student opens Student Wishlist page and submits a subject wishlist for a selected semester. |
| Description | Student selects a subject and semester to create a wishlist record. The system validates eligibility (student status, duplicate, passed subject, max subject cap) and saves request with pending status. |

### Preconditions
1. Student is authenticated and authorized with role `student`.
2. Student profile exists, active, and academic status is `enrolled`.
3. Subject and semester exist in system.

### Postconditions
1. A new wishlist record is created with status `pending`.
2. Student can view the new record in `My Wishlist` list.
3. Semester breakdown is updated (planned/assigned/wishlist counts).

### Normal Flow
1. Student opens route `/student/wishlist`.
2. UI loads semesters, subjects, grade history, and existing wishlist.
3. Student selects semester and subject candidate.
4. System requests semester breakdown (`GET /api/wishlist/semester/:semesterId/breakdown`).
5. Student enters optional reason and clicks submit.
6. System validates payload (`subjectId`, `semesterId`).
7. System resolves current student from token user.
8. System validates subject eligibility:
   - subject not already passed (`completed` with grade >= 5)
   - no active duplicate wishlist (`pending` or `approved`) for same subject and semester
   - max distinct subjects per semester is not exceeded
9. System creates wishlist entry (`POST /api/wishlist`).
10. UI reloads list (`GET /api/wishlist/my-wishlist`) and shows success message.
11. Use case ends.

### Alternative Flows
- 4a - Student only checks semester breakdown:
  - Student changes semester/subject selection repeatedly.
  - System returns projected counts without creating record.
- 10a - Student continues creating more wishlist entries:
  - UI keeps same page context and allows new submission.

### Exceptions
- Exception at Step 7 - Student profile not found:
  - System returns 404 `Student profile not found`.
- Exception at Step 8 - Subject already passed:
  - System returns 400 `Subject has already been passed and is not eligible for wishlist`.
- Exception at Step 8 - Duplicate active wishlist:
  - System returns 409 `You already have an active wishlist for this subject in selected semester`.
- Exception at Step 8 - Subject limit exceeded:
  - System returns 400 and includes breakdown details (max 7 rule).
- Exception at Step 6/8 - Invalid ObjectId:
  - System returns 400 with validation message.

### Priority
High

### Frequency of Use
Medium to High (higher before new semester planning).

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR201-01 | Role Constraint | Only role `student` can call create/my breakdown APIs. |
| BR201-02 | Student Eligibility | Student must be active and academically enrolled. |
| BR201-03 | Passed Subject Blocking | Passed subjects cannot be submitted to wishlist again. |
| BR201-04 | Duplicate Blocking | One active wishlist per subject-semester per student. |
| BR201-05 | Subject Cap | Max 7 distinct subjects in semester (planned + assigned + wishlist). |
| BR201-06 | Status Lifecycle | Student submission starts as `pending`; admin/staff review later. |

### Other Information
- Main API endpoints:
  - `POST /api/wishlist`
  - `GET /api/wishlist/my-wishlist`
  - `GET /api/wishlist/semester/:semesterId/breakdown`
- Main UI page: `frontend-web/src/pages/student/CourseWishlistPage.jsx`.

### Assumptions
1. Semester opening/closing windows are managed elsewhere.
2. Curriculum and enrollment data are already synchronized.

---

## UC202 - View Student Profile (Mobile)

| Field | Details |
|-------|---------|
| UC ID and Name | UC202_View_Student_Profile_Mobile |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Student |
| Secondary Actors | System, Database |
| Trigger | Student opens profile screen from mobile app. |
| Description | Mobile app loads current student profile from `/api/students/me`, normalizes fields (GPA, cohort label, academic year), and displays personal/academic info with pull-to-refresh support. |

### Preconditions
1. Student is logged in on mobile app.
2. Access token is valid.
3. Student role is `student`.

### Postconditions
1. Profile info is shown on mobile screen.
2. Student can refresh profile data.
3. Error state is shown if request fails.

### Normal Flow
1. Student opens `ProfileScreen` in mobile app.
2. Hook `useProfile` calls `studentService.getMyProfile()`.
3. Backend validates authentication and role.
4. Backend returns current student profile (`GET /api/students/me`).
5. Mobile app normalizes returned data:
   - `cohortLabel`
   - GPA formatted to 2 decimals
   - computed academic year from enrollment year
6. Screen renders profile card and detail sections.
7. Student can pull-to-refresh.
8. Hook re-fetches profile and updates view.
9. Use case ends.

### Alternative Flows
- 7a - Student does not refresh:
  - Screen remains with last loaded data.
- 1a - Student logs out from profile screen:
  - App clears auth storage and returns to unauthenticated state.

### Exceptions
- Exception at Step 4 - Student profile not found:
  - API returns error; mobile shows failure state and retry button.
- Exception at Step 4 - Token expired/invalid:
  - API returns 401/403; app cannot load profile.
- Exception at Step 2/4 - Network failure:
  - Mobile shows inline error and allows reload.

### Priority
Medium

### Frequency of Use
High

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR202-01 | Student-only Access | Endpoint `/students/me` requires role `student`. |
| BR202-02 | Data Formatting | GPA must be displayed with 2 decimal places in mobile UI. |
| BR202-03 | Refresh Support | Pull-to-refresh must reload data from server (not local cache only). |
| BR202-04 | Safe Fallbacks | Missing fields display `N/A` to avoid blank/crash states. |

### Other Information
- Mobile files:
  - `mobile-app/src/screens/student/ProfileScreen.js`
  - `mobile-app/src/hooks/useProfile.js`
  - `mobile-app/src/services/studentService.js`
- Backend route: `GET /api/students/me`.

### Assumptions
1. Student account has linked student document.
2. GPA and curriculum semester are precomputed by existing backend services.

---

## UC203 - View Status Application (Mobile)

| Field | Details |
|-------|---------|
| UC ID and Name | UC203_View_Status_Application_Mobile |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Student |
| Secondary Actors | System, Database, Admin/Staff (review source) |
| Trigger | Student opens mobile screen to track submitted requests/applications. |
| Description | Student views own request list, filters by status, and opens detail for each request to see lifecycle and staff feedback. |

### Preconditions
1. Student is authenticated.
2. Request data exists or system can return empty list.
3. API `/api/requests/me` and `/api/requests/:id` are available.

### Postconditions
1. Student sees filtered list of own requests.
2. Student sees detail fields (status, dates, note, staff note, attachments count).
3. No cross-user data is exposed.

### Normal Flow
1. Student opens `ApplicationStatusScreen`.
2. Mobile calls `GET /api/requests/me`.
3. Backend resolves current student from token and returns own requests.
4. Mobile displays list cards with status badges.
5. Student chooses status filter (`all`, `Pending`, `Processing`, `Approved`, `Rejected`, `Cancelled`).
6. Mobile filters list client-side.
7. Student selects one request in list.
8. Mobile calls `GET /api/requests/:id` for latest detail.
9. Backend enforces ownership and returns request detail.
10. Mobile renders detail panel.
11. Use case ends.

### Alternative Flows
- 5a - No filter selected beyond default:
  - System shows all request statuses.
- 8a - Detail API fails but list item exists:
  - Mobile falls back to summary data from selected list row.
- 2a - No requests available:
  - Mobile shows empty-state message.

### Exceptions
- Exception at Step 3/9 - Ownership violation:
  - Backend rejects access to request not owned by current student.
- Exception at Step 2/8 - Network/API error:
  - Mobile shows error text and supports refresh.
- Exception at Step 9 - Request ID invalid/not found:
  - Backend returns 400/404.

### Priority
High

### Frequency of Use
Medium

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR203-01 | Ownership Enforcement | Student can only read own requests (`ensureOwner`). |
| BR203-02 | Status Vocabulary | Status set includes `Pending`, `Processing`, `Approved`, `Rejected`, `Cancelled`. |
| BR203-03 | Detail Integrity | Detail endpoint is source of truth when available. |
| BR203-04 | Read Scope | Mobile feature is read-only for status tracking. |

### Other Information
- Mobile files:
  - `mobile-app/src/screens/student/ApplicationStatusScreen.js`
  - `mobile-app/src/services/requestService.js`
- Backend files:
  - `backend-api/src/routes/request.routes.js`
  - `backend-api/src/services/request.service.js`

### Assumptions
1. Request creation/update/cancel are handled in separate use cases.
2. Staff review workflow is already operating.

---

## UC204 - View Student Exam Schedules

| Field | Details |
|-------|---------|
| UC ID and Name | UC204_View_Student_Exam_Schedules |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Student |
| Secondary Actors | System, Database |
| Trigger | Student opens exam schedule screen on web (or mobile equivalent service). |
| Description | Student retrieves own exam schedule, views exams by date on calendar, and opens exam detail popup for room/time/subject/class information. |

### Preconditions
1. Student is authenticated.
2. Exam data for student can be queried.
3. Endpoint `/api/student-exams/my-exams` is available.

### Postconditions
1. Exam events are displayed by calendar date.
2. Student can inspect exam detail for selected event.
3. Error or empty states are handled safely.

### Normal Flow
1. Student navigates to `/student/exams`.
2. Web page calls `examService.getMyExams()`.
3. Backend authenticates request and returns student exam list.
4. UI groups exams by exam date and sorts by start time.
5. Calendar view highlights days with exam events.
6. Student clicks one exam event.
7. UI opens exam detail modal (subject, date, time, room, class).
8. Student closes modal or switches month.
9. Use case ends.

### Alternative Flows
- 5a - Multiple exams in same day:
  - UI displays first events and shows `+N` additional indicator.
- 1a - Student changes month:
  - UI re-renders calendar cells and monthly count from loaded data.
- 3a - No exams:
  - UI shows empty schedule state.

### Exceptions
- Exception at Step 3 - API call fails:
  - UI shows `Khong the tai lich thi` and retry button.
- Exception at Step 4 - Invalid date data:
  - Invalid entries are ignored from calendar grouping.

### Priority
High

### Frequency of Use
Medium to High (peak around exam periods).

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR204-01 | Student Scope | Only current student's exams are returned by `my-exams` endpoint. |
| BR204-02 | Time Ordering | Exams in same date are sorted by start time ascending. |
| BR204-03 | Calendar Highlight | Any day with >=1 exam must be visually highlighted. |
| BR204-04 | Detail Consistency | Modal detail must use selected event payload without modifying source values. |

### Other Information
- Web files:
  - `frontend-web/src/pages/student/ExamSchedulePage.jsx`
  - `frontend-web/src/services/examService.js`
- Mobile service also consumes same endpoint:
  - `mobile-app/src/services/examService.js`

### Assumptions
1. Exam assignments and room/timeslot data are maintained by exam scheduling modules.
2. Timezone handling follows server and browser local defaults currently used by app.

---

## UC205 - View Attendance History

| Field | Details |
|-------|---------|
| UC ID and Name | UC205_View_Attendance_History |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Student |
| Secondary Actors | System, Database |
| Trigger | Student opens attendance report page/screen. |
| Description | Student views attendance report with 3-level drilldown: Subject list -> Session list -> Session detail. Report includes participation/absence rates, unmarked sessions, and deduction-style attendance score. |

### Preconditions
1. Student is authenticated and role is `student`.
2. Attendance records and class schedules are available.
3. Endpoint `GET /api/attendance/my-attendance` is deployed.

### Postconditions
1. Attendance summary and per-subject statistics are displayed.
2. Student can drill down to session-level detail.
3. To-date stats remain consistent with detail list.

### Normal Flow
1. Student opens attendance report:
   - web route `/student/attendance-report`
   - mobile report screen from student menu.
2. Client calls `GET /api/attendance/my-attendance`.
3. Backend resolves current student and collects enrolled class sections.
4. Backend builds to-date session set based on schedule rules and current date.
5. Backend merges attendance marks with schedule sessions:
   - marked sessions keep real status (`Present`, `Late`, `Absent`)
   - missing marks become `Unmarked`
6. Backend computes stats per subject/class and summary totals.
7. Client renders subject cards with ring score and participation counts.
8. Student selects one subject card.
9. Client shows session list for that subject.
10. Student selects one session.
11. Client shows session detail state and metadata.
12. Use case ends.

### Alternative Flows
- 1a - Student filters by term/semester:
  - Client recalculates visible summary from filtered items.
- 8a - Student only views subject-level cards:
  - Drilldown is optional.
- 2a - No attendance data:
  - Client shows empty-state message.

### Exceptions
- Exception at Step 3 - Student not found:
  - Backend returns 404 `Student profile not found`.
- Exception at Step 2/3 - Auth failure:
  - Backend returns 401/403.
- Exception at Step 2 - API/network error:
  - Client shows load error with refresh option.

### Priority
High

### Frequency of Use
High

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR205-01 | Role Restriction | `my-attendance` endpoint is student-only. |
| BR205-02 | To-date Consistency | `sessionsElapsed` denominator and detail rows use same elapsed-session set. |
| BR205-03 | Unmarked Synthesis | Missing attendance records are represented as `Unmarked`. |
| BR205-04 | Future Session Exclusion | Future sessions are excluded from to-date detail and to-date rates. |
| BR205-05 | Attendance Score | Score is deduction-based: `attendanceScore = 100 - absenceRateToDate`. |
| BR205-06 | Late Counting | `Late` is included in attended sessions for participation metrics. |

### Other Information
- Backend files:
  - `backend-api/src/routes/attendance.routes.js`
  - `backend-api/src/controllers/attendance.controller.js`
  - `backend-api/src/services/attendance.service.js`
- Web file: `frontend-web/src/pages/student/AttendanceReportPage.jsx`
- Mobile file: `mobile-app/src/screens/student/AttendanceReportScreen.js`

### Assumptions
1. Schedule source data is authoritative for expected sessions.
2. Lecturer attendance marking process is executed in separate use cases.

---

## UC206 - Manage Assigned Classes (Lecturer UI)

| Field | Details |
|-------|---------|
| UC ID and Name | UC206_Manage_Assigned_Classes_Lecturer_UI |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Lecturer |
| Secondary Actors | System, Database, Admin/Staff (cross-role visibility) |
| Trigger | Lecturer opens lecturer home and accesses assigned class list. |
| Description | Lecturer views classes assigned to them, monitors class capacity stats, opens class student list, and navigates to grade entry for each class. |

### Preconditions
1. User is authenticated with lecturer account (`lecturer` or `teacher` role).
2. Lecturer profile can be resolved from account.
3. Teaching schedule and enrollment data are available.

### Postconditions
1. Assigned class list is displayed for lecturer.
2. Lecturer can open student list page per class.
3. Lecturer can navigate to grade entry page per class.

### Normal Flow
1. Lecturer opens `/lecturer` home page.
2. Frontend calls `GET /api/lecturer/teaching-schedule?includeAllClasses=true`.
3. Backend resolves lecturer profile from user and fetches assigned class sections.
4. Frontend displays overview stats:
   - total assigned classes
   - total students
   - average fill rate
5. Frontend shows class table with actions per row.
6. Lecturer clicks `Xem sinh vien`.
7. Frontend navigates to `/lecturer/classes/:classSectionId`.
8. Class detail page requests:
   - enrollments (`GET /api/grades/class/:classSectionId/enrollments`)
   - assigned classes for permission confirmation.
9. Frontend verifies selected class is in assigned classes list.
10. Frontend renders enrolled student list and search.
11. Lecturer may click `Nhap diem` from class list to open `/lecturer/grades/:classSectionId`.
12. Use case ends.

### Alternative Flows
- 5a - Lecturer refreshes list:
  - System reloads assigned classes and recalculates stats.
- 10a - Search in class students page:
  - Lecturer filters by student code, name, email.
- 3a - Admin/staff chooses specific lecturer filter in teaching schedule page:
  - Same API can return selected lecturer classes.

### Exceptions
- Exception at Step 3 - Lecturer profile not found:
  - Backend returns 404 and UI shows hint to select lecturer (for non-linked account).
- Exception at Step 8/9 - Unauthorized class access:
  - UI shows `Ban khong co quyen xem lop nay hoac lop khong ton tai`.
- Exception at Step 8 - Enrollment API denied:
  - Backend returns permission error based on class ownership/role checks.

### Priority
High

### Frequency of Use
High (daily during teaching and grading periods).

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR206-01 | Role Access | Lecturer portal routes require lecturer/teacher role; APIs also support admin/staff contexts where configured. |
| BR206-02 | Teacher Resolution | Lecturer is resolved by teacherId/teacherCode/userId/email fallback chain. |
| BR206-03 | Class Scope | Only non-cancelled assigned class sections are listed. |
| BR206-04 | Permission Check | Class student details must be validated against assigned classes before render. |
| BR206-05 | Action Navigation | From assigned class row, lecturer can open student list and grade entry for same class. |

### Other Information
- Frontend files:
  - `frontend-web/src/pages/lecturer/LecturerHomePage.jsx`
  - `frontend-web/src/pages/lecturer/LecturerClassStudentsPage.jsx`
  - `frontend-web/src/services/scheduleService.js`
  - `frontend-web/src/services/gradesService.js`
- Backend files:
  - `backend-api/src/modules/lecturer/teachingSchedule.routes.js`
  - `backend-api/src/modules/lecturer/teachingSchedule.service.js`
  - `backend-api/src/services/grades.service.js`

### Assumptions
1. Grade-entry logic itself is documented by a separate use case.
2. `includeAllClasses=true` is intentionally used in lecturer home for full assigned list.

---

## UC207 - Setup Academic Calendar

| Field | Details |
|-------|---------|
| UC ID and Name | UC207_Setup_Academic_Calendar |
| Created By | GitHub Copilot |
| Date Created | 18/Mar/2026 |
| Primary Actor | Admin/Staff/Academic-Admin |
| Secondary Actors | System, Database, Student/Lecturer viewers |
| Trigger | Authorized user opens Academic Calendar Management page to create/update/delete holiday events by year. |
| Description | Admin-like roles maintain annual academic calendar events (name, type, date range, color, active flag). Active events are published for student/lecturer viewing. |

### Preconditions
1. User is authenticated.
2. User role is one of `admin`, `staff`, `academic-admin` for write operations.
3. Academic calendar module is available.

### Postconditions
1. Calendar event is created/updated/deleted as requested.
2. Active events are visible in public calendar listing for selected year.
3. Audit fields `createdBy/updatedBy` are maintained.

### Normal Flow
1. Admin/Staff opens route `/admin/academic-calendar`.
2. Page loads events by selected year (`GET /api/academic-calendar?year=YYYY&includeInactive=true`).
3. User fills form fields:
   - name, type, startDate, endDate, optional description
   - color
   - active/inactive flag
4. User clicks save.
5. Backend validates:
   - year in range 2000..2100
   - valid dates
   - start/end dates belong to selected year
   - endDate >= startDate
   - color is hex `#RRGGBB`
6. Backend creates or updates event (`POST` or `PATCH`).
7. UI reloads event table and shows success toast.
8. User may delete event (`DELETE /api/academic-calendar/:id`) with confirmation.
9. UI refreshes list.
10. Use case ends.

### Alternative Flows
- 2a - User changes year selector:
  - System reloads events for selected year.
- 6a - User edits existing row:
  - Form enters edit mode and updates same event id.
- 8a - User cancels delete confirm dialog:
  - No deletion performed.

### Exceptions
- Exception at Step 1/6/8 - Unauthorized role:
  - Backend denies write APIs for non-admin/staff roles.
- Exception at Step 5 - Validation failure:
  - Backend returns 400 with specific message (invalid year/date/color/range).
- Exception at Step 8 - Event not found:
  - Backend returns 404 `Academic calendar event not found`.

### Priority
Medium to High

### Frequency of Use
Medium (usually at term planning points, then periodic updates).

### Business Rules
| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR207-01 | Read Visibility | `GET /academic-calendar` returns only active events for normal viewers by default. |
| BR207-02 | IncludeInactive Rule | Inactive events are returned only when `includeInactive=true` and caller is admin/staff/academic-admin. |
| BR207-03 | Date-Year Integrity | Event start/end dates must both belong to selected `year`. |
| BR207-04 | Date Order | `endDate` must be greater than or equal to `startDate`. |
| BR207-05 | Color Format | Color must be strict hex format `#RRGGBB`. |
| BR207-06 | Role-Based Write Access | Create/update/delete requires `admin`, `staff`, or `academic-admin`. |

### Other Information
- Web management page: `frontend-web/src/pages/admin/AcademicCalendarManagementPage.jsx`
- Service calls: `frontend-web/src/services/academicCalendarService.js`
- Backend module:
  - `backend-api/src/modules/academicCalendar/academicCalendar.routes.js`
  - `backend-api/src/modules/academicCalendar/academicCalendar.controller.js`
  - `backend-api/src/modules/academicCalendar/academicCalendar.service.js`

### Assumptions
1. Student and lecturer viewer pages consume same calendar source.
2. Overlapping event policy is currently allowed unless future rule adds overlap checks.

---

End of document.
