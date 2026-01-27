# 📚 DATABASE MODELS - Documentation

## 🎯 Tổng quan

Project có **16 models** trong folder `backend-api/src/models/`

---

## 📊 Models chính

### 1. **User** - Người dùng hệ thống
**File:** `user.model.js`

**Fields:**
- `email` (String, unique, required) - Email đăng nhập
- `password` (String, bcrypt hash) - Mật khẩu (cho local auth)
- `fullName` (String, required) - Họ tên
- `authProvider` (enum: 'google'|'local', default: 'google') - Phương thức đăng nhập
- `mustChangePassword` (Boolean, default: false) - Bắt buộc đổi mật khẩu
- `googleId` (String, unique, sparse) - Google OAuth ID
- `avatarUrl` (String) - URL avatar
- `role` (enum: 'admin'|'staff'|'student', default: 'admin') - Vai trò
- `isActive` (Boolean, default: true) - Trạng thái hoạt động
- `status` (enum: 'active'|'inactive'|'blocked'|'pending') - Trạng thái chi tiết
- `lastLoginAt` (Date) - Lần đăng nhập cuối
- `passwordChangedAt` (Date) - Lần đổi mật khẩu cuối
- `importSource` (String) - Nguồn import (nếu import từ file)
- `createdBy` (ObjectId, ref: User) - Người tạo
- `updatedBy` (ObjectId, ref: User) - Người cập nhật

**Indexes:**
- `{ role: 1, status: 1 }`
- `{ authProvider: 1, status: 1 }`

**Usage:** User chính của hệ thống (admin, staff, student login)

---

### 2. **Student** - Sinh viên
**File:** `student.model.js`

**Fields:**
- `studentCode` (String, unique, required) - Mã sinh viên (vd: CE181001)
- `fullName` (String, required) - Họ tên
- `email` (String, unique, required) - Email sinh viên
- `majorCode` (String, required) - Mã chuyên ngành
- `cohort` (Number, required) - Khóa học (vd: 18)
- `curriculum` (ObjectId, ref: Curriculum, required) - Chương trình học
- `isActive` (Boolean, default: true) - Trạng thái

**Usage:** Thông tin sinh viên, liên kết với Curriculum và Major

---

### 3. **Teacher** - Giảng viên
**File:** `teacher.model.js`

**Fields:**
- `teacherCode` (String, unique, required) - Mã giảng viên (vd: GV0001)
- `fullName` (String, required) - Họ tên
- `email` (String, unique, required) - Email giảng viên
- `department` (String, required) - Khoa/Bộ môn

**Usage:** Thông tin giảng viên

---

### 4. **Major** - Chuyên ngành
**File:** `major.model.js`

**Fields:**
- `majorCode` (String, unique, required) - Mã chuyên ngành (CE, SE, BA, CA)
- `majorName` (String, required) - Tên chuyên ngành
- `isActive` (Boolean, default: true) - Trạng thái

**Usage:** Danh sách chuyên ngành

---

### 5. **Subject** - Môn học
**File:** `subject.model.js`

**Fields:**
- `subjectCode` (String, unique, required) - Mã môn học (vd: SUB001)
- `subjectName` (String, required) - Tên môn học
- `credits` (Number, required) - Số tín chỉ
- `majorCode` (String, required) - Thuộc chuyên ngành nào

**Usage:** Danh sách môn học, thuộc Major

---

### 6. **Curriculum** - Chương trình học
**File:** `curriculum.model.js`

**Fields:**
- `curriculumCode` (String, unique, required) - Mã chương trình (vd: K18)
- `cohort` (Number, required) - Khóa học (18, 19, 20)
- `title` (String, required) - Tiêu đề chương trình
- `subjects` (Array of ObjectId, ref: Subject) - Danh sách môn học

**Usage:** Chương trình học cho từng khóa, chứa danh sách Subjects

---

### 7. **Room** - Phòng học
**File:** `room.model.js`

**Fields:**
- `roomCode` (String, unique, required) - Mã phòng (vd: R2305)
- `roomName` (String, required) - Tên phòng
- `roomType` (String) - Loại phòng (Lab, Lecture, Meeting)
- `capacity` (Number) - Sức chứa

**Usage:** Danh sách phòng học/phòng họp

---

### 8. **Device** - Thiết bị
**File:** `device.model.js`

