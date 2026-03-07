# TỔNG HỢP CÁC TÍNH NĂNG CẦN PHÁT TRIỂN (CẬP NHẬT)

---

## PHÂN TÍCH PROJECT HIỆN TẠI

### ✅ ĐÃ CÓ TRONG PROJECT (32 Modules):
User/Auth, Student, Teacher, Curriculum, Subject, ClassSection, ClassEnrollment, Schedule, Attendance, Exam, TuitionFee, Finance, Request, Feedback, Announcement, RegistrationPeriod, Socket.IO, ErrorLog...

### ❌ THIẾU HOẶC CHƯA HOÀN CHỈNH:
- GPA Calculation ❌
- Transcript ❌ 
- Audit Log ❌
- Notification System ❌
- Auto-Enrollment ❌
- Wishlist ❌
- Auto-Tuition ❌
- Grade Management ❌
- Learning Path Validation ❌

---

## BẢNG TÍNH NĂNG ĐẦY ĐỦ (84 TÍNH NĂNG)

### PHẦN 1: CORE ENROLLMENT & CURRICULUM (15 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 1 | `calculateStudentCurriculumSemester` | Tính toán sinh viên đang ở học kỳ mấy trong khung chương trình (K18 → HK1→HK9) dựa trên năm nhập học và kỳ hiện tại | **BE:** Tạo `curriculum.service.js` với hàm `getStudentCurrentCurriculumSemester(student)` - Logic: `(currentYear - enrollmentYear) × 2 + currentSemesterNum` - Output: CurriculumSemester ID và danh sách môn <br><br> **FE:** Cập nhật API gọi hàm khi load thông tin SV |
| 2 | `autoEnrollStudentsToClassSections` | Tự động xếp tất cả sinh viên vào các lớp học phần tương ứng với môn học trong CurriculumSemester của kỳ hiện tại | **BE:** Tạo `autoEnrollment.service.js` với hàm `triggerAutoEnrollment(semesterId)` - Lấy danh sách SV active → Tính CurriculumSemester → Tìm ClassSection → Tạo ClassEnrollment - Xử lý trùng lặp và full lớp (waitlist) - API: `POST /api/auto-enrollment/trigger` <br><br> **FE:** Tạo trang Admin Dashboard - Nút "Chạy tự động xếp lớp" - Hiển thị log kết quả |
| 3 | `scheduleAutoEnrollment` | Tự động kích hoạt auto-enrollment khi Semester mới được set là isCurrent = true | **BE:** Thêm middleware hooks trong `semester.service.js` - Khi update `isCurrent = true` → trigger auto-enrollment <br><br> **FE:** Admin set Semester isCurrent = true → Popup xác nhận auto-enrollment |
| 4 | `autoGenerateTuitionForSemester` | Tự động tính học phí cho từng sinh viên dựa trên số môn học trong CurriculumSemester tương ứng | **BE:** Tạo `tuitionAuto.service.js` với hàm `calculateTuitionByCurriculum(studentId, semesterId)` và `generateAllTuitionForSemester(semesterId)` - Tạo Model `TuitionBill`: baseAmount, overloadAmount, repeatAmount, discountAmount, totalAmount, status, dueDate <br><br> **FE:** Trang xem học phí SV - Hiển thị chi tiết: mặc định + học vượt + học lại |
| 5 | `validateOverloadRegistration` | Kiểm tra sinh viên không được đăng ký quá 2 môn học vượt trong một kỳ | **BE:** Cập nhật `registration.service.js` với hàm `checkOverloadLimit(studentId, semesterId)` - Đếm số môn học vượt đã đăng ký - Nếu ≥ 2 → reject - Thêm field `isOverload: Boolean` trong ClassEnrollment <br><br> **FE:** Hiển thị cảnh báo nếu đã đăng 2 môn vượt - Disable nút đăng ký khi đạt giới hạn |
| 6 | `createWishlistForRepeatCourse` | Cho phép sinh viên đăng ký môn học lại vào wishlist trước kỳ mới bắt đầu, chờ admin xếp lớp | **BE:** Tạo Model `CourseWishlist`: student, subject, semester, reason, priority, status, enrolledClassSection - Tạo `wishlist.service.js` CRUD - API: `POST /api/wishlist`, `GET /api/wishlist/my-wishlist`, `GET /api/wishlist/semester/:semesterId`, `PATCH /api/wishlist/:id/approve`, `PATCH /api/wishlist/:id/reject` <br><br> **FE:** Trang "Đăng ký học lại" - Chọn môn rớt từ lịch sử - Submit → Vào wishlist - Trang Admin duyệt wishlist |
| 7 | `createRequestTypeRegistrationPeriod` | Admin tạo các đợt đăng ký riêng cho từng loại đơn (học lại, học vượt, chuyển lớp...) với thời gian cụ thể | **BE:** Cập nhật `registrationPeriod.model.js` - Thêm field `requestType` (enum: 'repeat', 'overload', 'change_class', 'drop', 'all') - Thêm field `semester` - Hàm `isRegistrationOpen(requestType, studentCohort)` - Kiểm tra: startDate <= now <= endDate và studentCohort trong allowedCohorts <br><br> **FE:** Trang Admin - Form tạo mới có field "Loại đơn" - Trang SV: Check thời gian trước khi hiển thị form |
| 8 | `emitRegistrationPeriodUpdate` | Thông báo real-time cho tất cả clients khi Admin tạo/cập nhật đợt đăng ký | **BE:** Sử dụng `io.broadcastToAll('registration-period-updated', data)` - Sau khi tạo/cập nhật RegistrationPeriod → gọi emit - API `GET /api/registration-periods/current` → Server kiểm tra <br><br> **FE:** Lắng nghe socket event - Hiển thị notification - Check thời gian trước khi hiển thị form |
| 9 | `checkTuitionPaymentStatus` | Kiểm tra sinh viên đã đóng đủ học phí kỳ trước chưa trước khi cho phép đăng ký mới | **BE:** Cập nhật `registration.service.js` với hàm `checkPendingTuition(studentId, semesterId)` - Tìm TuitionBill của SV trong các kỳ trước - Nếu status = 'pending' → reject - Gọi trong mọi API đăng ký môn học <br><br> **FE:** Khi đăng ký → Check → Nếu chưa đóng tiền → Redirect sang trang thanh toán |
| 10 | `validateCoursePrerequisites` | Kiểm tra sinh viên đã học và đạt môn tiên quyết chưa trước khi đăng ký môn học | **BE:** Đã có trong `registration.service.js` - Hàm `validatePrerequisites(studentId, subjectCode)` - Kiểm tra: enrollment có grade >= 5 hoặc có trong danh sách passed <br><br> **FE:** Hiển thị cảnh báo khi đăng ký môn có tiên quyết chưa đạt |
| 11 | `validateCohortAccess` | Kiểm tra quyền đăng ký theo K - Xác định sinh viên K nào được phép đăng ký môn nào dựa trên năm nhập học và cohort | **BE:** Cập nhật `registrationPeriod.model.js` - Đảm bảo field `allowedCohorts` hoạt động đúng - Tạo hàm `checkCohortAccess(studentCohort, periodAllowedCohorts)` <br><br> **FE:** Hiển thị thông tin K (cohort) của SV - Disable các môn không thuộc K của SV |
| 12 | `checkCourseConflict` | Kiểm tra xung đột lịch học - Cảnh báo khi chọn 2 lớp cùng thời gian | **BE:** Tạo hàm `checkScheduleConflict(studentId, classSectionId)` - Lấy danh sách lớp SV đã đăng ký trong kỳ - So sánh: dayOfWeek + startTime + endTime - Nếu trùng → reject <br><br> **FE:** Khi click chọn lớp → Kiểm tra ngay - Hiển thị popup cảnh báo đỏ |
| 13 | `calculateCreditOverload` | Tính toán vượt tín chỉ - Giới hạn tối đa tín chỉ đăng ký (thường 20-24 tín chỉ) | **BE:** Cập nhật service với hàm `checkCreditLimit(studentId, semesterId, newCredits)` - Lấy tổng tín chỉ đã đăng ký - Nếu > maxCredits → reject <br><br> **FE:** Hiển thị bộ đếm tín chỉ: "18/20 tín chỉ" - Progress bar |
| 14 | `generateClassSchedule` | Tạo thời khoá biểu tự động - Xếp lịch học dựa trên lớp học và số lượng sinh viên | **BE:** Tạo service `scheduleGenerator.service.js` - Input: subject, expectedEnrollment, availableRooms, availableTimeSlots - Output: ClassSection với schedule đầy đủ <br><br> **FE:** Trang Admin xếp lịch - Drag & drop để điều chỉnh |
| 15 | `validateLearningPath` | Kiểm tra trình tự học - Đảm bảo sinh viên học theo chương trình đúng thứ tự | **BE:** Cập nhật `curriculum.service.js` với hàm `validateLearningPath(studentId, subjectId)` - Kiểm tra các prerequisite subjects - Nếu chưa → reject với message <br><br> **FE:** Hiển thị sơ đồ prerequisite - Tooltip khi hover |

