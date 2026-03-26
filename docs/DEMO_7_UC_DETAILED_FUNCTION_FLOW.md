# Demo Script Chi Tiet 7 UC - Function by Function

Tai lieu nay dung de demo voi giang vien theo muc do chi tiet tung ham.
Moi UC duoc trinh bay theo chuoi:
Route -> Controller -> Service -> Model/DB -> Response.

---

## UC201 - Register Course Wishlist

### 1) Route entry
- File: backend-api/src/modules/wishlist/wishlist.routes.js
- Cac route chinh:
  - POST /api/wishlist -> ctrl.createWishlist
  - GET /api/wishlist/my-wishlist -> ctrl.getMyWishlist
  - GET /api/wishlist/semester/:semesterId/breakdown -> ctrl.getMySemesterBreakdown
- Middleware:
  - authMiddleware: bat buoc dang nhap
  - STUDENT_ONLY: chi role student duoc truy cap

### 2) Controller functions

#### createWishlist(req, res)
- File: backend-api/src/modules/wishlist/wishlist.controller.js
- Dong lenh quan trong:
  1. const { subjectId, semesterId, reason } = req.body
     - Tach payload tu body.
  2. if (!subjectId || !semesterId) return 400
     - Validate nhanh o controller de tra loi som.
  3. const userId = parseUserId(req)
     - Lay user id tu req.auth qua helper resolveAuthUserId.
  4. await wishlistService.createWishlist(userId, { subjectId, semesterId, reason })
     - Day toan bo nghiep vu xuong service.
  5. return 201 + data
     - Tra ket qua tao wishlist.
  6. catch -> status theo error.statusCode hoac 400
     - Chuan hoa loi nghiep vu.

#### getMyWishlist(req, res)
- Dong lenh quan trong:
  1. parse user id tu token.
  2. goi wishlistService.getMyWishlist(userId).
  3. return 200 voi data.
  4. loi thi tra 500 hoac statusCode tu service.

#### getMySemesterBreakdown(req, res)
- Dong lenh quan trong:
  1. lay userId, semesterId (params), subjectId (query).
  2. goi getSemesterBreakdownForStudent(userId, semesterId, subjectId || null).
  3. return 200 voi du lieu thong ke.

### 3) Service functions

#### createWishlist(userId, payload)
- File: backend-api/src/modules/wishlist/wishlist.service.js
- Dong lenh quan trong:
  1. assertValidObjectId(subjectId), assertValidObjectId(semesterId)
     - Chan du lieu id sai format.
  2. resolveStudentFromUserId(userId)
     - Xac dinh student profile, check active va academicStatus.
  3. Promise.all([Subject.findById, Semester.findById])
     - Query song song de tiet kiem thoi gian.
  4. if !subject hoac !semester -> throw 404
     - Bat loi tham chieu du lieu.
  5. assertSubjectEligibleForWishlist(student._id, subjectId)
     - Khong cho dang ky lai mon da pass.
  6. CourseWishlist.findOne(... status in pending/approved)
     - Chan trung don dang active.
  7. assertMaxSubjectsPerSemester(student, semester, subjectId)
     - Kiem soat gioi han so mon moi ky.
  8. CourseWishlist.create(...)
     - Tao don wishlist moi.
  9. findById(created._id).populate(...)
     - Tra ve du lieu da enrich de UI dung ngay.

#### getMyWishlist(userId)
- Luong:
  1. resolve student tu user.
  2. find wishlist theo student id.
  3. populate subject, semester, enrolledClassSection.
  4. sort createdAt desc de hien thi moi nhat truoc.

#### getSemesterBreakdownForStudent(userId, semesterId, subjectId)
- Luong:
  1. validate id.
  2. resolve student + find semester.
  3. neu semester khong ton tai -> 404.
  4. goi getSemesterSubjectBreakdown(...) de tinh tong hop.
  5. return object gom metadata semester + thong ke.

#### approveWishlist(id, reviewerUserId, payload)
- Luong:
  1. find wishlist + populate semester.
  2. check ton tai va status phai pending.
  3. resolveClassSectionForApprovedWishlist(...)
     - Chon lop phu hop voi subject/semester.
  4. ensureStudentEnrollmentForWishlist(...)
     - Tao hoac cap nhat enrollment.
  5. findByIdAndUpdate set status approved + reviewedBy + reviewedAt + reviewNote.
  6. populate du lieu roi tra ve.

#### rejectWishlist(id, reviewerUserId, payload)
- Luong:
  1. check ton tai + status pending.
  2. update status rejected, reviewedBy, reviewedAt, reviewNote.
  3. set enrolledClassSection = null.

