# Student View Profile Feature - Hướng dẫn

## 📋 Tổng quan

Tính năng "View Profile" cho phép sinh viên xem và quản lý thông tin cá nhân của mình, bao gồm:
- Xem thông tin hồ sơ (read-only)
- Chỉnh sửa thông tin cá nhân
- Upload và thay đổi avatar
- Xem các học phần hiện tại
- Xem thông tin bổ sung (GPA, tín chỉ, năm học)

## 🎯 Các chức năng chính

### 1. Xem Hồ sơ Cá nhân (Read-Only View)
**Tệp**: `frontend-web/src/components/features/ViewProfile.jsx`

**Thông tin hiển thị**:
- Họ và tên
- Email
- Mã sinh viên
- Vai trò (Role)
- Trạng thái tài khoản
- Ngày tạo tài khoản

**API gọi**:
- `GET /api/users/profile` - Lấy thông tin hồ sơ hiện tại

```javascript
// Cách sử dụng
<ViewProfile onEdit={() => setIsEditing(true)} />
```

### 2. Chỉnh sửa Hồ sơ (Edit Mode)
**Tệp**: `frontend-web/src/pages/StudentProfilePage.jsx`

**Trường có thể chỉnh sửa**:
- Họ và tên (fullName)
- Email

**API gọi**:
- `PATCH /api/users/profile` - Cập nhật thông tin hồ sơ

```javascript
// Request body
{
  "fullName": "Nguyễn Văn An",
  "email": "new-email@example.com"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { ... }
}
```

**Tính năng**:
- Validate input trước khi lưu
- Hiển thị loading state khi lưu
- Xử lý lỗi với thông báo rõ ràng
- Hủy chỉnh sửa mà không lưu

### 3. Quản lý Avatar
**Tệp**: `frontend-web/src/components/features/AvatarUploader.jsx`

**Tính năng**:
- Chọn ảnh từ thiết bị
- Xem trước ảnh
- Cắt ảnh (crop) thành hình vuông
- Upload ảnh lên Cloudinary
- Hiển thị tiến trình upload

**API gọi**:
- `PATCH /api/users/avatar` - Upload avatar mới

```javascript
// Request: multipart/form-data
Field: avatar (file)

// Response
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/..."
  }
}
```

### 4. Xem Học phần Hiện tại
**Thông tin hiển thị**:
- Tên môn học
- Giảng viên dạy
- Trạng thái (Đang học / Hoàn thành)
- Tín chỉ
- Kỳ học

**Dữ liệu**: Tạm thời sử dụng mock data (có thể kết nối API sau)

### 5. Thông tin Bổ sung
Hiển thị các thông tin học tập:
- GPA (Điểm trung bình tích lũy)
- Tín chỉ đạt được
- Tín chỉ còn lại
- Năm học hiện tại

**Dữ liệu**: Tạm thời sử dụng mock data (có thể kết nối API sau)

## 🔗 Navigation & Routes

### Route chính
- **URL**: `/student/profile`
- **Page**: `frontend-web/src/pages/StudentProfilePage.jsx`
- **Protected**: Yêu cầu đăng nhập với role `student`

### Liên kết trong giao diện
1. **Sidebar Navigation**: 
   - Tên: "Hồ sơ cá nhân"
   - Icon: 👤
   - Vị trí: Menu thứ 2

2. **User Dropdown Menu**:
   - "Xem hồ sơ cá nhân"
   - "Cài đặt tài khoản"
   - Xuất hiện khi hover vào avatar

## 📁 Cấu trúc File

```
frontend-web/src/
├── pages/
│   └── StudentProfilePage.jsx       # Trang chính
├── components/
│   └── features/
│       ├── ViewProfile.jsx           # Component hiển thị read-only
│       └── AvatarUploader.jsx        # Component upload avatar
└── services/
    └── userService.js               # API client
```

## 🎨 UI Components