---

### PHẦN 2: GRADE & GPA MANAGEMENT (12 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 16 | `calculateGPA` | Tính GPA/điểm trung bình tích lũy - Sử dụng để kiểm tra điều kiện tiên quyết và cảnh báo kỳ này | **BE:** Tạo service `gpa.service.js` với hàm `calculateStudentGPA(studentId)` - Lấy tất cả ClassEnrollment có grade - Tính GPA = (Σ grade × credits) / Σ credits <br><br> **FE:** Hiển thị GPA trên header - Cảnh báo nếu GPA < 5.0 |
| 17 | `calculateSemesterGPA` | Tính GPA theo từng học kỳ - Xem điểm trung bình của một kỳ cụ thể | **BE:** Tạo hàm `calculateSemesterGPA(studentId, semesterId)` - Lọc enrollment theo semester - Tính GPA của kỳ đó <br><br> **FE:** Dropdown chọn kỳ - Hiển thị GPA kỳ |
| 18 | `calculateCumulativeGPA` | Tính GPA tích lũy toàn khóa - Tổng hợp tất cả các kỳ từ đầu khóa | **BE:** Tạo hàm `calculateCumulativeGPA(studentId)` - Lấy tất cả enrollment từ đầu - Tính GPA tích lũy <br><br> **FE:** Hiển thị "GPA tích lũy: 7.5" trên profile |
| 19 | `submitGrades` | Nhập điểm cho sinh viên - Giảng viên nhập điểm sau khi kết thúc môn học | **BE:** Tạo API `POST /api/grades/submit` - Input: studentId, classSectionId, grade - Validate: giảng viên có quyền nhập điểm cho lớp đó không <br><br> **FE:** Trang "Nhập điểm" - Bảng điểm SV - Các cột: Điểm GK, CK, khác - Button Lưu |
| 20 | `updateGrades` | Cập nhật/chỉnh sửa điểm - Cho phép giảng viên sửa điểm (có log) | **BE:** API `PATCH /api/grades/:enrollmentId` - Kiểm tra quyền - Lưu log thay đổi điểm - Chỉ sửa được trước khi finalized <br><br> **FE:** Button edit bên cạnh điểm - Modal sửa điểm - Log thay đổi |
| 21 | `finalizeGrades` | Công bố điểm chính thức - Khóa điểm không cho sửa sau khi công bố | **BE:** API `POST /api/grades/finalize` - Cập nhật field `isFinalized = trueửi notification` - G cho SV biết điểm <br><br> **FE:** Button "Công bố điểm" - Xác nhận - Gửi email thông báo |
| 22 | `calculateFinalGrade` | Tính điểm tổng kết môn học - Tổng hợp từ các thành phần điểm (GK 30%, CK 50%, BT 20%) | **BE:** Tạo hàm `calculateFinalGrade(enrollmentId)` - Lấy các thành phần điểm - Tính theo tỉ trọng đã cấu hình - Lưu vào grade field <br><br> **FE:** Hiển thị chi tiết điểm: GK, CK, BT, Quá trình |
| 23 | `viewAllGrades` | Xem tất cả điểm - Sinh viên xem điểm tất cả các môn đã học | **BE:** API `GET /api/grades/my-grades` - Lấy tất cả enrollment có grade - Group by semester <br><br> **FE:** Trang "Xem điểm" - Bảng: Môn, Điểm, Kỳ - Filter theo kỳ |
| 24 | `exportGrades` | Export điểm ra file - Xuất điểm theo lớp/khoa/toàn trường | **BE:** API `GET /api/grades/export?format=excel\|pdf` - Filter: semester, classSection, major <br><br> **FE:** Button Export - Chọn format - Download file |
| 25 | `gradeAppeal` | Khiếu nại điểm - Sinh viên khiếu nại điểm nếu thấy sai | **BE:** Tạo Model `GradeAppeal` - API: POST khiếu nại, GET danh sách, PATCH xử lý - Khi approve → cập nhật grade <br><br> **FE:** Button "Khiếu nại điểm" - Form nhập lý do - Theo dõi trạng thái |
| 26 | `gradeDistributionReport` | Báo cáo phân bố điểm - Thống kê điểm theo phân loại (A, B, C, D, F) | **BE:** API `GET /api/reports/grade-distribution` - Thống kê theo classSection/semester/major <br><br> **FE:** Biểu đồ phân bố điểm - Table chi tiết |
| 27 | `honorRollCalculation` | Danh sách sinh viên xuất sắc - Tính toán SV đủ điều kiện danh dự (GPA >= 8.0) | **BE:** Tạo hàm `getHonorRollStudents(semesterId)` - Lọc GPA >= 8.0 - Không có điểm F <br><br> **FE:** Trang "Danh sách xuất sắc" - Export danh sách |

