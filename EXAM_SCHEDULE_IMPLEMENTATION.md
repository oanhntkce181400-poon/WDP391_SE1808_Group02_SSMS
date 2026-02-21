# Hướng dẫn Implementation - Chức năng "Lịch thi của tôi"

## 📋 Tổng quan

Chức năng này cho phép sinh viên xem lịch thi của mình, bao gồm:
- **Ngày thi**: Ngày thi chính xác
- **Giờ thi**: Giờ bắt đầu và kết thúc
- **Phòng thi**: Vị trí phòng thi
- **Slot**: Kỳ thi (slot)
- **SBD**: Số báo danh
- **Quy chế thi**: Chi tiết quy chế và hướng dẫn

## ✅ Công việc đã hoàn thành

### Backend (API)

#### 1. **Exam Model** - `backend-api/src/models/exam.model.js`
```javascript
Các trường chính:
- examCode (string, unique): Mã đề thi
- subjectCode: Mã môn học
- subjectName: Tên môn học
- classCode: Mã lớp
- className: Tên lớp
- room: Phòng thi
- slot: Kỳ thi (slot)
- examDate: Ngày thi (Date)
- startTime: Giờ bắt đầu (HH:MM)
- endTime: Giờ kết thúc (HH:MM)
- sbd: Số báo danh (số hiệu thi)
- enrolledStudents: Mảng sinh viên tham gia
- examRules: Quy chế thi
- notes: Ghi chú thêm
- status: scheduled, ongoing, completed, cancelled
```

#### 2. **Exam Controller** - `backend-api/src/controllers/exam.controller.js`
```
Các endpoint/phương thức:
- getMyExams(): GET /exams/me - Lấy lịch thi của sinh viên hiện tại
- getAllExams(): GET /exams - Lấy tất cả lịch thi (admin)
- getExamById(): GET /exams/:id - Lấy chi tiết một kỳ thi
- createExam(): POST /exams - Tạo kỳ thi mới (admin)
- updateExam(): PATCH /exams/:id - Cập nhật kỳ thi (admin)
- deleteExam(): DELETE /exams/:id - Xóa kỳ thi (admin)
- addStudentsToExam(): POST /exams/:id/add-students - Thêm sinh viên vào kỳ thi (admin)
```

#### 3. **Exam Routes** - `backend-api/src/routes/exam.routes.js`
```
GET  /api/exams/me          - Lịch thi của sinh viên (yêu cầu xác thực)
GET  /api/exams             - Tất cả lịch thi (yêu cầu xác thực)
POST /api/exams             - Tạo kỳ thi mới (yêu cầu xác thực + admin)
GET  /api/exams/:id         - Chi tiết kỳ thi (yêu cầu xác thực)
PATCH /api/exams/:id        - Cập nhật kỳ thi (yêu cầu xác thực + admin)
DELETE /api/exams/:id       - Xóa kỳ thi (yêu cầu xác thực + admin)
POST /api/exams/:id/add-students - Thêm sinh viên (yêu cầu xác thực + admin)
```

#### 4. **Backend Index** - `backend-api/src/index.js`
✅ Route đã được đăng ký: `app.use('/api/exams', require('./routes/exam.routes'));`

### Frontend (UI)

#### 1. **Exam Service** - `frontend-web/src/services/examService.js`
```javascript
Các phương thức:
- getMyExams(params): Lấy lịch thi của tôi
- getAllExams(params): Lấy tất cả lịch thi
- getExamById(id): Lấy chi tiết kỳ thi
- createExam(data): Tạo kỳ thi mới
- updateExam(id, data): Cập nhật kỳ thi
- deleteExam(id): Xóa kỳ thi
- addStudentsToExam(examId, data): Thêm sinh viên
```

#### 2. **Student Exam Schedule Page** - `frontend-web/src/pages/student/StudentExamSchedule.jsx`
✅ Trang hiển thị lịch thi với:
- Danh sách lịch thi của sinh viên
- Thông tin chi tiết (ngày, giờ, phòng, slot, SBD)
- Quy chế thi
- Ghi chú cảnh báo
- Nút in lịch thi

#### 3. **Routing** - `frontend-web/src/App.jsx`
✅ Các thay đổi:
- Import `StudentExamSchedule`
- Thêm route: `<Route path="exam-schedule" element={<StudentExamSchedule />} />`

#### 4. **Navigation** - `frontend-web/src/components/layout/StudentLayout.jsx`
✅ Đã thêm menu item:
- Label: "Lịch thi của tôi"
- Route: `/student/exam-schedule`
- Icon: 📝

