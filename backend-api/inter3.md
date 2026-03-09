1. Xác định Học kỳ Hiện tại (Determine Current Semester)
Mục tiêu: Tính toán sinh viên đang ở học kỳ mấy (HK1→HK9) trong khung chương trình (Curriculum) dựa trên năm nhập học.
Phân tích:
Backend:
Logic: (currentYear - enrollmentYear) × 2 + currentSemesterNum.
Cần tạo hàm trong curriculum.service.js hoặc student.service.js.
Cần lấy thông tin cohort (năm nhập học) từ model Student.
Cần lấy thông tin Semester hiện tại (kỳ 1 hay kỳ 2) từ model Semester.
Frontend:
Cập nhật API gọi hàm này khi load thông tin sinh viên (VD: /api/students/me hoặc profile).
Hiển thị: "Bạn đang học Học kỳ 3 - Năm 2" (tương ứng với Curriculum Semester ID).
2. Tính Học phí Kỳ (Calculate Semester Tuition)
Mục tiêu: Tự động tính học phí dựa trên số môn học trong CurriculumSemester.
Phân tích:
Backend:
Model: Model TuitionFee (đã có) lưu học phí theo kỳ/năm/mã ngành. Model Payment (đã có) lưu lịch sử thanh toán.
Service: Cần tạo tuitionAuto.service.js (hoặc mở rộng tuitionFee.service.js).
Logic:
Xác định CurriculumSemester hiện tại của SV (từ chức năng 1).
Lấy danh sách môn học trong kỳ đó.
Tính tổng credits × tuitionFeePerCredit (lấy từ SystemSettings hoặc Subject).
Tạo bản ghi TuitionBill (nếu chưa có) hoặc trả về thông tin chi tiết.
Frontend:
Trang "Xem học phí của tôi": Hiển thị danh sách môn, số tín chỉ, đơn giá, tổng tiền.
3. Kiểm tra Nợ Học phí (Check Outstanding Tuition Debt)
Mục tiêu: Chặn đăng ký môn mới nếu chưa đóng đủ học phí kỳ trước.
Phân tích:
Backend:
Service: Cập nhật registration.service.js.
Logic:
Khi SV đăng ký môn (POST /api/registrations hoặc validate-all), gọi hàm kiểm tra.
Tìm tất cả các TuitionBill (hoặc Payment nếu tính theo kỳ) của SV ở các kỳ trước (semesterCode < currentSemester).
So sánh paidAmount vs totalAmount.
Nếu còn nợ → Reject đăng ký.
Frontend:
Khi bấm "Đăng ký": Gọi API validation. Nếu fail do nợ tiền → Hiển thị thông báo đỏ, nút "Thanh toán ngay".
4. Xác thực Lộ trình Học tập (Verify Learning Path Sequence)
Mục tiêu: Kiểm tra điều kiện tiên quyết (Prerequisites) trước khi đăng ký.
Phân tích:
Backend:
Service: Logic đã có trong registration.service.js (validatePrerequisites).
Cập nhật: Đổi tên/thêm hàm validateLearningPath để kiểm tra chuỗi môn học (đã pass) vs yêu cầu.
Frontend:
Trang Đăng ký: Khi hover vào môn học → Hiển thị Tooltip: "Môn tiên quyết: [Môn A], [Môn B]".
Nếu chưa pass: Disable nút đăng ký, hiển thị thông báo "Chưa hoàn thành môn tiên quyết".
5. Quản lý Ví & Giao dịch (Manage E-Wallet & Transactions)
Mục tiêu: Sinh viên nạp tiền, trừ tiền khi đăng ký, xem số dư.
Phân tích:
Backend:
Model: Wallet (đã có).
Service: Cần tạo wallet.service.js.
API:
POST /api/wallet/deposit: Nạp tiền (tích hợp cổng thanh toán).
POST /api/wallet/withdraw: Trừ tiền (dùng trong logic đăng ký).
GET /api/wallet/balance: Lấy số dư.
GET /api/wallet/transactions: Lịch sử giao dịch.
Frontend:
Trang "Ví của tôi": Hiển thị số dư lớn, lịch sử giao dịch (nạp tiền, thanh toán học phí).
Nút "Nạp tiền" (Momo/Bank transfer).
6. Kiểm tra Trạng thái Thanh toán Học phí (Check Tuition Payment Status)
Mục tiêu: Badge hiển thị trạng thái đã/nợ tiền.
Phân tích:
Backend:
API GET /api/tuition/status?semesterId=xxx: Trả về isPaid, amountDue, amountPaid.
Frontend:
Hiển thị Badge nhỏ trên menu "Học phí":
Xanh lá: "Đã thanh toán"
Đỏ: "Còn nợ X VNĐ"
7. Quản lý Phòng học (Manage Classrooms)
Mục tiêu: Admin thêm/sửa/xóa phòng, xem lịch sử dụng.
Phân tích:
Backend:
Model: Room (đã có trong room.model.js - cần kiểm tra).
Service: roomService (có thể đã có).
API CRUD phòng: GET/POST/PUT/DELETE /api/rooms.
API xem lịch sử: Lấy từ Schedule model (lọc theo roomId).
Frontend:
Trang "Quản lý Phòng": Bảng danh sách phòng, nút Thêm/Sửa (Modal).
Xem lịch sử: Click vào phòng → Hiển thị lịch dạng lịch (Calendar view).
8. Quản lý Phiên bản Chương trình (Manage Curriculum Versions)
Mục tiêu: So sánh các phiên bản CTĐT (K18, K19...).
Phân tích:
Backend:
Model: Curriculum có trường version hoặc academicYear (đã có).
Logic:
API lấy danh sách Curriculum (group by majorCode).
API so sánh: Lấy 2 bản ghi Curriculum, so sánh mảng semesters và courses.
Frontend:
Dropdown chọn CTĐT: "CTĐT 2023 (K18)", "CTĐT 2024 (K19)".
Trang "So sánh CT": Chọn 2 phiên bản → Hiển thị bảng so sánh các cột (Môn thêm vào, môn bỏ, tín chỉ thay đổi).
Bạn có muốn tôi bắt đầu triển khai chi tiết từng phần (Backend + Frontend) không? Chúng ta nên bắt đầu từ phần nào trước (ví dụ: Backend trước hay làm song song)?