---

### PHẦN 3: NOTIFICATIONS & COMMUNICATION (10 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 28 | `createNotificationSystem` | Hệ thống thông báo toàn diện - Thông báo đẩy cho sinh viên, giảng viên, admin | **BE:** Tạo Model `Notification`: recipientId, type, title, content, isRead, actionUrl, priority - Service: createNotification, getNotifications, markAsRead <br><br> **FE:** Bell icon với badge - Page thông báo - Filter theo loại |
| 29 | `sendEmailNotifications` | Gửi email thông báo tự động - Email khi đăng ký thành công, đơn được duyệt, nhắc học phí | **BE:** Mở rộng `mailer.js`: gửi email theo template - Templates: đăng ký thành công, đơn được duyệt, nhắc thanh toán, thông báo điểm <br><br> **FE:** Settings cho phép bật/tắt email notifications |
| 30 | `notifyPaymentReminder` | Nhắc nhở thanh toán học phí - Gửi thông báo trước khi kỳ học bắt đầu | **BE:** Tạo hàm `sendPaymentReminder(semesterId)` - Tìm SV chưa thanh toán - Gửi notification + email <br><br> **FE:** Banner đỏ nếu chưa đóng tiền - Nút "Thanh toán ngay" |
| 31 | `notifyRegistrationOpen` | Thông báo đợt đăng ký mở - Gửi notification khi registration period bắt đầu | **BE:** Socket.IO emit khi tạo RegistrationPeriod mới - Gửi cho tất cả sinh viên <br><br> **FE:** Banner thông báo - Push notification |
| 32 | `notifyGradePublished` | Thông báo điểm công bố - Gửi notification khi giảng viên công bố điểm | **BE:** Gọi trong hàm finalizeGrades - Gửi cho tất cả SV trong lớp <br><br> **FE:** Notification "Điểm môn XXX đã công bố" |
| 33 | `notifyRequestStatus` | Thông báo trạng thái đơn - Gửi notification khi đơn được duyệt/từ chối | **BE:** Gọi trong hàm approve/reject request - Gửi cho student <br><br> **FE:** Notification "Đơn của bạn đã được duyệt" |
| 34 | `inAppMessaging` | Tin nhắn trong app - Chat nội bộ giữa SV và giảng viên | **BE:** Tạo Model `Message`: senderId, receiverId, content, conversationId - API CRUD <br><br> **FE:** Chat box - Danh sách cuộc trò chuyện - Gửi nhận tin nhắn |
| 35 | `announcementBroadcast` | Gửi thông báo broadcast - Gửi cho nhiều người cùng lúc | **BE:** API `POST /api/announcements/broadcast` - Chọn đối tượng: all, by major, by cohort <br><br> **FE:** Form gửi thông báo - Chọn target audience |
| 36 | `pushNotificationMobile` | Thông báo đẩy cho mobile - Gửi notification tới mobile app | **BE:** Tích hợp FCM (Firebase Cloud Messaging) - Lưu device token <br><br> **FE:** Mobile: đăng ký token - Nhận notification |
| 37 | `emailTemplateManagement` | Quản lý template email - Admin tạo/cập nhật các mẫu email | **BE:** Model `EmailTemplate` - API CRUD - Variables: {{name}}, {{course}}, etc. <br><br> **FE:** Trang quản lý template - Preview - Test send |

