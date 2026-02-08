# 📖 GIẢI THÍCH CODE - Chức Năng View Profile Của Student

## 1. TỔNG QUAN CẤU TRÚC

Tính năng Student View Profile gồm **3 phần chính**:

```
┌─────────────────────────────────────────────────┐
│         StudentProfilePage.jsx (Frontend)       │
│  - Trang chính hiển thị toàn bộ profile        │
│  - Quản lý state, fetch dữ liệu                │
│  - Logic chỉnh sửa profile                     │
└─────────────────────────────────────────────────┘
           ↓                            ↓
┌──────────────────────┐   ┌──────────────────────┐
│  AvatarUploader.jsx  │   │   userService.js     │
│  - Upload avatar     │   │  - API client        │
│  - Crop ảnh          │   │  - HTTP requests     │
│  - Progress bar      │   │  - Error handling    │
└──────────────────────┘   └──────────────────────┘
```

---

## 2. FILE CHÍNH: StudentProfilePage.jsx

### 📍 Vị trí: `frontend-web/src/pages/StudentProfilePage.jsx`

### A. KHAI BÁO STATE VÀ BIẾN

```javascript
const StudentProfilePage = () => {
  // Lưu trữ dữ liệu sinh viên từ API
  const [student, setStudent] = useState(null);
  
  // Trạng thái chỉnh sửa (edit mode on/off)
  const [isEditing, setIsEditing] = useState(false);
  
  // Dữ liệu form khi chỉnh sửa
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
  });
  
  // Trạng thái đang tải
  const [loading, setLoading] = useState(true);
  
  // Thông báo lỗi
  const [error, setError] = useState(null);
  
  // Thông báo thành công
  const [successMessage, setSuccessMessage] = useState('');
  
  // Trạng thái đang lưu
  const [isSaving, setIsSaving] = useState(false);
  
  // Mock data - Danh sách khóa học
  const enrolledCourses = [ ... ];
}
```

### B. HOOK useEffect - TẢI DỮ LIỆU LẦN ĐẦU

```javascript
useEffect(() => {
  // Khi component mount → fetch profile
  fetchStudentProfile();
}, []);  // Dependency array trống = chạy 1 lần khi component load
```

**Giải thích:**
- `useEffect` chạy **1 lần duy nhất** khi component được tải
- Gọi hàm `fetchStudentProfile()` để lấy dữ liệu

---

### C. HÀM FETCH DỮ LIỆU: `fetchStudentProfile()`

```javascript
const fetchStudentProfile = async () => {
  try {
    // 1. Set loading = true để hiển thị spinner
    setLoading(true);
    setError(null);
    
    // 2. Gọi API để lấy profile
    const response = await userService.getProfile();
    
    // 3. Xử lý response (có thể có nhiều format khác nhau)
    const studentData = response.data?.data || response.data || response;
    
    // 4. Nếu có dữ liệu → lưu vào state
    if (studentData) {
      setStudent(studentData);  // Lưu dữ liệu chính
      
      // Lưu vào editFormData để sử dụng khi chỉnh sửa
      setEditFormData({
        fullName: studentData.fullName || '',
        email: studentData.email || '',
      });
    }
  } catch (err) {
    // 5. Nếu lỗi → hiển thị thông báo
    setError('Không thể tải thông tin hồ sơ: ' + err.message);
    console.error(err);
  } finally {
    // 6. Hoàn thành → set loading = false
    setLoading(false);
  }
};
```

**Quy trình:**
```
START
  ↓
Set loading = true (hiển thị spinner)
  ↓
Gọi API: GET /api/users/profile
  ↓
Nếu thành công:
  → Lưu dữ liệu vào student state
  → Sao chép vào editFormData
  
Nếu thất bại:
  → Lưu error message
  
Cuối cùng:
  → Set loading = false (ẩn spinner)
  ↓
END
```

---

### D. HÀM XỬ LÝ AVATAR: `handleAvatarUploadSuccess()`

```javascript
const handleAvatarUploadSuccess = () => {
  // 1. Hiển thị thông báo thành công
  setSuccessMessage('Avatar được cập nhật thành công!');
  
  // 2. Sau 3 giây → tự động ẩn thông báo
  setTimeout(() => setSuccessMessage(''), 3000);
  
  // 3. Tải lại dữ liệu profile từ API
  fetchStudentProfile();  // Cập nhật avatar mới
};
```

