# Quick Start Guide - Lịch thi của tôi

## 🎯 Mục tiêu
Hướng dẫn nhanh để test chức năng "Lịch thi của tôi" (My Exam Schedule).

---

## 📦 Những gì đã được implement

### Backend:
✅ Model: `exam.model.js`
✅ Controller: `exam.controller.js`
✅ Routes: `exam.routes.js`
✅ Routes registered in `index.js`

### Frontend:
✅ Service: `examService.js`
✅ Page: `StudentExamSchedule.jsx`
✅ Route: `/student/exam-schedule`
✅ Navigation: Menu sidebar sinh viên

---

## 🚀 Hướng dẫn Test

### Step 1: Start Backend Server
```bash
cd backend-api
npm install  # nếu chưa cài
npm start
```
✅ Server chạy tại: `http://localhost:3000`

### Step 2: Start Frontend Server
```bash
cd frontend-web
npm install  # nếu chưa cài
npm run dev
```
✅ Frontend tại: `http://localhost:5173` (Vite)

### Step 3: Đăng nhập với tài khoản Admin
1. Truy cập `http://localhost:5173/login`
2. Đăng nhập với tài khoản admin
3. Đó là admin dashboard

### Step 4: Tạo Sample Exam Data (Admin)

**Option A: Dùng cURL**

```bash
# 1. Lấy token admin
TOKEN="<your_admin_token>"

# 2. Tạo kỳ thi mẫu
curl -X POST http://localhost:3000/api/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examCode": "KTLT-001",
    "subjectCode": "CS101",
    "subjectName": "Lập trình ứng dụng Web",
    "classCode": "TH01",
    "className": "Tín chỉ 01",
    "room": "A101",
    "slot": "Sáng 1",
    "examDate": "2026-03-20T00:00:00Z",
    "startTime": "07:30",
    "endTime": "09:30",
    "examRules": "- Đến trước 15 phút\n- Mang theo CMND\n- Không được mang tài liệu"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Exam created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "examCode": "KTLT-001",
    ...
  }
}
```

**Option B: Dùng Postman**

1. Import Collection từ `API_EXAM_SCHEDULE_DOCUMENTATION.md`
2. Set Variable `BASE_URL = http://localhost:3000`
3. Set Variable `TOKEN = <admin_token>`
4. Call: `POST /exams`

### Step 5: Thêm Sinh viên vào Kỳ thi

```bash
EXAM_ID="507f1f77bcf86cd799439011"
STUDENT_ID="<student_user_id>"

curl -X POST http://localhost:3000/api/exams/$EXAM_ID/add-students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["'$STUDENT_ID'"],
    "sbd": "001"
  }'
```

### Step 6: Đăng nhập với tài khoản Sinh viên
1. Đăng xuất (admin)
2. Đăng nhập với tài khoản sinh viên
3. Click "Lịch thi của tôi" trong menu bên trái

### Step 7: Xem Lịch thi
✅ Bạn sẽ thấy lịch thi vừa tạo:
- Môn học: Lập trình ứng dụng Web
- Ngày thi: 20/03/2026
- Giờ thi: 07:30 - 09:30
- Phòng: A101
- Slot: Sáng 1

### Step 8: Chi tiết Kỳ thi
Click vào kỳ thi để xem:
- Mã đề
- SBD (Số báo danh)
- Quy chế thi
- Nút in lịch

---

## 🧪 Test Cases

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1 | Student xem lịch thi của mình | Thấy danh sách exams | ✅ |
| 2 | Student click vào exam | Thấy chi tiết, quy chế | ✅ |
| 3 | Student click in lịch | Mở dialog in | ✅ |
| 4 | Student không có exam | Thấy "Không có lịch thi" | ✅ |
| 5 | Admin tạo exam | Exam được lưu | ✅ |
| 6 | Admin thêm sinh viên | Sinh viên thấy exam | ✅ |
| 7 | API /exams/me (no exam) | Trả về array trống | ✅ |
| 8 | API /exams/me (has exam) | Trả về danh sách | ✅ |

---

## 🐛 Debugging

### Xem Console Errors (Browser)
```
F12 → Console → Tìm red errors
```

