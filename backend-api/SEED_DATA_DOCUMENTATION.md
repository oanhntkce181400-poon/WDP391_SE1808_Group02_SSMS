# 📊 DATABASE SEED DATA - Documentation

## 🎯 Tổng quan

File này tạo **fake data** cho database bằng **faker.js** để test và development.

**Chạy seed:** `npm run seed` trong folder `backend-api`

---

## 📂 Models có seed data

### 1. **Major** (Chuyên ngành)
- **Số lượng:** 4 majors cố định
- **Data:**
  - `CE` - Công nghệ thông tin
  - `BA` - Kinh tế  
  - `CA` - Thiết kế đồ họa
  - `SE` - Kỹ thuật phần mềm

### 2. **Subject** (Môn học)
- **Số lượng:** 50 subjects
- **Faker data:**
  - `subjectCode`: SUB001, SUB002,... (tự tăng)
  - `subjectName`: Fake từ hacker nouns/verbs (vd: "system deploy responsive")
  - `credits`: Random 2-5
  - `majorCode`: Random từ 4 majors

### 3. **Curriculum** (Chương trình học)
- **Số lượng:** 5 curriculums (K16, K17, K18, K19, K20)
- **Logic:**
  - Mỗi curriculum gắn với 1 cohort (khóa học)
  - Chọn random 20-30 subjects từ 50 subjects đã tạo
  - `curriculumCode`: K16, K17, K18, K19, K20

### 4. **Room** (Phòng học)
- **Số lượng:** 50 rooms
- **Faker data:**
  - `roomCode`: R + floor + roomNumber (vd: R2305)
  - `roomName`: "Room R2305"
  - `roomType`: Random từ [Lab, Lecture, Meeting]
  - `capacity`: Random 20-80

### 5. **Device** (Thiết bị)
- **Số lượng:** 200 devices
- **Faker data:**
  - `deviceCode`: DEV0001, DEV0002,... (tự tăng)
  - `deviceName`: Fake product name (vd: "Incredible Computer")
  - `status`: Random từ [available, in-use, maintenance]
  - `room`: Random room đã tạo

### 6. **Teacher** (Giảng viên)
- **Số lượng:** 100 teachers
- **Faker data:**
  - `teacherCode`: GV0001, GV0002,... (tự tăng)
  - `fullName`: Fake Vietnamese name
  - `email`: Auto-generate từ name (vd: `nguyenvagv0001@fpt.edu.vn`)
  - `department`: Random từ 4 majors

### 7. **Student** (Sinh viên)
- **Số lượng:** 1000 students
- **Faker data:**
  - `studentCode`: Auto-generate từ major+cohort+số (vd: CE181001)
  - `fullName`: Fake Vietnamese name
  - `email`: Auto-generate từ name+major+cohort (vd: `nguyenvace181001@fpt.edu.vn`)
  - `majorCode`: Random từ 4 majors
  - `cohort`: Random từ [16,17,18,19,20]
  - `curriculum`: Curriculum tương ứng với cohort

### 8. **User - Admin**
- **Số lượng:** 1 admin
- **Cố định:**
  - Email: `admin@example.com`
  - Password: `123456` (đã hash bcrypt)
  - Role: `admin`

---

## 🔑 Logic tạo Email/Code

### Student Email:
```
Format: {firstname}{initials}{major}{cohort}{suffix}@fpt.edu.vn
Ví dụ: Nguyen Van A, CE, K18, suffix 1001
→ anguyenvace181001@fpt.edu.vn
```

### Student Code:
```
Format: {major}{cohort}{suffix}
Ví dụ: CE + 18 + 1001 = CE181001
```

### Teacher Email:
```
Format: {firstname}{initials}gv{suffix}@fpt.edu.vn
Ví dụ: Nguyen Van B, suffix 0001
→ bnguyenvangv0001@fpt.edu.vn
```

### Teacher Code:
```
Format: GV{suffix}
Ví dụ: GV0001, GV0002
```

---

## 🧠 Logic seed

### Thứ tự seed (quan trọng!):
```
1. Majors (4)
2. Subjects (50)
3. Curriculums (5) - tham chiếu Subjects
4. Rooms (50)
5. Devices (200) - tham chiếu Rooms
6. Teachers (100)
7. Students (1000) - tham chiếu Curriculums
8. Admin (1)
9. Missing tables từ DATABASESeed.drawio.xml (nếu có)
```

### Faker seed:
- Dùng `faker.seed(20250127)` để data luôn giống nhau mỗi lần chạy
- Dùng `fakerVI` để tên tiếng Việt

---

## 🔄 Cách chạy Seed

```bash
# 1. Vào folder backend-api
cd backend-api

# 2. Chạy seed (sẽ XÓA data cũ và tạo mới)
npm run seed

# 3. Xem kết quả
# - 4 majors
# - 50 subjects  
# - 5 curriculums
# - 50 rooms
# - 200 devices
# - 100 teachers
# - 1000 students
# - 1 admin
```

**⚠️ Lưu ý:** Seed sẽ **XÓA toàn bộ data cũ** trong các collections trước khi tạo mới!

---

## 📝 Models liên quan

Chi tiết models xem file: `MODELS_DOCUMENTATION.md`

---

## 🐛 Troubleshooting

### Lỗi duplicate key:
- Seed có xử lý duplicate key cho Students (vì email/code có thể trùng)
- Nếu gặp lỗi duplicate ở models khác, check xem có data cũ chưa được xóa không

### Lỗi reference:
- Đảm bảo seed theo đúng thứ tự (Majors → Subjects → Curriculums → Students)
- Nếu thiếu reference, check xem collections trước đó đã được seed chưa

### Data tiếng Việt bị lỗi font:
- Dùng `fakerVI` đã xử lý, nhưng nếu vẫn lỗi có thể do terminal encoding
- Không ảnh hưởng logic, chỉ hiển thị

---

**Last updated:** 2026-01-27