---

### PHẦN 4: STUDENT PORTAL FEATURES (15 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 38 | `generateTranscript` | Tạo bảng điểm - Export kết quả học tập sinh viên | **BE:** API `GET /api/transcript/:studentId` - Tổng hợp tất cả ClassEnrollment có grade - Tính GPA từng kỳ và tích lũy - Export PDF/Excel <br><br> **FE:** Trang "Bảng điểm" - Button "Tải bảng điểm PDF" |
| 39 | `displayStudentInfo` | Hiển thị thông tin sinh viên - Tên, MSSV, K, GPA, năm học | **BE:** API `GET /api/students/me` trả full info <br><br> **FE:** Header: Avatar, Tên, MSSV, K (K18, K19...) |
| 40 | `showRegistrationHistory` | Hiển thị lịch sử ĐKHP - Các kỳ học trước sinh viên đã đăng ký gì | **BE:** API `GET /api/enrollment/history` - Lấy tất cả enrollment theo studentId, group by semester <br><br> **FE:** Tab "Lịch sử đăng ký" - Dropdown chọn kỳ |
| 41 | `displayAvailableCourses` | Hiển thị danh sách môn khả dụng - Chỉ hiển thị môn mà sinh viên được phép đăng ký | **BE:** API `GET /api/courses/available` - Lọc theo: student.cohort, student.major, curriculumSemester <br><br> **FE:** Tab danh sách môn - Filter theo loại |
| 42 | `visualizeSchedule` | Trực quan hóa thời khoá biểu - Hiển thị dạng lịch grid theo giờ học | **BE:** API trả dữ liệu schedule theo format <br><br> **FE:** Component lịch grid (Thứ 2-7, tiết 1-10) - Màu sắc khác nhau cho từng môn |
| 43 | `manageStudentExams` | Quản lý lịch thi - Xem lịch thi, phòng thi, thông tin thi | **BE:** API `GET /api/student-exams/my-exams` - Lấy thông tin thi từ StudentExam model <br><br> **FE:** Trang "Lịch thi" - Ngày, Giờ, Phòng, Seat |
| 44 | `viewAttendanceRecords` | Xem thông tin điểm danh - Xem lịch sử điểm danh các buổi học | **BE:** API `GET /api/attendance/my-attendance` - Lấy attendance theo student + classSection <br><br> **FE:** Trang "Điểm danh" - Tỷ lệ tham gia |
| 45 | `submitFeedbackForLecturer` | Đánh giá giảng viên - Sinh viên đánh giá sau khi kết thúc môn học | **BE:** API `POST /api/feedback/submit` - Check thời gian mở feedback <br><br> **FE:** Form feedback với rating + comment |
| 46 | `manageWallet` | Quản lý ví điện tử - Nạp tiền, kiểm tra số dư, lịch sử giao dịch | **BE:** Service `wallet.service.js` - API: nạp tiền, trừ tiền, xem số dư <br><br> **FE:** Trang "Ví của tôi" - Hiển thị số dư |
| 47 | `approveLeaveRequest` | Xin nghỉ học - Sinh viên xin nghỉ có phép | **BE:** Type: 'leave' trong Request model - API: tạo đơn, admin duyệt <br><br> **FE:** Form "Xin nghỉ học" - Chọn buổi nghỉ, lý do |
| 48 | `viewClassmates` | Xem danh sách lớp - Xem danh sách sinh viên cùng lớp học phần | **BE:** API `GET /api/class-sections/:id/students` - Lấy danh sách enrollment <br><br> **FE:** Tab "Danh sách sinh viên" |
| 49 | `displayRegistrationCountdown` | Hiển thị bộ đếm thời gian - Countdown cho đến khi kỳ ĐKHP bắt đầu | **BE:** API trả startDate, endDate của RegistrationPeriod <br><br> **FE:** Banner countdown: "Đăng ký học phần bắt đầu sau: 2 ngày" |
| 50 | `showPaymentStatus` | Hiển thị trạng thái thanh toán - Thông báo đã/chưa thanh toán học phí | **BE:** API `GET /api/tuition/status` <br><br> **FE:** Badge: Xanh "Đã thanh toán" / Đỏ "Chưa thanh toán" |
| 51 | `graduationCheck` | Kiểm tra tốt nghiệp - Sinh viên xem tiến độ tốt nghiệp | **BE:** API `GET /api/students/graduation-status` - Kiểm tra: đã pass hết môn CT chưa, GPA đủ chưa <br><br> **FE:** Progress bar - Các môn còn thiếu |
| 52 | `displayApprovedRequest` | Hiển thị danh sách đơn được duyệt - Môn học lại, cải thiện được admin phê duyệt | **BE:** API `GET /api/requests/my-requests` trả danh sách request với status <br><br> **FE:** Tab "Đơn của tôi" - Trạng thái |