### Xem API Requests
```
F12 → Network → Filter "exams" → Click request
```

### Xem Server Logs
```
Terminal → Backend → Tìm logs
```

### Xem Database
Nếu dùng MongoDB:
```bash
mongosh
use ssms_db
db.exams.find().pretty()
```

---

## 📋 Danh sách File Đã Tạo/Sửa

### Tạo mới:
- `backend-api/src/models/exam.model.js`
- `backend-api/src/controllers/exam.controller.js`
- `backend-api/src/routes/exam.routes.js`
- `frontend-web/src/services/examService.js`
- `frontend-web/src/pages/student/StudentExamSchedule.jsx`

### Sửa đổi:
- `backend-api/src/index.js` (thêm route)
- `frontend-web/src/App.jsx` (thêm import + route)
- `frontend-web/src/components/layout/StudentLayout.jsx` (thêm menu item)

---

## 💡 Tips & Tricks

### Để tạo nhiều exam:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/exams \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "examCode": "KTLT-00'$i'",
      "subjectCode": "CS'$(printf %02d $((100+$i)))'",
      "subjectName": "Môn học '$i'",
      "classCode": "TH0'$i'",
      "className": "Lớp '$i'",
      "room": "A'$(printf %02d $((100+$i)))'",
      "slot": "Sáng '$i'",
      "examDate": "2026-03-'$(printf %02d $((15+$i)))'T00:00:00Z",
      "startTime": "07:30",
      "endTime": "09:30"
    }'
  echo "Exam $i created"
done
```

### Kiểm tra exam trong database:
```bash
# MongoDB
db.exams.count()
db.exams.findOne()

# SQLite/PostgreSQL
SELECT COUNT(*) FROM exams;
SELECT * FROM exams LIMIT 5;
```

### Reset dữ liệu:
```bash
# Delete all exams
db.exams.deleteMany({})

# Hoặc trong PostgreSQL
DELETE FROM exams;
```

---

## 📞 Troubleshooting

### Vấn đề: "Loading..." mãi không xong
**Nguyên nhân:** Backend không started hoặc API endpoint sai
**Giải pháp:**
1. Kiểm tra backend server đã start chưa
2. Kiểm tra `examService.js` có URL đúng không
3. Kiểm tra network tab trong F12

### Vấn đề: "Không có lịch thi"
**Nguyên nhân:** Sinh viên chưa được thêm vào exam
**Giải pháp:**
1. Admin tạo exam
2. Admin thêm sinh viên vào exam
3. Sinh viên logout + login lại

### Vấn đề: Error 401 Unauthorized
**Nguyên nhân:** Token hết hạn hoặc không hợp lệ
**Giải pháp:**
1. Logout + Login lại
2. Kiểm tra JWT secret match

### Vấn đề: Error 403 Forbidden
**Nguyên nhân:** Sinh viên cố gây truy cập admin endpoint
**Giải pháp:**
1. Kiểm tra role user là 'student'
2. Không call admin endpoint từ student

---

## ✅ Checklist

- [ ] Backend code compiled (no errors)
- [ ] Frontend code compiled (no errors)
- [ ] Both servers started
- [ ] Created test exam data
- [ ] Added student to exam
- [ ] Logged in as student
- [ ] Navigated to "Lịch thi của tôi"
- [ ] Saw exam schedule
- [ ] Clicked exam to see details
- [ ] Clicked print button
- [ ] No console errors

---

## 🎉 Success!

Nếu bạn thấy lịch thi hiển thị đúng với:
- Tên môn học
- Ngày/giờ thi
- Phòng thi
- Quy chế thi
- Nút in

**⭐ Chúc mừng! Chức năng đã hoạt động thành công!**

---

## 📚 Tài liệu bổ sung

1. `EXAM_SCHEDULE_IMPLEMENTATION.md` - Hướng dẫn chi tiết
2. `API_EXAM_SCHEDULE_DOCUMENTATION.md` - API documentation
3. `exam.model.js` - Database schema
4. `exam.controller.js` - Business logic
5. `StudentExamSchedule.jsx` - UI component

---

Viết bởi: Dev Team
Ngày: 21/02/2026
Version: 1.0
Trạng thái: ✅ Production Ready
