# 📖 Chi Tiết Code Và Luồng Chạy - ViewProfile & UpdateProfile

## 🎯 Tổng Quan

Tính năng ViewProfile (Xem Hồ sơ) và UpdateProfile (Cập nhật Hồ sơ) cho phép sinh viên xem và chỉnh sửa thông tin cá nhân. Luồng hoạt động gồm 3 phần chính:
1. **Frontend** (React - StudentProfilePage.jsx)
2. **Service** (Axios - userService.js)
3. **Backend** (Node.js Express - user.controller.js)

---

## 🔄 Luồng Chạy Tổng Quan

```
┌─────────────────────────────────────────────────────────────────┐
│                      STUDENT PROFILE FEATURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. FRONTEND (React - StudentProfilePage.jsx)          │   │
│  │    - useEffect: fetchStudentProfile()                 │   │
│  │    - handleSaveProfile()                              │   │
│  │    - handleAvatarUploadSuccess()                       │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │ API Call                                │
│  ┌────────────────────▼────────────────────────────────────┐   │
│  │ 2. SERVICE (Axios - userService.js)                   │   │
│  │    - getProfile()   → GET /api/users/profile          │   │
│  │    - updateProfile() → PATCH /api/users/profile       │   │
│  │    - updateAvatar()  → PATCH /api/users/avatar        │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │ HTTP Request                            │
│  ┌────────────────────▼────────────────────────────────────┐   │
│  │ 3. BACKEND (Express - user.controller.js)            │   │
│  │    - getUserProfile()                                  │   │
│  │    - updateProfile()                                   │   │
│  │    - updateAvatar()                                    │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │ Response                                │
│                       ▼                                         │
│                  Store Data                                     │
│                  Update UI                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 PHẦN 1: FRONTEND - StudentProfilePage.jsx

### 1.1 State Management

```javascript
const [student, setStudent] = useState(null);              // Data hồ sơ
const [isEditing, setIsEditing] = useState(false);        // Chế độ edit
const [editFormData, setEditFormData] = useState({         // Dữ liệu form
  fullName: '',
  email: '',
});
const [loading, setLoading] = useState(true);             // Loading state
const [error, setError] = useState(null);                 // Error message
const [successMessage, setSuccessMessage] = useState(''); // Success message
const [isSaving, setIsSaving] = useState(false);          // Saving state
```

**Giải thích**:
- `student`: Lưu trữ thông tin hồ sơ từ API
- `isEditing`: Toggle giữa mode xem và mode chỉnh sửa
- `editFormData`: Lưu giá trị form khi chỉnh sửa
- `loading`: Hiển thị spinner khi tải dữ liệu
- `error`: Hiển thị thông báo lỗi
- `successMessage`: Hiển thị thông báo thành công
- `isSaving`: Vô hiệu hóa button khi đang lưu

### 1.2 useEffect - Fetch Profile Khi Load

```javascript
useEffect(() => {
  fetchStudentProfile();
}, []);