### StudentProfilePage Layout
```
┌─────────────────────────────────────┐
│        Header (Blue Gradient)       │
│  ┌───────────────────────────────┐  │
│  │   Avatar + Name + Student ID  │  │
│  │   Edit & Download CV Buttons  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─────┬─────┬─────┐               │
│  │ ID  │Maj. │Status│               │
│  └─────┴─────┴─────┘               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     Enrolled Courses Section         │
│  ┌───────────────────────────────┐  │
│  │ Course 1                      │  │
│  │ Instructor | Semester | Status│  │
│  └───────────────────────────────┘  │
│  ... (more courses)                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     Additional Info (Gray Section)   │
│  ┌──────┬──────┬──────┬──────┐     │
│  │ GPA  │Credits│Credits│Year │     │
│  │Earned│Left  │       │      │     │
│  └──────┴──────┴──────┴──────┘     │
└─────────────────────────────────────┘
```

## 🔄 Luồng dữ liệu

```
StudentProfilePage
├── State
│   ├── student (thông tin hồ sơ)
│   ├── isEditing (chế độ chỉnh sửa)
│   ├── editFormData (dữ liệu form)
│   ├── loading
│   ├── error
│   ├── successMessage
│   └── isSaving
│
├── Effects
│   └── useEffect → fetchStudentProfile()
│
└── Functions
    ├── fetchStudentProfile() → userService.getProfile()
    ├── handleEditChange()
    ├── handleSaveProfile() → userService.updateProfile()
    ├── handleAvatarUploadSuccess()
    └── handleDownloadCV()
```

## ✨ Tính năng nâng cao

### 1. Error Handling
- Hiển thị thông báo lỗi rõ ràng
- Nút "Thử lại" để tải lại dữ liệu
- Xử lý timeout kết nối

### 2. Success Messages
- Toast notification khi cập nhật thành công
- Tự động ẩn sau 3 giây
- Animate với màu xanh lá cây

### 3. Loading States
- Spinner khi tải dữ liệu
- Disabled button khi lưu
- Progress bar cho upload avatar

### 4. Responsive Design
- Desktop: 3 cột cho info cards
- Tablet: 2-3 cột
- Mobile: 1 cột

## 🔐 Authentication & Authorization

- Yêu cầu JWT token trong header
- Chỉ sinh viên (role: 'student') có thể truy cập
- Token được lưu trong localStorage
- Auto-redirect nếu token hết hạn

## 📝 Backend Requirements

### Models
- **User Model** cần có các field:
  - `_id`: ObjectId
  - `fullName`: String
  - `email`: String (unique)
  - `avatarUrl`: String
  - `avatarCloudinaryId`: String
  - `role`: String (enum: ['admin', 'staff', 'student'])
  - `status`: String (enum: ['active', 'inactive', 'suspended'])
  - `createdAt`: DateTime
  - `updatedAt`: DateTime

### Environment Variables
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🧪 Testing Checklist

- [ ] Load profile page từ authentication
- [ ] Hiển thị đúng thông tin hồ sơ
- [ ] Chỉnh sửa fullName và email
- [ ] Upload và thay đổi avatar
- [ ] Hủy chỉnh sửa
- [ ] Xử lý error khi API thất bại
- [ ] Responsive trên mobile/tablet
- [ ] Navigate từ sidebar menu
- [ ] Navigate từ user dropdown
- [ ] Logout từ dropdown menu
- [ ] Refresh page và vẫn thấy dữ liệu

## 🚀 Tính năng tương lai

- [ ] Export profile thành PDF
- [ ] Download CV/Resume
- [ ] Thay đổi mật khẩu
- [ ] Xem lịch sử đăng nhập
- [ ] Thêm số điện thoại
- [ ] Thêm địa chỉ
- [ ] Kết nối social media
- [ ] Đơn xin cấp học bổng
- [ ] Hỗ trợ đa ngôn ngữ (i18n)

## 📞 Support

Nếu có vấn đề, hãy liên hệ:
- Email: support@school.edu
- Hotline: 0292 730 1988
- Help Desk: trong ứng dụng

---

**Cập nhật lần cuối**: 29/01/2026
**Phiên bản**: 1.0.0
