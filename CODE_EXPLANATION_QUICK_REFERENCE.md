# 🎓 CODE EXPLANATION QUICK REFERENCE

## 📍 File Locations

| Component | File | Purpose |
|-----------|------|---------|
| **Frontend** | `frontend-web/src/pages/StudentProfilePage.jsx` | Main UI & logic |
| **Service** | `frontend-web/src/services/userService.js` | API client |
| **Backend** | `backend-api/src/controllers/user.controller.js` | Business logic |
| **Routes** | `backend-api/src/routes/user.routes.js` | Endpoint definitions |
| **Middleware** | `backend-api/src/middlewares/auth.middleware.js` | JWT validation |

---

## 🔑 Key Functions

### Frontend (StudentProfilePage.jsx)

```javascript
// ============ FETCH PROFILE ============
fetchStudentProfile()
- Gọi: userService.getProfile()
- API: GET /api/users/profile
- Kết quả: Lưu vào state.student
- Lỗi: Hiển thị error message
- Hiển thị: spinner lúc loading

// ============ EDIT FORM ============
handleEditChange(e)
- Cập nhật editFormData khi user nhập
- field name và value từ input event

// ============ SAVE PROFILE ============
handleSaveProfile()
- Gọi: userService.updateProfile(editFormData)
- API: PATCH /api/users/profile
- Body: { fullName: "...", email: "..." }
- Kết quả: Cập nhật student, thoát edit mode
- Lỗi: Hiển thị error message
- Thành công: Hiển thị success toast

// ============ AVATAR SUCCESS ============
handleAvatarUploadSuccess()
- Gọi: fetchStudentProfile() để reload data
- Hiển thị: "Avatar updated" message
```

### Service (userService.js)

```javascript
// ============ GET PROFILE ============
getProfile()
- GET /users/profile
- Header: JWT token (tự động)
- Response: { success: true, data: user }

// ============ UPDATE PROFILE ============
updateProfile(data)
- PATCH /users/profile
- Body: { fullName, email }
- Response: { success: true, data: updatedUser }

// ============ UPDATE AVATAR ============
updateAvatar(file, onUploadProgress)
- PATCH /users/avatar
- Body: FormData { avatar: file }
- Callback: onUploadProgress (0-100%)
- Response: { success: true, data: { avatarUrl } }
```

### Backend (user.controller.js)

```javascript
// ============ GET USER PROFILE ============
getUserProfile(req, res)
1. Lấy userId từ JWT token: req.auth.id
2. Tìm user: User.findById(userId).select('-password')
3. Kiểm tra user tồn tại
4. Return: { success: true, data: user }

// ============ UPDATE PROFILE ============
updateProfile(req, res)
1. Lấy { fullName, email } từ req.body
2. Lấy userId từ JWT token
3. Tìm user: User.findById(userId)
4. Cập nhật: user.fullName = fullName
5. Nếu email thay đổi:
   - Check duplicate: User.findOne({ email })
   - Nếu tồn tại: Return 400 error
   - Nếu không: user.email = email
6. Lưu: await user.save()
7. Return: { success: true, data: updatedUser }

// ============ UPDATE AVATAR ============
updateAvatar(req, res)
1. Kiểm tra file: if (!req.file) return 400
2. Lấy userId từ JWT token
3. Tìm user: User.findById(userId)
4. Xóa avatar cũ: deleteImage(avatarCloudinaryId)
5. Upload mới: uploadImage(file.buffer, options)
   - Resize: 400x400px
   - Format: WebP
   - Quality: Auto
   - Folder: ssms/avatars
6. Cập nhật: user.avatarUrl, user.avatarCloudinaryId
7. Lưu: await user.save()
8. Return: { success: true, data: { avatarUrl } }
```

---

## 🔄 Data Flow (Step by Step)

### View Profile
```
1. Component mount
2. useEffect → fetchStudentProfile()
3. userService.getProfile()
4. Axios GET /api/users/profile
5. Backend: User.findById() → select('-password')
6. Return response
7. Frontend: setStudent(data)
8. UI updates with user info
```

### Edit Profile
```
1. User click "Chỉnh sửa"
2. setIsEditing(true) → Show form
3. User type → handleEditChange() → setEditFormData()
4. User click "Lưu"
5. setIsSaving(true) → Disable button
6. userService.updateProfile(editFormData)
7. Axios PATCH /api/users/profile
8. Backend: Check duplicate, update, save
9. Return response
10. setIsEditing(false) → Hide form
11. setStudent(newData) → Update UI
12. Show success toast
```