**Mục đích:**
- Được gọi từ component `AvatarUploader` khi upload thành công
- Cập nhật avatar hiển thị trên trang ngay lập tức

---

### E. HÀM CHỈNH SỬA: `handleEditChange()`

```javascript
const handleEditChange = (e) => {
  // Lấy name và value từ input
  const { name, value } = e.target;
  
  // Cập nhật editFormData khi user nhập
  setEditFormData((prev) => ({
    ...prev,           // Giữ dữ liệu cũ
    [name]: value,    // Cập nhật field mới
  }));
};
```

**Ví dụ:**
```
User nhập tên mới: "Nguyễn Văn B"
  ↓
Input trigger onChange event
  ↓
handleEditChange được gọi
  ↓
editFormData.fullName = "Nguyễn Văn B"
  ↓
Component re-render → input hiển thị giá trị mới
```

---

### F. HÀM LƯU PROFILE: `handleSaveProfile()`

```javascript
const handleSaveProfile = async () => {
  try {
    // 1. Set trạng thái đang lưu
    setIsSaving(true);
    setError(null);
    
    // 2. Gọi API UPDATE
    const response = await userService.updateProfile(editFormData);
    
    // 3. Xử lý response
    const studentData = response.data?.data || response.data || response;
    
    // 4. Nếu thành công:
    if (studentData) {
      setStudent(studentData);        // Cập nhật dữ liệu hiển thị
      setIsEditing(false);            // Thoát edit mode
      setSuccessMessage('Hồ sơ được cập nhật thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  } catch (err) {
    // 5. Nếu lỗi → hiển thị error
    setError('Cập nhật hồ sơ thất bại: ' + err.message);
    console.error(err);
  } finally {
    // 6. Kết thúc → set saving = false
    setIsSaving(false);
  }
};
```

**Quy trình lưu:**
```
Click "Save Changes"
  ↓
handleSaveProfile() được gọi
  ↓
Set isSaving = true (button disable)
  ↓
Gọi API: PATCH /api/users/profile
Body: { fullName: "...", email: "..." }
  ↓
Nếu thành công:
  → Cập nhật student state
  → Thoát edit mode
  → Hiển thị success toast
  
Nếu thất bại:
  → Hiển thị error message
  
Cuối cùng:
  → Set isSaving = false
```

---

## 3. COMPONENT: AvatarUploader.jsx

### 📍 Vị trí: `frontend-web/src/components/features/AvatarUploader.jsx`

### A. STATE CỦA AVATAR UPLOADER

```javascript
const AvatarUploader = ({ currentAvatar, onUploadSuccess }) => {
  // Props nhận vào:
  // - currentAvatar: URL avatar hiện tại
  // - onUploadSuccess: Callback khi upload thành công
  
  const [uploadProgress, setUploadProgress] = useState(0);    // 0-100%
  const [isUploading, setIsUploading] = useState(false);      // Đang upload?
  const [cropImage, setCropImage] = useState(null);           // Ảnh cần crop
  const [showCropDialog, setShowCropDialog] = useState(false); // Hiển thị dialog?
  
  const fileInputRef = useRef(null);   // Reference tới input file
  const canvasRef = useRef(null);      // Reference tới canvas (crop)
}
```

---

### B. HÀM CHỌN FILE: `handleFileSelect()`

```javascript
const handleFileSelect = (event) => {
  // 1. Lấy file từ input
  const file = event.target.files?.[0];
  if (!file) return;  // Nếu không có file → exit

  // 2. Đọc file dưới dạng Data URL (base64)
  const reader = new FileReader();
  reader.onload = (e) => {
    // 3. Lưu ảnh vào state để hiển thị crop dialog
    setCropImage({
      src: e.target.result,  // Base64 string
      file: file,            // File object
    });
    setShowCropDialog(true);  // Mở dialog crop
  };
  reader.readAsDataURL(file);
};
```

**Quy trình:**
```
User click edit button
  ↓
Mở file dialog
  ↓
User chọn file
  ↓
handleFileSelect() được gọi
  ↓
Đọc file thành base64
  ↓
Hiển thị crop dialog
```

---