---

## 🚀 Hướng dẫn sử dụng

### Từ phía Sinh viên:
1. Đăng nhập vào hệ thống
2. Click vào "Lịch thi của tôi" trong menu bên trái
3. Xem danh sách các kỳ thi của bạn
4. Click vào từng kỳ thi để xem chi tiết:
   - Ngày, giờ, phòng, slot
   - SBD (Số báo danh)
   - Quy chế thi
   - Ghi chú quan trọng
5. Click nút "📋 In lịch thi" để in lịch

### Từ phía Admin:
1. API để tạo lịch thi mới:
```bash
POST /api/exams
Content-Type: application/json

{
  "examCode": "KTLT-01",
  "subjectCode": "CS101",
  "subjectName": "Lập trình ứng dụng Web",
  "classCode": "TH01",
  "className": "Tín chỉ 01",
  "room": "A101",
  "slot": "Sáng 1",
  "examDate": "2026-03-15T00:00:00Z",
  "startTime": "07:30",
  "endTime": "09:30",
  "examRules": "Quy chế thi chung của nhà trường"
}
```

2. Thêm sinh viên vào kỳ thi:
```bash
POST /api/exams/{examId}/add-students
Content-Type: application/json

{
  "studentIds": ["userid1", "userid2"],
  "sbd": "001"
}
```

---

## 📊 SQL Insert Statements (nếu cần)

Nếu bạn muốn nhập dữ liệu mẫu qua database:

```sql
INSERT INTO exams (
  examCode, subjectCode, subjectName, classCode, className,
  room, slot, examDate, startTime, endTime, examRules, status, createdAt
) VALUES
  ('KTLT-01', 'CS101', 'Lập trình Web', 'TH01', 'Tín chỉ 01', 
   'A101', 'Sáng 1', '2026-03-15 00:00:00', '07:30', '09:30', 
   'Quy chế thi chung', 'scheduled', NOW()),
  
  ('KTLT-02', 'CS102', 'Cơ sở dữ liệu', 'TH01', 'Tín chỉ 01',
   'A102', 'Sáng 2', '2026-03-15 00:00:00', '10:00', '12:00',
   'Quy chế thi chung', 'scheduled', NOW());
```

---

## 🔍 Troubleshooting

### Vấn đề: Sinh viên không nhìn thấy lịch thi
**Giải pháp:**
1. Kiểm tra sinh viên đã được thêm vào `enrolledStudents` của exam chưa
2. Kiểm tra `userId` khớp với `studentId.studentId` trong database
3. Kiểm tra token xác thực có hợp lệ không

### Vấn đề: API trả về mảng trống
**Giải pháp:**
1. Kiểm tra user role là 'student'
2. Đảm bảo exam status không phải 'cancelled'
3. Verifytoken JWT được truyền đúng

### Vấn đề: Giao diện không hiển thị đúng
**Giải pháp:**
1. Xóa cache và reload trang
2. Kiểm tra Tailwind CSS đã được import
3. Kiểm tra console.log cho lỗi JavaScript

---

## 📝 Sample Test Data

Để test chức năng, bạn có thể:

1. **Tạo exam via API:**
```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examCode": "KTLT-TEST-01",
    "subjectCode": "CS101",
    "subjectName": "Test Lập trình",
    "classCode": "TH01",
    "className": "Test Class",
    "room": "A101",
    "slot": "Sáng 1",
    "examDate": "2026-03-15T00:00:00Z",
    "startTime": "07:30",
    "endTime": "09:30"
  }'
```

2. **Thêm sinh viên vào exam:**
```bash
curl -X POST http://localhost:3000/api/exams/{EXAM_ID}/add-students \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["STUDENT_USER_ID"],
    "sbd": "001"
  }'
```

3. **Xem lịch thi (sinh viên):**
```bash
curl -X GET http://localhost:3000/api/exams/me \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

---

## 🎯 Các tính năng có thể mở rộng trong tương lai

- [ ] Export lịch thi dưới dạng PDF
- [ ] Thông báo nhắc nhở lịch thi (email/SMS)
- [ ] Xem điểm thi sau khi kết thúc
- [ ] Phúc khảo bài thi
- [ ] Thống kê tỷ lệ chuyên cần
- [ ] Đối chiếu lịch thi với giờ học khác
- [ ] Xuất lịch sang Google Calendar

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra lỗi trong browser console (F12)
2. Kiểm tra server logs
3. Xem API response trong Network tab
4. Liên hệ với nhóm phát triển