### Upload Avatar
```
1. User click edit on avatar
2. Show crop dialog
3. User crop image
4. userService.updateAvatar(croppedFile)
5. Axios PATCH /api/users/avatar (FormData)
6. Show progress bar (0-100%)
7. Backend: Delete old, upload new to Cloudinary
8. Return new avatarUrl
9. fetchStudentProfile() → Reload profile
10. Display new avatar
```

---

## 🛡️ Error Handling

| Scenario | Error | Response | Frontend |
|----------|-------|----------|----------|
| Network fail | Network error | None | Show error message |
| User not found | 404 | { success: false, message: "User not found" } | Show error |
| Email duplicate | 400 | { success: false, message: "Email already in use" } | Show error in form |
| No file | 400 | { success: false, message: "No file uploaded" } | Show alert |
| Server error | 500 | { success: false, message: "..." } | Show error message |

---

## 📋 API Endpoints

| Method | URL | Purpose | Auth |
|--------|-----|---------|------|
| GET | `/api/users/profile` | Get current user profile | JWT ✓ |
| PATCH | `/api/users/profile` | Update profile (name, email) | JWT ✓ |
| PATCH | `/api/users/avatar` | Upload avatar | JWT ✓ |

---

## 💾 Database Changes

### User Model Fields

```javascript
// Updated fields after profile operations:
{
  fullName: "Updated Name",      // Changed by updateProfile
  email: "updated@email.com",    // Changed by updateProfile
  avatarUrl: "https://...",      // Changed by updateAvatar
  avatarCloudinaryId: "id...",   // Changed by updateAvatar
  updatedAt: "2024-01-29...",    // Auto-updated
  updatedBy: "userId..."         // Set by backend
}
```

---

## 🎯 Frontend State Variables

```javascript
student                // Full user object from API
isEditing              // true = show form, false = show view
editFormData           // { fullName: "...", email: "..." }
loading                // true = show spinner
error                  // error message string
successMessage         // success message string
isSaving               // true = disable save button
```

---

## 🔐 Security & Validation

| Check | Location | Action |
|-------|----------|--------|
| JWT Token | auth.middleware | Validate & extract userId |
| Password Exclude | Backend | .select('-password') |
| Email Duplicate | Backend updateProfile | Check before update |
| File Exists | Backend updateAvatar | Check req.file |
| CORS | Server | Allow frontend domain |

---

## 📊 Response Examples

### Success - Get Profile
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Nguyễn Văn An",
    "email": "student@example.com",
    "avatarUrl": "https://res.cloudinary.com/...",
    "role": "student",
    "status": "active",
    "createdAt": "2024-01-28T10:20:00Z",
    "updatedAt": "2024-01-28T15:30:00Z"
  }
}
```

### Success - Update Profile
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Nguyễn Văn B",
    "email": "new@example.com",
    "updatedAt": "2024-01-29T10:20:00Z"
  }
}
```

### Success - Upload Avatar
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/abc/image/upload/.../avatar.webp"
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Email already in use"
}
```

---

## 🧪 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Profile not loading | Network error | Check backend running |
| Token invalid | Expired JWT | Re-login |
| Email error | Already in use | Use different email |
| Avatar not updating | Upload failed | Check file size < 10MB |
| Changes not saved | 400/500 error | Check error message |
| Spinner infinite | API hang | Check network |

---

## 📝 Testing Checklist

- [ ] Load profile page
- [ ] Display user info correctly
- [ ] Edit fullName
- [ ] Edit email
- [ ] Save with valid data
- [ ] Get error on duplicate email
- [ ] Cancel edit without saving
- [ ] Upload avatar with crop
- [ ] Progress bar shows
- [ ] New avatar displays
- [ ] Success messages show
- [ ] Error messages show
- [ ] Mobile responsive
- [ ] Logout still works

---

## 🔗 Related Documents

See detailed explanation in:
- **CODE_FLOW_VIEWPROFILE_UPDATEPROFILE_DETAILED.md** - Full code walkthrough
- **VISUAL_CODE_FLOW_DIAGRAMS.md** - ASCII flow diagrams
- **STUDENT_VIEW_PROFILE_GUIDE.md** - Complete API docs

---

**Quick Reference Created**: 29/01/2026  
**Version**: 1.0.0