### C. HÀM CẮT ẢNH: `handleCropChange()` & `handleCropConfirm()`

```javascript
const handleCropChange = (event) => {
  const canvas = canvasRef.current;
  if (!canvas || !cropImage) return;

  // 1. Lấy canvas context để vẽ
  const ctx = canvas.getContext('2d');
  
  // 2. Tạo Image object từ base64
  const img = new Image();
  img.onload = () => {
    // 3. Tính kích thước hình vuông (size = min(width, height))
    const size = Math.min(img.width, img.height);
    
    // 4. Tính vị trí crop để lấy phần giữa
    const x = (img.width - size) / 2;
    const y = (img.height - size) / 2;

    // 5. Set canvas size = size hình vuông
    canvas.width = size;
    canvas.height = size;
    
    // 6. Vẽ phần giữa của ảnh lên canvas
    ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
  };
  img.src = cropImage.src;  // Load ảnh từ base64
};

const handleCropConfirm = async () => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // 1. Convert canvas thành blob (WebP format)
  canvas.toBlob(async (blob) => {
    // 2. Tạo File object từ blob
    const croppedFile = new File([blob], 'avatar.webp', { 
      type: 'image/webp' 
    });
    
    // 3. Upload file
    await uploadAvatar(croppedFile);
    
    // 4. Đóng dialog và reset
    setShowCropDialog(false);
    setCropImage(null);
  }, 'image/webp', 0.9);  // Quality = 0.9 (90%)
};
```

**Hình ảnh crop process:**
```
Ảnh gốc: 800x600
  ↓
Tính size = min(800, 600) = 600
  ↓
Tính x = (800-600)/2 = 100
Tính y = (600-600)/2 = 0
  ↓
Vẽ từ (100, 0) kích thước 600x600 lên canvas
  ↓
Kết quả: Ảnh vuông 600x600 từ phần giữa
```

---

### D. HÀM UPLOAD: `uploadAvatar()`

```javascript
const uploadAvatar = async (file) => {
  try {
    // 1. Set trạng thái đang upload
    setIsUploading(true);
    setUploadProgress(0);

    // 2. Gọi API upload với progress callback
    await userService.updateAvatar(file, (progressEvent) => {
      // Tính phần trăm: (đã upload / tổng cộng) * 100
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setUploadProgress(percentCompleted);  // 0 → 100%
    });

    // 3. Upload xong → set 100%
    setUploadProgress(100);
    
    // 4. Chờ 0.5 giây → gọi callback success
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      if (onUploadSuccess) {
        onUploadSuccess();  // Callback từ parent
      }
    }, 500);
  } catch (error) {
    // 5. Nếu lỗi → reset state
    console.error('Upload failed:', error);
    setIsUploading(false);
    setUploadProgress(0);
    alert('Upload failed: ' + error.message);
  }
};
```

**Quy trình upload:**
```
Confirm crop
  ↓
uploadAvatar() được gọi
  ↓
Set isUploading = true
  ↓
Gọi API: PATCH /api/users/avatar
Body: FormData { avatar: file }
  ↓
Progress event:
  ↓ (0%)
  ↓ (25%)
  ↓ (50%)
  ↓ (75%)
  ↓ (100%)
  ↓
Chờ 500ms
  ↓
Gọi onUploadSuccess() callback
  ↓
Parent component (StudentProfilePage) nhận được signal
  ↓
Gọi fetchStudentProfile() để reload avatar
```

---

## 4. SERVICE: userService.js

### 📍 Vị trí: `frontend-web/src/services/userService.js`

### A. HÀM GET PROFILE

```javascript
getProfile: () => {
  return axiosClient.get('/users/profile');
}
```

**API Call:**
```
GET /api/users/profile
Headers: { Authorization: "Bearer TOKEN" }

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "email": "student@example.com",
    "fullName": "Nguyễn Văn An",
    "avatarUrl": "https://res.cloudinary.com/...",
    "role": "student",
    "status": "active"
  }
}
```

---

### B. HÀM UPDATE AVATAR

```javascript
updateAvatar: (file, onUploadProgress) => {
  // 1. Tạo FormData object
  const formData = new FormData();
  formData.append('avatar', file);  // Thêm file

  // 2. Gọi API PATCH với tracking progress
  return axiosClient.patch('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',  // Không cần set khi upload file
    },
    onUploadProgress: onUploadProgress,  // Callback: { loaded, total }
  });
}
```