---

### PHẦN 5: LECTURER FEATURES (8 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 53 | `viewTeachingSchedule` | Xem lịch giảng dạy - Giảng viên xem lịch dạy của mình | **BE:** API `GET /api/lecturer/teaching-schedule` - Lấy classSection theo lecturer + semester <br><br> **FE:** Trang "Lịch giảng dạy" - Các lớp phụ trách |
| 54 | `markAttendance` | Điểm danh sinh viên - Giảng viên điểm danh sinh viên trong lớp | **BE:** API `POST /api/attendance/mark` - Giảng viên điểm danh theo buổi học <br><br> **FE:** Trang điểm danh - Checkbox có mặt/vắng |
| 55 | `gradeStudents` | Nhập điểm sinh viên - Giảng viên nhập điểm cho sinh viên | **BE:** API `POST /api/grades/submit` - Giảng viên nhập điểm theo thành phần <br><br> **FE:** Bảng điểm SV - Các cột điểm - Button Lưu |
| 56 | `manageClassSection` | Quản lý lớp học phần - Giảng viên quản lý lớp mình phụ trách | **BE:** API `GET /api/class-sections/lecturer/:lecturerId` - Lấy danh sách lớp <br><br> **FE:** Tab: Danh sách SV, Điểm danh, Nhập điểm |
| 57 | `uploadCourseMaterials` | Tải lên tài liệu môn học - Giảng viên upload tài liệu cho lớp | **BE:** API `POST /api/course-materials` - Upload file lên cloud storage <br><br> **FE:** Trang tài liệu - Upload button - Danh sách file |
| 58 | `viewStudentPerformance` | Xem tình trạng học tập của lớp - Giảng viên xem điểm danh, điểm số của lớp | **BE:** API `GET /api/class-sections/:id/performance` - Thống kê điểm danh, điểm trung bình <br><br> **FE:** Dashboard lớp học - Biểu đồ |
| 59 | `manageExams` | Quản lý thi - Giảng viên tạo/điều chỉnh lịch thi | **BE:** API CRUD trong exam.service.js đã có <br><br> **FE:** Trang quản lý thi - Tạo lịch thi |
| 60 | `submitFinalGrades` | Nộp điểm cuối kỳ - Giảng viên nộp điểm vào hệ thống | **BE:** API `POST /api/grades/final-submit` - Tất cả sinh viên trong lớp <br><br> **FE:** Form nộp điểm hàng loạt |