### 4) Diem nhan manh khi demo UC201
- Validate 3 lop: format id, rule nghiep vu, duplicate.
- Role-based access ro rang (student tao, admin/staff duyet).
- Service la noi xu ly chinh, controller gon.

---

## UC202 - View Student Profile Mobile

### 1) Route entry
- File: backend-api/src/routes/student.routes.js
- Route: GET /api/students/me
- Middleware: authMiddleware + rbacMiddleware(['student'])

### 2) Controller function getMyProfile(req, res)
- File: backend-api/src/controllers/student.controller.js
- Dong lenh quan trong:
  1. const userId = req.auth.sub || req.auth.id
     - Ho tro 2 kieu token payload.
  2. await studentService.getStudentByUserId(userId)
     - Lay profile sinh vien.
  3. if !student -> 404
     - Bao dung ngu canh sinh vien khong ton tai.
  4. await gpaService.calculateStudentGPA(student._id)
     - Tinh GPA tu enrollment da completed.
  5. const enrollmentYear = student.enrollmentYear || (student.cohort ? 2000 + student.cohort : null)
     - Co fallback khi thieu enrollmentYear.
  6. return 200 voi data profile + GPA + totalCredits.

### 3) Service functions lien quan

#### getStudentByUserId(userId)
- File: backend-api/src/services/student.service.js
- Luong:
  1. Student.findOne({ userId }).lean().
  2. neu khong co -> return null (controller quyet dinh 404).

#### calculateStudentGPA(studentId)
- File: backend-api/src/services/gpa.service.js
- Dong lenh quan trong:
  1. Query ClassEnrollment voi dieu kien:
     - student = studentId
     - grade ton tai
     - status = completed
  2. populate classSection.subject de lay credits.
  3. neu khong co enrollment hop le -> gpa = 0.
  4. loop tung enrollment:
     - bo qua ban ghi thieu classSection/subject
     - weightedSum += grade * credits
     - totalCredits += credits
  5. gpa = weightedSum / totalCredits
  6. lam tron 2 chu so va tra ve ket qua.

### 4) Diem nhan khi demo UC202
- API profile mobile tra du lieu tong hop, khong chi thong tin user.
- GPA tinh runtime tu ket qua hoc tap thuc.

---

## UC203 - View Status Application Mobile

### 1) Route entry
- File: backend-api/src/routes/request.routes.js
- Cac route user:
  - POST /api/requests
  - GET /api/requests/me
  - GET /api/requests/:id
  - PUT /api/requests/:id
  - POST /api/requests/:id/cancel

### 2) Controller functions
- File: backend-api/src/controllers/request.controller.js

#### createRequest
- userId = req.auth.sub
- payload = req.body
- goi requestService.createRequest
- return 201 + don moi

#### getMyRequests
- lay userId tu token
- goi service lay list cua chinh user
- return 200

#### getRequestById
- lay id tu params
- goi service co kem userId de check owner
- return 200 neu hop le

#### updateRequest
- lay id + payload
- service enforce owner + pending truoc khi update
- return 200

#### cancelRequest
- service enforce owner + pending
- set status = Cancelled
- return 200

#### reviewRequest (admin/staff)
- validate status dau vao
- goi service reviewRequest
- service co gui email thong bao ket qua

### 3) Service functions
- File: backend-api/src/services/request.service.js

#### Helper: findStudentByUserId
- Tim User theo userId.
- Neu chua co Student map theo email thi auto tao Student moi.
- Muc dich: dam bao user dang nhap luon co student profile de thao tac.

#### Helper: ensureOwner
- So sanh requestDoc.student voi student._id.
- Khac owner -> throw 403.

#### Helper: ensurePending
- Neu status khac Pending -> throw 400.

#### createRequest
- Tao Request model moi voi status mac dinh Pending.
- save va return.

#### getMyRequests
- Tim student theo user.
- find request theo student, sort moi nhat truoc.

#### getRequestById
- find request theo id.
- khong co -> 404.
- ensureOwner -> tra du lieu neu dung chu don.

#### updateRequest
- find request.
- ensureOwner + ensurePending.
- neu co attachments moi -> thay the mang attachments.
- update cac field duoc phep.
- save.

#### cancelRequest
- find request.
- ensureOwner + ensurePending.
- doi status = Cancelled, save.

#### reviewRequest
- validate status nam trong Approved/Rejected/Processing.
- find request + populate student.
- cap nhat status + staffNote.
- thu gui email thong bao cho student.

### 4) Diem nhan khi demo UC203
- Bao mat muc object-level: dung owner moi duoc sua/huy.
- Rule trang thai rat ro: da xu ly roi thi khong sua.

---

## UC204 - View Student Exam Schedules

### 1) Route entry
- File: backend-api/src/routes/studentExam.routes.js
- Route: GET /api/student-exams/my-exams
- Middleware: auth + role student