**Fields:**
- `deviceCode` (String, unique, required) - Mã thiết bị (vd: DEV0001)
- `deviceName` (String, required) - Tên thiết bị
- `status` (String) - Trạng thái (available, in-use, maintenance)
- `room` (ObjectId, ref: Room) - Thuộc phòng nào

**Usage:** Thiết bị trong phòng học, liên kết với Room

---

## 🔐 Models Authentication & Authorization

### 9. **Role** - Vai trò
**File:** `role.model.js`

**Fields:**
- `roleName` (String, unique) - Tên vai trò
- `description` (String) - Mô tả

**Usage:** Định nghĩa các vai trò trong hệ thống

---

### 10. **Permission** - Quyền hạn
**File:** `permission.model.js`

**Fields:**
- `permissionName` (String, unique) - Tên quyền
- `description` (String) - Mô tả

**Usage:** Định nghĩa các quyền cụ thể

---

### 11. **RolePermission** - Vai trò - Quyền
**File:** `rolePermission.model.js`

**Fields:**
- `role` (ObjectId, ref: Role) - Vai trò
- `permission` (ObjectId, ref: Permission) - Quyền

**Usage:** Mapping nhiều-nhiều giữa Role và Permission

---

### 12. **UserRole** - User - Vai trò
**File:** `userRole.model.js`

**Fields:**
- `user` (ObjectId, ref: User) - User
- `role` (ObjectId, ref: Role) - Vai trò

**Usage:** Mapping nhiều-nhiều giữa User và Role

---

## 🔑 Models bảo mật & session

### 13. **RefreshToken** - Token làm mới
**File:** `refreshToken.model.js`

**Fields:**
- `user` (ObjectId, ref: User) - User sở hữu token
- `token` (String, hashed) - Refresh token
- `expiresAt` (Date) - Thời gian hết hạn
- `isRevoked` (Boolean) - Đã thu hồi chưa

**Usage:** Lưu refresh token cho JWT authentication

---

### 14. **PasswordResetOtp** - OTP reset password
**File:** `passwordResetOtp.model.js`

**Fields:**
- `email` (String) - Email user
- `otp` (String) - Mã OTP
- `expiresAt` (Date) - Thời gian hết hạn
- `isUsed` (Boolean) - Đã dùng chưa

**Usage:** Quản lý OTP cho reset password

---

### 15. **LoginEvent** - Lịch sử đăng nhập
**File:** `loginEvent.model.js`

**Fields:**
- `user` (ObjectId, ref: User) - User đăng nhập
- `loginAt` (Date) - Thời gian đăng nhập
- `ipAddress` (String) - IP đăng nhập
- `userAgent` (String) - Trình duyệt
- `status` (String) - Trạng thái (success, failed)

**Usage:** Audit log cho login

---

### 16. **DeviceSession** - Session thiết bị
**File:** `deviceSession.model.js`

**Fields:**
- `user` (ObjectId, ref: User) - User
- `deviceId` (String) - ID thiết bị
- `sessionToken` (String) - Token session
- `expiresAt` (Date) - Thời gian hết hạn
- `isActive` (Boolean) - Trạng thái

**Usage:** Quản lý session trên nhiều thiết bị

---

## 📊 Relationships (Quan hệ)

```
User 1-N Student (qua email)
Student N-1 Curriculum
Student N-1 Major (qua majorCode)
Curriculum N-N Subject
Device N-1 Room
User N-N Role (qua UserRole)
Role N-N Permission (qua RolePermission)
User 1-N RefreshToken
User 1-N LoginEvent
User 1-N DeviceSession
```

---

## 🔍 Indexes quan trọng

- **User:** email (unique), role+status, authProvider+status
- **Student:** studentCode (unique), email (unique)
- **Teacher:** teacherCode (unique), email (unique)
- **Major:** majorCode (unique)
- **Subject:** subjectCode (unique)
- **Curriculum:** curriculumCode (unique)
- **Room:** roomCode (unique)
- **Device:** deviceCode (unique)

---

## 💡 Best Practices

1. **Luôn dùng `ref`** khi có relationship giữa models
2. **Index** các fields hay query (email, code, status)
3. **Unique** các fields cần unique (email, code)
4. **Default values** cho các fields boolean/enum
5. **Timestamps** để track created/updated time

---

**Last updated:** 2026-01-27