**API Call:**
```
PATCH /api/users/avatar
Headers: {
  Authorization: "Bearer TOKEN",
  Content-Type: "multipart/form-data"
}
Body: FormData { avatar: File }

Response:
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/..."
  }
}
```

---

### C. HÀM UPDATE PROFILE

```javascript
updateProfile: (data) => {
  return axiosClient.patch('/users/profile', data);
}
```

**API Call:**
```
PATCH /api/users/profile
Headers: { Authorization: "Bearer TOKEN" }
Body: {
  "fullName": "Nguyễn Văn B",
  "email": "new-email@example.com"
}

Response:
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "...",
    "email": "new-email@example.com",
    "fullName": "Nguyễn Văn B",
    ...
  }
}
```

---

## 5. FLOW ĐẦY ĐỦ: TỪNG BƯỚC CHỈNH SỬA

### Kịch bản: User chỉnh sửa tên và email

```
┌─────────────────────────────────────────────────────────────┐
│ BỨC 1: Trang load lần đầu                                  │
│─────────────────────────────────────────────────────────────│
Component mount
  ↓
useEffect() → fetchStudentProfile()
  ↓
API Call: GET /api/users/profile
  ↓
Backend trả: { fullName: "Nguyễn Văn A", email: "a@email.com" }
  ↓
Cập nhật state:
  - student = { fullName: "Nguyễn Văn A", ... }
  - editFormData = { fullName: "Nguyễn Văn A", email: "a@email.com" }
  ↓
Page hiển thị thông tin
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 2: User click "Chỉnh sửa hồ sơ"                       │
│─────────────────────────────────────────────────────────────│
Button onClick → setIsEditing(true)
  ↓
Component re-render
  ↓
Hiển thị form input thay vì text
  - Input fullName: value = "Nguyễn Văn A"
  - Input email: value = "a@email.com"
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 3: User nhập dữ liệu mới                              │
│─────────────────────────────────────────────────────────────│
User xóa tên cũ và nhập "Nguyễn Văn B"
  ↓
Input onChange event
  ↓
handleEditChange() được gọi:
  - name = "fullName"
  - value = "Nguyễn Văn B"
  ↓
Cập nhật: editFormData.fullName = "Nguyễn Văn B"
  ↓
Component re-render
  ↓
Input hiển thị: "Nguyễn Văn B"
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 4: User click "Save Changes"                          │
│─────────────────────────────────────────────────────────────│
Button onClick → handleSaveProfile()
  ↓
Set isSaving = true (button disable, hiển thị loading)
  ↓
API Call: PATCH /api/users/profile
Body: {
  "fullName": "Nguyễn Văn B",
  "email": "a@email.com"
}
  ↓
Backend xử lý & lưu database
  ↓
Backend trả: { fullName: "Nguyễn Văn B", email: "a@email.com", ... }
  ↓
Frontend:
  - Cập nhật student state
  - Set isEditing = false (thoát edit mode)
  - Hiển thị success message: "Hồ sơ được cập nhật thành công!"
  - Sau 3 giây → ẩn message
  ↓
Page hiển thị thông tin mới
└─────────────────────────────────────────────────────────────┘
```

---

## 6. FLOW UPLOAD AVATAR

```
┌──────────────────────────────────────────────────────────────┐
│ User click camera icon để đổi avatar                        │
└──────────────────────────────────────────────────────────────┘
  ↓
├─→ handleEdit() → click file input
  ↓
├─→ User chọn file "avatar.jpg" (800x600)
  ↓
├─→ handleFileSelect() được gọi
  │
  ├─→ FileReader đọc file → base64
  │
  ├─→ Hiển thị crop dialog
  │
  └─→ Canvas vẽ preview
     (tự động crop thành 600x600 từ giữa)
  ↓
├─→ User xem preview & confirm
  ↓
├─→ handleCropConfirm()
  │
  ├─→ Canvas convert thành WebP blob
  │
  ├─→ Tạo File object: "avatar.webp"
  │
  └─→ Gọi uploadAvatar()
  ↓
├─→ uploadAvatar(file)
  │
  ├─→ Set isUploading = true, progress = 0
  │
  ├─→ API Call: PATCH /api/users/avatar
  │   FormData { avatar: file }
  │
  ├─→ Progress event fired:
  │   - 0% → 100% (progress bar update)
  │
  ├─→ Backend upload lên Cloudinary
  │
  ├─→ Backend trả: { avatarUrl: "https://..." }
  │
  ├─→ Set progress = 100%, chờ 500ms
  │
  └─→ Gọi onUploadSuccess() callback
  ↓
├─→ Parent (StudentProfilePage) nhận signal
  │
  ├─→ Gọi fetchStudentProfile()
  │
  ├─→ Reload avatar mới từ API
  │
  └─→ Hiển thị success message
  ↓
└─→ Avatar updated! 🎉
```