---

### PHẦN 6: ADMIN & MANAGEMENT (15 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 61 | `auditLog` | Ghi lại log đăng ký - Lưu trữ mỗi hành động đăng ký, hủy, sửa của sinh viên | **BE:** Model `AuditLog` - Middleware tự động ghi log sau mỗi API - API `GET /api/audit-logs` <br><br> **FE:** Trang Admin xem logs - Filter theo ngày, SV |
| 62 | `handleRequestApproval` | Duyệt/từ chối đơn từ - Admin duyệt các đơn học lại, cải thiện, hoãn thi | **BE:** Type: 'repeat', 'improve', 'defer', 'drop' - API approve/reject <br><br> **FE:** Danh sách chờ duyệt - Nút duyệt/từ chối |
| 63 | `exportStudentData` | Export dữ liệu sinh viên - Admin export danh sách SV theo nhiều tiêu chí | **BE:** API `GET /api/students/export?format=excel\|pdf` - Filter: cohort, major, status <br><br> **FE:** Button Export - Chọn format |
| 64 | `importStudentData` | Import dữ liệu sinh viên - Admin import danh sách SV từ file Excel | **BE:** API `POST /api/students/import` - Parse file Excel - Validate - Bulk insert <br><br> **FE:** Upload file - Preview - Import |
| 65 | `systemSettings` | Cài đặt hệ thống - Admin cấu hình các thông số hệ thống | **BE:** SystemSettings model - API GET/PATCH settings <br><br> **FE:** Form cấu hình - Button Lưu |
| 66 | `dashboardAnalytics` | Thống kê dashboard - Admin xem số liệu tổng quan | **BE:** API `GET /api/dashboard/stats` - Số SV, lớp, tỷ lệ đăng ký <br><br> **FE:** Dashboard với card thống kê |
| 67 | `studentPerformanceReport` | Báo cáo tình trạng học tập - Admin xem báo cáo chi tiết | **BE:** API `GET /api/reports/student-performance` - GPA trung bình, tỷ lệ đạt <br><br> **FE:** Biểu đồ - Filter theo kỳ, ngành |
| 68 | `tuitionRevenueReport` | Báo cáo doanh thu học phí - Admin xem thống kê học phí | **BE:** API `GET /api/reports/tuition-revenue` - Tổng thu, tỷ lệ đóng <br><br> **FE:** Biểu đồ doanh thu - Export PDF |
| 69 | `assignLecturerToClass` | Phân công giảng viên - Admin phân công giảng viên dạy lớp học phần | **BE:** API `PATCH /api/class-sections/:id/assign-lecturer` <br><br> **FE:** Dropdown chọn giảng viên |
| 70 | `roomManagement` | Quản lý phòng học - Admin thêm/sửa/xóa phòng, xem lịch sử dụng | **BE:** Room model + service đã có - API xem lịch sử dụng phòng <br><br> **FE:** Danh sách phòng - Thêm/Sửa/Xóa |
| 71 | `timeslotManagement` | Quản lý tiết học - Admin cấu hình các tiết trong ngày | **BE:** Timeslot model + service đã có - CRUD đầy đủ <br><br> **FE:** Danh sách tiết - Giờ bắt đầu/kết thúc |
| 72 | `curriculumVersioning` | Quản lý nhiều phiên bản CT - CT K18, K19, K20 có thể khác nhau | **BE:** Curriculum model có version - Khi tạo mới → version +1 <br><br> **FE:** Dropdown chọn CT - So sánh các phiên bản |
| 73 | `academicCalendar` | Lịch học năm - Admin tạo lịch năm học | **BE:** Model `AcademicCalendar` - Các sự kiện: kỳ thi, nghỉ lễ <br><br> **FE:** Timeline - Các sự kiện quan trọng |
| 74 | `courseCatalog` | Danh mục môn học - Catalog toàn bộ môn học của trường | **BE:** Subject model - Thêm mô tả, tín chỉ, môn tiên quyết <br><br> **FE:** Search - Filter - Chi tiết môn |
| 75 | `createAnnouncement` | Đăng thông báo - Admin/Giảng viên đăng thông báo | **BE:** API `POST /api/announcements` - Phân loại: toàn trường, khoa, lớp <br><br> **FE:** Form đăng - Chọn đối tượng |