### 2) Controller function getMyExams
- File: backend-api/src/controllers/exam.controller.js
- Dong lenh quan trong:
  1. resolveAuthUserId(req.auth)
     - Lay userId an toan.
  2. if !userId -> 401
  3. resolveStudentFromUserId(userId)
     - Lay student profile active.
  4. reconcileApprovedWishlistEnrollmentsForStudent(student._id)
     - Backfill enrollment cho du lieu cu (co try/catch rieng).
  5. ClassEnrollment.find({ student, status in enrolled/completed }).populate(classSection)
     - Lay cac lop sinh vien dang hoc/da hoc.
  6. Tao set enrolledClassIds va enrolledSubjectIds.
  7. Xay examQuery:
     - Case 1: exam theo classSection da enroll
     - Case 2: exam cap mon hoc (khong gan classSection)
  8. Exam.find(examQuery).populate(subject/classSection/room/slot).sort(...)
  9. StudentExam.find({ exam in examIds, student })
     - Lay du lieu SBD, seat, registrationStatus.
  10. map exams + studentExam -> examsWithSBD
  11. return 200 + data + total.

### 3) Diem nhan khi demo UC204
- API tra lich thi theo du lieu hoc thuc te, khong phai tat ca lich thi he thong.
- Co merge du lieu exam chung voi du lieu ca nhan SBD/seat.

---

## UC205 - View Attendance History

### 1) Route entry
- File: backend-api/src/routes/attendance.routes.js
- Route: GET /api/attendance/my-attendance
- Middleware: auth + role student

### 2) Controller function getMyAttendance
- File: backend-api/src/controllers/attendance.controller.js
- Dong lenh quan trong:
  1. userId = req.auth.sub
  2. lay filter classSectionId, subjectId tu query
  3. goi attendanceService.getMyAttendanceReport(userId, filters)
  4. return 200 + report

### 3) Service function getMyAttendanceReport
- File: backend-api/src/services/attendance.service.js
- Dong lenh quan trong:
  1. resolveStudentByUser(userId)
     - Xac dinh student hien tai.
  2. Validate classSectionId, subjectId neu co
     - id sai format -> 400.
  3. Query enrollments cua student, populate classSection + subject.
  4. Filter tiep theo classSectionId/subjectId neu truyen vao.
  5. Neu khong con enrollment nao -> tra summary rong.
  6. Promise.all query song song:
     - Schedule theo classSection
     - Attendance theo classSection + student
  7. Dung Map group du lieu theo classSection.
  8. Voi moi lop:
     - build rules lich hoc
     - tong hop attendance theo ngay
     - them session Unmarked cho buoi da den han nhung chua diem danh
     - tinh stats: present/late/absent/unmarked
     - tinh absenceRateToDate, absenceRateOverall, attendanceScore
  9. sort item theo subjectCode/classCode.
  10. reduce tong hop summary toan bo cac lop.
  11. return { student, summary, items }.

### 4) Diem nhan khi demo UC205
- Report co 2 tang: summary tong va items chi tiet tung lop.
- Co xu ly Unmarked de phan biet chua diem danh va vang mat.

---

## UC206 - Manage Assigned Classes (Lecturer UI)

UC206 gom 2 luong backend su dung trong giao dien giang vien.

### Luong A: Teaching Schedule

#### Route
- File: backend-api/src/modules/lecturer/teachingSchedule.routes.js
- GET /api/lecturer/teaching-schedule

#### Controller getTeachingSchedule
- File: backend-api/src/modules/lecturer/teachingSchedule.controller.js
- Luong:
  1. userId = req.auth?.sub
  2. goi service.getTeachingSchedule(userId, req.query || {})
  3. return success + data

#### Service getTeachingSchedule
- File: backend-api/src/modules/lecturer/teachingSchedule.service.js
- Dong lenh quan trong:
  1. resolveTeacher({ userId, teacherId, teacherCode })
     - Ho tro nhieu cach xac dinh giang vien.
  2. Neu khong tim thay teacher -> 404.
  3. Parse filter semester, academicYear, includeAllClasses.
  4. Neu co semesterId thi load semester de map ra semesterNum + academicYear.
  5. Neu thieu ky va khong includeAllClasses -> fallback semester hien tai.
  6. Tao classFilter theo teacher + status != cancelled + semester filters.
  7. Query ClassSection + populate subject/room/timeslot.
  8. Query Schedule theo danh sach class id.
  9. Group schedule theo class.
  10. return object teacher + semester + classes[] (moi class kem schedules).

### Luong B: Danh sach sinh vien de nhap diem

#### Route
- File: backend-api/src/routes/grades.routes.js
- GET /api/grades/class/:classSectionId/enrollments