---

## 7. STATE DIAGRAM

```
INITIAL STATE:
{
  student: null,
  isEditing: false,
  editFormData: { fullName: '', email: '' },
  loading: true,
  error: null,
  successMessage: '',
  isSaving: false
}

                    ↓ (Component Mount)
                    
LOADING STATE:
{
  student: null,
  loading: true,
  error: null
}

                    ↓ (API Success)
                    
READY STATE:
{
  student: {
    _id: "...",
    fullName: "Nguyễn Văn A",
    email: "a@email.com",
    avatarUrl: "https://..."
  },
  editFormData: {
    fullName: "Nguyễn Văn A",
    email: "a@email.com"
  },
  loading: false,
  error: null
}

     ↓ (Click Edit)              ↓ (Avatar Upload)
     
EDITING STATE          →→→→→→→→  AVATAR UPDATING STATE
{                                {
  isEditing: true,               avatarUrl updating...
  editFormData: (user input)      successMessage shown
}
```

---

## 8. ERROR HANDLING

### Lỗi khi fetch profile:
```javascript
catch (err) {
  setError('Không thể tải thông tin hồ sơ: ' + err.message);
  // → Hiển thị error screen
}
```

### Lỗi khi update profile:
```javascript
catch (err) {
  setError('Cập nhật hồ sơ thất bại: ' + err.message);
  // → Button vẫn bình thường, user có thể thử lại
}
```

### Lỗi khi upload avatar:
```javascript
catch (error) {
  alert('Upload failed: ' + error.message);
  // → Reset upload progress
  setIsUploading(false);
  setUploadProgress(0);
}
```

---

## 9. TÓMLƯỢC QUICK REFERENCE

| Chức năng | Hàm | API | Kết quả |
|-----------|-----|-----|---------|
| **Tải profile** | `fetchStudentProfile()` | GET /users/profile | Hiển thị info |
| **Chỉnh sửa** | `handleEditChange()` | N/A | Update form data |
| **Lưu thay đổi** | `handleSaveProfile()` | PATCH /users/profile | Cập nhật & thoát edit |
| **Chọn avatar** | `handleFileSelect()` | N/A | Mở dialog crop |
| **Crop ảnh** | `handleCropConfirm()` | N/A | Convert to WebP |
| **Upload avatar** | `uploadAvatar()` | PATCH /users/avatar | Cập nhật avatar + progress |

---

## 10. CẤP ĐỘ KỸ THUẬT

| Phần | Độ khó | Khái niệm chính |
|-----|--------|-----------------|
| **State Management** | ⭐ | useState, conditional rendering |
| **API Integration** | ⭐ | async/await, Axios |
| **Form Handling** | ⭐ | onChange, controlled components |
| **Image Processing** | ⭐⭐ | Canvas API, FileReader, Blob |
| **File Upload** | ⭐⭐ | FormData, multipart/form-data |
| **Progress Tracking** | ⭐⭐ | onUploadProgress callback |

---

## 11. ĐẦY ĐỦ STACK CÔNG NGHỆ

**Frontend:**
- React (Hooks: useState, useEffect, useRef)
- Tailwind CSS (styling)
- Axios (HTTP client)
- Canvas API (image crop)
- FileReader API (file reading)

**Backend:**
- Express.js
- Multer (file upload middleware)
- Cloudinary (image storage)
- MongoDB (database)
- JWT (authentication)

---

Hy vọng giải thích này giúp bạn hiểu rõ cách hoạt động của chức năng View Profile! 🚀