const fetchStudentProfile = async () => {
  try {
    setLoading(true);              // Bật loading
    setError(null);                // Reset lỗi cũ
    
    // Gọi API
    const response = await userService.getProfile();
    
    // Parse response (xử lý nhiều format)
    const studentData = response.data?.data || response.data || response;
    
    if (studentData) {
      // Lưu data vào state
      setStudent(studentData);
      
      // Điền form với data
      setEditFormData({
        fullName: studentData.fullName || '',
        email: studentData.email || '',
      });
    }
  } catch (err) {
    // Xử lý lỗi
    setError('Không thể tải thông tin hồ sơ: ' + (err.response?.data?.message || err.message));
    console.error(err);
  } finally {
    setLoading(false);             // Tắt loading
  }
};
```

**Luồng**:
1. Component mount → useEffect chạy
2. setLoading(true) → Hiển thị spinner
3. Gọi userService.getProfile()
4. Nếu thành công → Lưu data vào state
5. Nếu lỗi → Hiển thị thông báo lỗi
6. setLoading(false) → Ẩn spinner

### 1.3 Chỉnh Sửa Form - handleEditChange

```javascript
const handleEditChange = (e) => {
  const { name, value } = e.target;
  
  // Cập nhật form data khi user nhập
  setEditFormData((prev) => ({
    ...prev,
    [name]: value,  // Cập nhật field cụ thể
  }));
};
```

**Ví dụ**:
```
User nhập "Nguyễn Văn A" vào field fullName
↓
handleEditChange được gọi
↓
setEditFormData({ fullName: "Nguyễn Văn A", email: "..." })
↓
Component re-render với data mới
```

### 1.4 Lưu Profile - handleSaveProfile

```javascript
const handleSaveProfile = async () => {
  try {
    setIsSaving(true);             // Vô hiệu hóa button
    setError(null);                // Reset lỗi cũ
    
    // Gọi API update profile
    const response = await userService.updateProfile(editFormData);
    
    // Parse response
    const studentData = response.data?.data || response.data || response;
    
    if (studentData) {
      // Cập nhật student data
      setStudent(studentData);
      
      // Thoát khỏi edit mode
      setIsEditing(false);
      
      // Hiển thị thông báo thành công
      setSuccessMessage('Hồ sơ được cập nhật thành công!');
      
      // Ẩn thông báo sau 3 giây
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  } catch (err) {
    // Xử lý lỗi
    setError('Cập nhật hồ sơ thất bại: ' + (err.response?.data?.message || err.message));
    console.error(err);
  } finally {
    setIsSaving(false);            // Bật lại button
  }
};
```

**Luồng chi tiết**:
```
User click "Lưu thay đổi"
↓
setIsSaving(true) → Button disabled, hiển thị "Đang lưu..."
↓
userService.updateProfile({fullName: "...", email: "..."})
↓
API Call: PATCH /api/users/profile
↓
Response từ server
│
├─ Thành công (200)
│  ├─ setStudent(newData)
│  ├─ setIsEditing(false)
│  ├─ setSuccessMessage("Thành công!")
│  └─ setTimeout(..., 3000) → Ẩn thông báo
│
└─ Lỗi
   ├─ setError("Lỗi: ...")
   └─ Hiển thị thông báo đỏ

setIsSaving(false) → Bật lại button
```

### 1.5 Avatar Upload Success - handleAvatarUploadSuccess

```javascript
const handleAvatarUploadSuccess = () => {
  // Hiển thị thông báo thành công
  setSuccessMessage('Avatar được cập nhật thành công!');
  
  // Ẩn sau 3 giây
  setTimeout(() => setSuccessMessage(''), 3000);
  
  // Tải lại profile để lấy avatar mới
  fetchStudentProfile();
};
```

**Luồng**:
1. AvatarUploader component upload xong
2. Gọi onUploadSuccess callback
3. Hiển thị thông báo thành công
4. Tải lại fetchStudentProfile() để cập nhật avatar URL

---

## 🔗 PHẦN 2: SERVICE - userService.js

### 2.1 getProfile() - Lấy Thông Tin Hồ Sơ

```javascript
getProfile: () => {
  return axiosClient.get('/users/profile');
  // ↓ Gửi request
  // GET http://localhost:3000/api/users/profile
  // Headers: Authorization: Bearer <JWT_TOKEN>
  // ↓ Nhận response
  // { success: true, data: { _id, fullName, email, ... } }
};
```

**Chi tiết**:
- **Method**: GET
- **URL**: `/users/profile`
- **Header**: JWT token tự động thêm bởi axiosClient
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Nguyễn Văn An",
      "email": "student@example.com",
      "avatarUrl": "https://...",
      "role": "student",
      "status": "active",
      "createdAt": "2024-01-28T...",
      "updatedAt": "2024-01-28T..."
    }
  }
  ```

### 2.2 updateProfile() - Cập Nhật Thông Tin

```javascript
updateProfile: (data) => {
  // data = { fullName: "...", email: "..." }
  return axiosClient.patch('/users/profile', data);
  // ↓ Gửi request
  // PATCH http://localhost:3000/api/users/profile
  // Body: { "fullName": "...", "email": "..." }
  // Headers: Authorization: Bearer <JWT_TOKEN>
  // ↓ Nhận response
  // { success: true, message: "...", data: { ... } }
};
```

**Chi tiết**:
- **Method**: PATCH
- **URL**: `/users/profile`
- **Body**: 
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "email": "new-email@example.com"
  }
  ```
- **Response**: Updated user object

### 2.3 updateAvatar() - Upload Avatar

```javascript
updateAvatar: (file, onUploadProgress) => {
  // file = File object từ input[type="file"]
  const formData = new FormData();
  formData.append('avatar', file);  // Thêm file vào FormData
  
  return axiosClient.patch('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onUploadProgress,  // Callback progress
  });
  // ↓ Gửi request
  // PATCH http://localhost:3000/api/users/avatar
  // Body: multipart/form-data (file binary)
  // Headers: Authorization: Bearer <JWT_TOKEN>
  // ↓ Nhận response
  // { success: true, message: "...", data: { avatarUrl: "..." } }
};
```

**Chi tiết**:
- **Method**: PATCH
- **URL**: `/users/avatar`
- **Content-Type**: multipart/form-data
- **onUploadProgress**: Callback để tracking tiến độ (0-100%)

---

## ⚙️ PHẦN 3: BACKEND - user.controller.js

### 3.1 getUserProfile() - GET /api/users/profile

```javascript
exports.getUserProfile = async (req, res) => {
  try {
    // 1. Lấy userId từ JWT token
    const userId = req.auth.id || req.auth.sub;
    
    // 2. Tìm user trong database, exclude password
    const user = await User.findById(userId).select('-password');

    // 3. Nếu user không tồn tại
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 4. Trả về user data
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    // 5. Xử lý lỗi server
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

**Luồng chi tiết**:
```
GET /api/users/profile + JWT Token
↓
[1] middleware auth.middleware → Validate token, set req.auth
↓
[2] getUserProfile() được gọi
↓
[3] Lấy userId từ token: req.auth.id
↓
[4] Query MongoDB: User.findById(userId)
│   ├─ .select('-password') → Exclude password field
│   └─ Nếu tìm thấy → return user object
│   └─ Nếu không tìm → null
↓
[5] Kiểm tra user
│   ├─ Nếu không tồn tại → return 404 error
│   └─ Nếu tồn tại → tiếp tục
↓
[6] Trả về response
│   {
│     "success": true,
│     "data": {
│       "_id": "...",
│       "fullName": "...",
│       "email": "...",
│       "avatarUrl": "...",
│       "role": "student",
│       "status": "active",
│       "createdAt": "...",
│       "updatedAt": "..."
│     }
│   }
↓
[7] Frontend nhận response, lưu vào state
```

### 3.2 updateProfile() - PATCH /api/users/profile

```javascript
exports.updateProfile = async (req, res) => {
  try {
    // 1. Lấy dữ liệu từ request body
    const { fullName, email } = req.body;
    // fullName: "Nguyễn Văn A"
    // email: "new-email@example.com"
    
    // 2. Lấy userId từ JWT token
    const userId = req.auth.id || req.auth.sub;
    
    // 3. Tìm user trong database
    const user = await User.findById(userId);

    // 4. Nếu user không tồn tại
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 5. Cập nhật fullName nếu có
    if (fullName) user.fullName = fullName;
    
    // 6. Cập nhật email nếu có (với kiểm tra duplicate)
    if (email && email !== user.email) {
      // Kiểm tra email đã được dùng bởi user khác
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
      user.email = email;
    }

    // 7. Cập nhật metadata
    user.updatedBy = req.auth.id || req.auth.sub;
    
    // 8. Lưu user vào database
    await user.save();

    // 9. Trả về response
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    // 10. Xử lý lỗi server
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

**Luồng chi tiết**:
```
PATCH /api/users/profile + JWT Token + Body
│
├─ Body: { fullName: "...", email: "..." }
│
↓
[1] middleware auth.middleware → Validate token
↓
[2] updateProfile() được gọi
↓
[3] Extract dữ liệu: const { fullName, email } = req.body
↓
[4] Lấy userId từ token
↓
[5] Query MongoDB: User.findById(userId)
↓
[6] Nếu user không tồn tại → return 404
↓
[7] Cập nhật fullName (nếu có)
│   user.fullName = fullName
↓
[8] Cập nhật email (nếu có và khác cũ)
│   ├─ Check duplicate: User.findOne({ email })
│   ├─ Nếu email đã dùng → return 400 error
│   └─ Nếu không → user.email = email
↓
[9] Cập nhật updatedBy timestamp
│   user.updatedBy = userId
│   user.updatedAt = (tự động)
↓
[10] Lưu vào database: await user.save()
↓
[11] Trả về response
│    {
│      "success": true,
│      "message": "Profile updated successfully",
│      "data": { ... updated user object ... }
│    }
↓
[12] Frontend nhận response, cập nhật UI
```

### 3.3 updateAvatar() - PATCH /api/users/avatar

```javascript
exports.updateAvatar = async (req, res) => {
  try {
    // 1. Kiểm tra file có được upload không
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // 2. Lấy userId từ JWT token
    const userId = req.auth.id || req.auth.sub;
    
    // 3. Tìm user trong database
    const user = await User.findById(userId);

    // 4. Nếu user không tồn tại
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 5. Xóa avatar cũ từ Cloudinary (nếu có)
    if (user.avatarUrl && user.avatarCloudinaryId) {
      try {
        await deleteImage(user.avatarCloudinaryId);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error.message);
      }
    }

    // 6. Upload avatar mới lên Cloudinary
    const uploadResult = await uploadImage(req.file.buffer, {
      folder: 'ssms/avatars',           // Folder trong Cloudinary
      resource_type: 'auto',            // Auto-detect type
      format: 'webp',                   // Convert to WebP
      quality: 'auto',                  // Auto optimize quality
      width: 400,                       // Resize to 400px
      height: 400,                      // Resize to 400px
      crop: 'fill',                     // Crop to fill
    });
    // uploadResult: { secure_url: "https://...", public_id: "..." }

    // 7. Cập nhật user avatar URL
    user.avatarUrl = uploadResult.secure_url;
    user.avatarCloudinaryId = uploadResult.public_id;

    // 8. Lưu user vào database
    await user.save();

    // 9. Trả về response
    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    // 10. Xử lý lỗi server
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

**Luồng chi tiết**:
```
PATCH /api/users/avatar + JWT Token + File (multipart/form-data)
│
├─ File: image.webp (binary)
│
↓
[1] middleware avatarUpload.middleware
│   └─ Multer: Parse file từ form-data vào req.file
│      req.file = { 
│        fieldname: "avatar",
│        originalname: "image.webp",
│        buffer: <Buffer>,
│        ...
│      }
↓
[2] auth.middleware → Validate token
↓
[3] updateAvatar() được gọi
↓
[4] Kiểm tra file: if (!req.file) → 400 error
↓
[5] Lấy userId từ token
↓
[6] Query MongoDB: User.findById(userId)
↓
[7] Nếu user không tồn tại → 404 error
↓
[8] Xóa avatar cũ (optional)
│   ├─ Nếu có avatarUrl && avatarCloudinaryId
│   └─ Gọi deleteImage(public_id)
│   └─ Xóa từ Cloudinary
↓
[9] Upload avatar mới lên Cloudinary
│   ├─ uploadImage(file.buffer, options)
│   ├─ Cloudinary URL-safe conversion
│   ├─ Resize 400x400px
│   ├─ Convert to WebP (compress)
│   └─ Return: { secure_url, public_id }
↓
[10] Cập nhật user object
│    ├─ user.avatarUrl = "https://res.cloudinary.com/..."
│    └─ user.avatarCloudinaryId = "ssms/avatars/xxxxx"
↓
[11] Lưu vào database: await user.save()
│    └─ updatedAt tự động cập nhật
↓
[12] Trả về response
│    {
│      "success": true,
│      "message": "Avatar updated successfully",
│      "data": {
│        "avatarUrl": "https://res.cloudinary.com/..."
│      }
│    }
↓
[13] Frontend nhận response, cập nhật avatar display
```

---

## 🔐 Routes Configuration - user.routes.js

```javascript
// ⚠️ QUAN TRỌNG: Thứ tự route rất quan trọng!

// GET /users/profile → router.get('/profile', ...)
// PHẢI nằm TRƯỚC router.get('/:userId', ...)
// Vì nếu không, '/profile' sẽ bị match bởi '/:userId'
router.get('/profile', authMiddleware, userController.getUserProfile);

// PATCH /users/profile → router.patch('/profile', ...)
// PHẢI nằm TRƯỚC router.patch('/:userId', ...)
router.patch('/profile', authMiddleware, userController.updateProfile);

// PATCH /users/avatar → router.patch('/avatar', ...)
// PHẢI nằm TRƯỚC router.patch('/:userId', ...)
router.patch('/avatar', authMiddleware, upload.single('avatar'), userController.updateAvatar);

// GET /users/:userId → Generic route
router.get('/:userId', ...);

// PATCH /users/:userId → Update user by admin
router.patch('/:userId', ...);
```

**Tại sao thứ tự quan trọng?**
```
Route matching từ trên xuống dưới.
Nếu:
  router.get('/:userId', ...) // Trước
  router.get('/profile', ...) // Sau

Thì khi access /profile:
  - Nó sẽ match '/:userId' với userId = 'profile'
  - Không bao giờ chạy đến route '/profile'
  
Solution: Đặt specific routes (/profile) trước generic routes (/:userId)
```

---

## 📊 Data Flow Diagram

```
SCENARIO 1: Lần đầu Load Profile
═════════════════════════════════

1. Component Mount
   └─ useEffect → fetchStudentProfile()

2. Frontend (StudentProfilePage.jsx)
   ├─ setLoading(true)
   ├─ userService.getProfile()
   └─ setLoading(false)

3. Service (userService.js)
   ├─ axiosClient.get('/users/profile')
   └─ Return Promise

4. HTTP Request
   ├─ GET http://localhost:3000/api/users/profile
   ├─ Headers: { Authorization: "Bearer <token>" }
   └─ Send to server

5. Backend (user.controller.js)
   ├─ authMiddleware → Validate JWT
   ├─ getUserProfile()
   ├─ User.findById(userId).select('-password')
   ├─ return { success: true, data: user }
   └─ Send to client

6. Frontend receives response
   ├─ setStudent(data)
   ├─ setEditFormData({ fullName, email })
   ├─ Component re-renders
   └─ Display user info


SCENARIO 2: Edit & Save Profile
════════════════════════════════

1. User click "Chỉnh sửa hồ sơ"
   └─ setIsEditing(true)

2. User nhập dữ liệu mới
   ├─ fullName: "Nguyễn Văn B"
   ├─ email: "new@example.com"
   └─ handleEditChange() → setEditFormData()

3. User click "Lưu thay đổi"
   └─ handleSaveProfile()

4. Frontend (StudentProfilePage.jsx)
   ├─ setIsSaving(true) → Disable button
   ├─ userService.updateProfile({ fullName, email })
   └─ setIsSaving(false) → Enable button

5. Service (userService.js)
   ├─ axiosClient.patch('/users/profile', data)
   └─ Return Promise

6. HTTP Request
   ├─ PATCH http://localhost:3000/api/users/profile
   ├─ Headers: { Authorization: "Bearer <token>" }
   ├─ Body: { fullName: "...", email: "..." }
   └─ Send to server

7. Backend (user.controller.js)
   ├─ authMiddleware → Validate JWT
   ├─ updateProfile()
   ├─ User.findById(userId)
   ├─ Check email duplicate
   ├─ user.fullName = newFullName
   ├─ user.email = newEmail
   ├─ await user.save()
   ├─ return { success: true, data: updatedUser }
   └─ Send to client

8. Frontend receives response
   ├─ setStudent(newData)
   ├─ setIsEditing(false) → Exit edit mode
   ├─ setSuccessMessage("Thành công!")
   ├─ setTimeout(...) → Auto-hide message after 3s
   └─ Component re-renders with new data


SCENARIO 3: Upload Avatar
══════════════════════════

1. User click edit button on avatar
   └─ Open file picker

2. User select image file
   └─ AvatarUploader.jsx handleFileSelect()

3. Image upload process
   ├─ Preview image
   ├─ Show crop dialog
   └─ User confirm crop

4. Frontend (AvatarUploader.jsx)
   ├─ setUploadProgress(0)
   ├─ userService.updateAvatar(file, onUploadProgress)
   └─ onUploadProgress callback → Update progress bar

5. Service (userService.js)
   ├─ new FormData()
   ├─ formData.append('avatar', file)
   ├─ axiosClient.patch('/users/avatar', formData, {
   │  onUploadProgress: (event) => {
   │    const percent = (event.loaded / event.total) * 100
   │    onUploadProgress(percent)
   │  }
   ├─ Return Promise
   └─ Frontend progress bar: 0% → 100%

6. HTTP Request (multipart/form-data)
   ├─ PATCH http://localhost:3000/api/users/avatar
   ├─ Headers: { Authorization: "Bearer <token>" }
   ├─ Body: FormData { avatar: <File> }
   └─ Upload file to server

7. Backend (user.controller.js)
   ├─ avatarUpload.middleware (multer)
   │  └─ Parse file từ FormData vào req.file
   ├─ authMiddleware → Validate JWT
   ├─ updateAvatar()
   ├─ deleteImage(oldAvatarId) → Delete from Cloudinary
   ├─ uploadImage(file.buffer, options) → Upload to Cloudinary
   │  ├─ Convert to WebP
   │  ├─ Resize 400x400px
   │  └─ Return URL
   ├─ user.avatarUrl = newURL
   ├─ user.avatarCloudinaryId = newId
   ├─ await user.save()
   ├─ return { success: true, data: { avatarUrl: "..." } }
   └─ Send to client

8. Frontend receives response
   ├─ AvatarUploader: setUploadProgress(100)
   ├─ onUploadSuccess callback
   ├─ setSuccessMessage("Avatar updated!")
   ├─ fetchStudentProfile() → Reload profile
   └─ Display new avatar
```

---

## 🔑 Key Concepts

### 1. JWT Authentication

```javascript
// Frontend gửi token ở header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Backend kiểm tra & extract info
const token = req.headers.authorization.split(' ')[1]
const decoded = jwt.verify(token, SECRET_KEY)
const userId = decoded.id
```

### 2. Password Excluded

```javascript
// Khi fetch profile, password KHÔNG được gửi
.select('-password')
// Dấu '-' có nghĩa exclude field này
```

### 3. Email Duplicate Check

```javascript
// Trước khi update email, check xem đã tồn tại chưa
if (email && email !== user.email) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already in use' });
  }
}
```

### 4. Cloudinary Integration

```javascript
// Upload to Cloudinary with optimization
uploadImage(file.buffer, {
  folder: 'ssms/avatars',     // Organize in folders
  resource_type: 'auto',       // Auto-detect type
  format: 'webp',              // Modern format
  quality: 'auto',             // Auto-optimize quality
  width: 400,                  // Resize
  height: 400,                 // Square image
  crop: 'fill',                // Fill the square
});

// Old avatar cleanup
deleteImage(oldPublicId)  // Delete from Cloudinary
```

### 5. Error Handling

```javascript
// Status codes:
// 200 - Success
// 400 - Bad request (email duplicate, no file)
// 404 - User not found
// 500 - Server error

// Response format:
{
  success: true/false,
  message: "...",
  data: { ... }
}
```

---

## 📋 Request/Response Examples

### Example 1: GET /api/users/profile

**Request**:
```
GET http://localhost:3000/api/users/profile
Headers: {
  Authorization: "Bearer eyJhbGc..."
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Nguyễn Văn An",
    "email": "student@example.com",
    "avatarUrl": "https://res.cloudinary.com/...",
    "avatarCloudinaryId": "ssms/avatars/abc123",
    "role": "student",
    "status": "active",
    "createdAt": "2024-01-28T10:20:00Z",
    "updatedAt": "2024-01-28T10:20:00Z"
  }
}
```

**Response (404)**:
```json
{
  "success": false,
  "message": "User not found"
}
```

### Example 2: PATCH /api/users/profile

**Request**:
```
PATCH http://localhost:3000/api/users/profile
Headers: {
  Authorization: "Bearer eyJhbGc...",
  Content-Type: "application/json"
}
Body: {
  "fullName": "Nguyễn Văn B",
  "email": "new-email@example.com"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Nguyễn Văn B",
    "email": "new-email@example.com",
    "updatedAt": "2024-01-29T15:30:00Z"
  }
}
```

**Response (400) - Email already exists**:
```json
{
  "success": false,
  "message": "Email already in use"
}
```

### Example 3: PATCH /api/users/avatar

**Request**:
```
PATCH http://localhost:3000/api/users/avatar
Headers: {
  Authorization: "Bearer eyJhbGc...",
  Content-Type: "multipart/form-data"
}
Body: FormData {
  avatar: <File: image.webp>
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/abc/image/upload/w_400,h_400,f_webp,q_auto/ssms/avatars/xyz789.webp"
  }
}
```

**Response (400) - No file**:
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

---

## 🎯 Summary

| Chức năng | Method | URL | Request | Response |
|-----------|--------|-----|---------|----------|
| **View Profile** | GET | `/users/profile` | JWT token | User object |
| **Update Profile** | PATCH | `/users/profile` | fullName, email | Updated user |
| **Upload Avatar** | PATCH | `/users/avatar` | File (multipart) | avatarUrl |

Tất cả các endpoint đều yêu cầu JWT token và xử lý lỗi toàn diện.

---

**Last Updated**: 29/01/2026  
**Version**: 1.0.0