---

### PHẦN 7: MOBILE APP FEATURES (9 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 76 | `mobileLogin` | Đăng nhập trên mobile - Sinh viên đăng nhập qua app | **BE:** Sử dụng API auth hiện tại - JWT token <br><br> **Mobile:** Form login - Remember me - Biometric login |
| 77 | `mobileViewSchedule` | Xem lịch học trên mobile - Hiển thị thời khoá biểu trên điện thoại | **BE:** API `GET /api/schedule/my-schedule` <br><br> **Mobile:** Tab lịch học - Pull to refresh |
| 78 | `mobileRegisterCourse` | Đăng ký môn trên mobile - Đăng ký học phần qua app | **BE:** API đăng ký hiện tại <br><br> **Mobile:** List môn - Click đăng ký - Xác nhận |
| 79 | `mobileViewGrades` | Xem điểm trên mobile - Xem điểm mọi lúc mọi nơi | **BE:** API `GET /api/grades/my-grades` <br><br> **Mobile:** Tab điểm - List môn đã học |
| 80 | `mobileNotifications` | Nhận notification trên mobile - Push notification | **BE:** Tích hợp FCM <br><br> **Mobile:** Nhận push - Badge - Tap mở chi tiết |
| 81 | `mobileTuitionPayment` | Thanh toán học phí trên mobile - Thanh toán qua app | **BE:** API payment hiện tại <br><br> **Mobile:** Xem học phí - Button thanh toán - Webview payment |
| 82 | `mobileExamSchedule` | Xem lịch thi trên mobile - Lịch thi chi tiết | **BE:** API `GET /api/student-exams/my-exams` <br><br> **Mobile:** Tab lịch thi - Chi tiết phòng, giờ |
| 83 | `mobileAttendance` | Xem điểm danh trên mobile - Tỷ lệ tham dự | **BE:** API `GET /api/attendance/my-attendance` <br><br> **Mobile:** Tab điểm danh - Chi tiết từng môn |
| 84 | `mobileProfile` | Quản lý profile trên mobile - Cập nhật thông tin cá nhân | **BE:** API `GET/PATCH /api/students/me` <br><br> **Mobile:** Xem thông tin - Cập nhật avatar, phone |

