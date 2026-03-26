# Class Diagram Documentation

## UC201 - Register Course Wishlist

### WishlistRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | POST /api/wishlist | Create new wishlist entry |
| 02 | GET /api/wishlist/my-wishlist | Get student's wishlist |
| 03 | GET /api/wishlist/semester/:semesterId/breakdown | Get wishlist breakdown by semester |

### CreateWishlistDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | subjectId | string | Subject ID (required) |
| 02 | semesterId | string | Semester ID (required) |
| 03 | reason | string | Reason for wishlist request |

### WishlistController
| No | Method | Description |
|----|--------|-------------|
| 01 | createWishlist(req) | Process wishlist creation request |
| 02 | getMyWishlist(req) | Retrieve student's wishlist |
| 03 | getMySemesterBreakdown(req) | Get wishlist breakdown by semester |

### WishlistService
| No | Method | Description |
|----|--------|-------------|
| 01 | createWishlist(userId, payload) | Create and persist wishlist entry |
| 02 | getMyWishlist(userId) | Retrieve all wishlist entries for student |
| 03 | getSemesterBreakdownForStudent(userId, semesterId, subjectId) | Get wishlist breakdown statistics |
| 04 | assertMaxSubjectsPerSemester(...) | Validate max subjects per semester limit |

---

## UC202 - View Student Profile Mobile

### StudentRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/students/me | Retrieve authenticated student's profile |

### GetMyProfileDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | userId | string | User ID from auth token |
| 02 | role | string | User role (student) |

### StudentController
| No | Method | Description |
|----|--------|-------------|
| 01 | getMyProfile(req) | Process profile retrieval request |

### StudentService
| No | Method | Description |
|----|--------|-------------|
| 01 | getStudentByUserId(userId) | Retrieve student data by user ID |

---

## UC203 - View Status Application Mobile

### RequestRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/requests/:id | Get specific request by ID |
| 02 | GET /api/requests/me | Get authenticated user's requests |
| 03 | POST /api/requests | Create new request |
| 04 | PATCH /api/requests/:id | Update request status |

### RequestIdParamDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | id | string | Request ID (required) |

### GetMyRequestsQueryDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | status | string | Filter by status (optional) |
| 02 | page | number | Pagination page (optional) |
| 03 | limit | number | Results per page (optional) |

### RequestController
| No | Method | Description |
|----|--------|-------------|
| 01 | getRequestById(req) | Fetch specific request details |
| 02 | getMyRequests(req) | Retrieve user's all requests |
| 03 | createRequest(req) | Create new request |
| 04 | updateRequestStatus(req) | Update request status |

### RequestService
| No | Method | Description |
|----|--------|-------------|
| 01 | getRequestById(requestId) | Database query for request by ID |
| 02 | getMyRequests(userId, filters) | Get paginated user requests |
| 03 | createRequest(userId, payload) | Create and persist request |
| 04 | updateRequestStatus(requestId, status) | Update request status in database |

---

## UC204 - View Student Exam Schedules

### StudentExamRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/student-exams | Get all exam schedules |
| 02 | GET /api/student-exams/my-exams | Get student's exams |
| 03 | GET /api/student-exams/:id | Get specific exam detail |

### GetMyExamsQueryDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | semesterId | string | Filter by semester (optional) |
| 02 | status | string | Filter by exam status (optional) |
| 03 | fromDate | date | Filter from date (optional) |

### ExamController
| No | Method | Description |
|----|--------|-------------|
| 01 | getMyExams(req) | Retrieve authenticated student's exams |
| 02 | getExamDetail(req) | Get specific exam details |

### ExamService
| No | Method | Description |
|----|--------|-------------|
| 01 | getMyExams(studentId, filters) | Query student exam schedule |
| 02 | getExamDetail(examId) | Fetch individual exam details |

---

## UC205 - View Attendance History

### AttendanceRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/my-attendance | Get attendance records |
| 02 | GET /api/my-attendance/:classId | Get class attendance details |

### GetMyAttendanceQueryDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | semesterId | string | Filter by semester (optional) |
| 02 | fromDate | date | From date filter (optional) |
| 03 | toDate | date | To date filter (optional) |

### AttendanceController
| No | Method | Description |
|----|--------|-------------|
| 01 | getMyAttendance(req) | Retrieve student's attendance records |

### AttendanceService
| No | Method | Description |
|----|--------|-------------|
| 01 | getMyAttendance(studentId, filters) | Query attendance from database |

---

## UC206 - Manage Assigned Classes (Lecturer UI)

### TeachingScheduleRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/teaching-schedule | Get teaching schedule |
| 02 | GET /api/teaching-schedule/:classId | Get class schedule details |

### TeachingScheduleQueryDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | teacherId | string | Lecturer ID (optional) |
| 02 | teacherCode | string | Lecturer code (optional) |
| 03 | semester | string | Filter by semester (optional) |

### TeachingScheduleController
| No | Method | Description |
|----|--------|-------------|
| 01 | getTeachingSchedule(req) | Retrieve lecturer's teaching schedule |
| 02 | getClassDetails(req) | Get specific class details |

### GradesRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/class/:classSectionId/enrollments | Get class enrollments with grades |

### ClassEnrollmentsParamDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | classSectionId | string | Class section ID (required) |

### GradesController
| No | Method | Description |
|----|--------|-------------|
| 01 | getClassEnrollments(req) | Retrieve class enrollments for grades |

### GradesService
| No | Method | Description |
|----|--------|-------------|
| 01 | getClassEnrollments(classSectionId) | Query enrollments with grades |
| 02 | updateGrade(enrollmentId, grade) | Update student grade |

---

## UC207 - Setup Academic Calendar

### AcademicCalendarRouter
| No | Method | Description |
|----|--------|-------------|
| 01 | GET /api/academic-calendar | Get all calendar events |
| 02 | POST /api/academic-calendar | Create new calendar event |
| 03 | PUT /api/academic-calendar/:id | Update calendar event |
| 04 | DELETE /api/academic-calendar/:id | Delete calendar event |

### CreateAcademicCalendarDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | name | string | Event name (required) |
| 02 | year | number | Academic year (required) |
| 03 | startDate | date | Start date (required) |
| 04 | endDate | date | End date (required) |
| 05 | holidayType | string | Holiday/Event type (required) |

### UpdateAcademicCalendarDto
| No | Field | Type | Description |
|----|-------|------|-------------|
| 01 | id | string | Calendar event ID (required) |
| 02 | name | string | Event name (optional) |
| 03 | startDate | date | Start date (optional) |
| 04 | endDate | date | End date (optional) |

### AcademicCalendarController
| No | Method | Description |
|----|--------|-------------|
| 01 | getAllCalendarEvents(req) | Retrieve all academic calendar events |
| 02 | createCalendarEvent(req) | Create new calendar event |
| 03 | updateCalendarEvent(req) | Update existing calendar event |
| 04 | deleteCalendarEvent(req) | Delete calendar event |

### AcademicCalendarService
| No | Method | Description |
|----|--------|-------------|
| 01 | getAllCalendarEvents() | Query all calendar events from database |
| 02 | createCalendarEvent(payload) | Create and persist new event |
| 03 | updateCalendarEvent(eventId, updates) | Update event in database |
| 04 | deleteCalendarEvent(eventId) | Delete event from database |