#### Controller getClassEnrollmentsForGrading
- File: backend-api/src/controllers/grades.controller.js
- Luong:
  1. lay classSectionId tu params.
  2. lay userId, role tu token.
  3. neu thieu classSectionId -> 400.
  4. goi gradesService.getClassEnrollmentsForGrading(classSectionId, { userId, role })
  5. return enrollments cho UI nhap diem.

#### Service checkLecturerPermission
- File: backend-api/src/services/grades.service.js
- Luong:
  1. neu role admin/staff -> allowed true.
  2. normalize role teacher -> lecturer.
  3. role khac lecturer -> denied.
  4. resolveTeacherByUserId(userId).
  5. find classSection va so sanh classSection.teacher voi teacher._id.
  6. khong khop -> denied, khop -> allowed.

#### Service getClassEnrollmentsForGrading
- Luong:
  1. goi checkLecturerPermission.
  2. denied -> throw 403.
  3. query ClassEnrollment theo classSection + status enrolled/completed.
  4. populate classSection.subject + student.
  5. select dung cac field diem can nhap.
  6. neu rong -> return message khong co sinh vien.
  7. nguoc lai return enrollments + count + classInfo.

### Diem nhan khi demo UC206
- Permission theo owner lop rat chat.
- Data tra ve dung format cho man nhap diem cua lecturer.

---

## UC207 - Setup Academic Calendar

### 1) Route entry
- File: backend-api/src/modules/academicCalendar/academicCalendar.routes.js
- Cac route:
  - GET /api/academic-calendar
  - POST /api/academic-calendar
  - PATCH /api/academic-calendar/:id
  - DELETE /api/academic-calendar/:id
- Role:
  - GET: user dang nhap
  - POST/PATCH/DELETE: admin, staff, academic-admin

### 2) Controller functions
- File: backend-api/src/modules/academicCalendar/academicCalendar.controller.js

#### listEvents
- includeInactive = req.query.includeInactive === 'true'
- isActive duoc tinh theo role:
  - user thuong: mac dinh chi lay active
  - admin/staff co includeInactive=true thi lay ca inactive
- goi service.listEvents({ year, isActive })
- return 200 + data

#### createEvent
- parse user id tu auth
- goi service.createEvent(userId, body)
- return 201 + event moi

#### updateEvent
- parse user id
- goi service.updateEvent(eventId, userId, body)
- return 200

#### deleteEvent
- goi service.deleteEvent(eventId)
- return 200

### 3) Service functions
- File: backend-api/src/modules/academicCalendar/academicCalendar.service.js

#### createError(message, statusCode)
- Tao Error object va gan statusCode de controller tra dung ma loi.

#### normalizeYear(year)
- Convert year sang number.
- Validate integer trong khoang 2000-2100.
- Sai -> throw.

#### parseDate(value, fieldName)
- Tao Date tu input.
- Date invalid -> throw fieldName specific error.

#### ensureDateRangeWithinYear(year, startDate, endDate)
- startDate/endDate phai thuoc cung nam year.
- endDate phai lon hon hoac bang startDate.

#### normalizeColor(color)
- Neu rong thi fallback #f97316.
- Neu co gia tri thi phai dung regex mau hex 6 ky tu.

#### createEvent(adminUserId, payload)
- Validate name bat buoc.
- parse startDate, endDate, year.
- validate date range.
- create doc voi metadata createdBy/updatedBy.
- return object event.

#### listEvents(params)
- normalize year.
- query theo year, optional isActive.
- sort theo startDate tang dan.

#### updateEvent(eventId, adminUserId, payload)
- find event theo id, khong co -> 404.
- tinh nextYear/nextStartDate/nextEndDate voi co che fallback gia tri cu.
- validate date range moi.
- update tung field neu duoc truyen.
- gan updatedBy, save, return.

#### deleteEvent(eventId)
- findByIdAndDelete.
- khong ton tai -> 404.

### 4) Diem nhan khi demo UC207
- Validation du lieu lich hoc rat chat (year, date range, color).
- Co audit field createdBy/updatedBy.

---

## Tong ket kieu tra loi khi giang vien hoi sau

1) Luong tong quan
- Route xu ly middleware bao mat.
- Controller nhan request va dinh dang response.
- Service gom toan bo business rule va thao tac DB.

2) Luong xu ly loi
- Service throw Error kem statusCode.
- Controller bat loi va tra json thong nhat.

3) Ly do tach Controller/Service
- Controller gon, de test va de doc.
- Rule phuc tap dat tai Service de tai su dung.

4) Cach minh hoa nhanh tren man hinh
- Mo route file de chi endpoint + role.
- Nhay sang controller de chi input/output.
- Nhay tiep service de chi validate + query + update.