---

### PHẦN 8: PERFORMANCE & MONITORING (6 tính năng)

| # | Function | Feature Description | Backend & Frontend |
|---|----------|---------------------|---------------------|
| 85 | `systemHealthCheck` | Kiểm tra sức khỏe hệ thống - Monitor server status | **BE:** API `/health` - CPU, memory, response time <br><br> **FE:** Dashboard health - Alerts khi有问题 |
| 86 | `apiPerformanceMonitoring` | Theo dõi hiệu suất API - Response time, error rate | **BE:** Middleware log mỗi request - Store vào database - API stats <br><br> **FE:** Dashboard - Biểu đồ response time |
| 87 | `databasePerformance` | Theo dõi hiệu suất database - Query time, connections | **BE:** Tích hợp MongoDB explain() - Log slow queries <br><br> **FE:** Dashboard - Cảnh báo slow queries |
| 88 | `errorTracking` | Theo dõi lỗi - Log và báo cáo lỗi | **BE:** ErrorLog model - Middleware catch errors - API get errors <br><br> **FE:** Page lỗi - Filter theo ngày, loại |
| 89 | `userActivityLog` | Log hoạt động người dùng - Ai làm gì, khi nào | **BE:** Model `ActivityLog` - Middleware auto log <br><br> **FE:** Admin xem activity - Search, filter |
| 90 | `rateLimitMonitoring` | Theo dõi giới hạn rate - Ai đang abuse API | **BE:** Tích hợp với rateLimit middleware - Store stats <br><br> **FE:** Dashboard - Cảnh báo abuse |

---

## TỔNG KẾT

| Phần | Số lượng tính năng |
|------|-------------------|
| 1. Core Enrollment & Curriculum | 15 |
| 2. Grade & GPA Management | 12 |
| 3. Notifications & Communication | 10 |
| 4. Student Portal Features | 15 |
| 5. Lecturer Features | 8 |
| 6. Admin & Management | 15 |
| 7. Mobile App Features | 9 |
| 8. Performance & Monitoring | 6 |
| **TỔNG CỘNG** | **90 TÍNH NĂNG** |

---

## THỨ TỰ ƯU TIÊN PHÁT TRIỂN

### Giai đoạn 1 (Cốt lõi - Ưu tiên cao):
1, 2, 3, 7, 11, 12, 13 → Auto-enrollment + Registration Period + Validation

### Giai đoạn 2 (Học phí + Đơn từ):
4, 5, 6, 9, 62 → Tuition + Wishlist + Request Approval

### Giai đoạn 3 (Điểm & GPA):
16, 17, 18, 19, 20, 21, 22 → Grade Management + GPA

### Giai đoạn 4 (Thông báo):
28, 29, 30, 31, 32 → Notifications System

### Giai đoạn 5 (Student Portal):
38, 39, 40, 41, 42, 43, 44 → Student Features

### Giai đoạn 6 (Lecturer):
53, 54, 55, 56 → Lecturer Features

### Giai đoạn 7 (Admin):
61, 62, 65, 66, 67, 68 → Admin Dashboard + Reports

### Giai đoạn 8 (Mobile):
76, 77, 78, 79, 80, 81, 82, 83, 84 → Mobile App

### Giai đoạn 9 (Performance):
85, 86, 87, 88, 89, 90 → Monitoring

---

## ✅ KẾT LUẬN

**Project cần tối thiểu 84 tính năng để hoạt động trong môi trường đại học:**

| Danh mục | Số lượng |
|----------|----------|
| Tính năng cốt lõi (Enrollment) | 15 |
| Grade & GPA | 12 |
| Notifications | 10 |
| Student Portal | 15 |
| Lecturer | 8 |
| Admin | 15 |
| Mobile | 9 |
| Performance | 6 |
| **TỔNG** | **90** |

Bạn có muốn tôi bắt đầu phát triển tính năng nào trước không?
