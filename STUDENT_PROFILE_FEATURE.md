# Student Profile & Avatar Upload Feature

## Mô tả chức năng

Tính năng này cung cấp cho sinh viên khả năng xem và quản lý hồ sơ cá nhân, bao gồm việc upload và chỉnh sửa avatar với khả năng cắt ảnh trước khi upload.

## Backend Implementation

### 1. API Endpoints

#### GET /api/users/profile
- **Mô tả**: Lấy thông tin hồ sơ người dùng hiện tại
- **Authentication**: Required (JWT)
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "email": "student@example.com",
    "fullName": "Nguyễn Văn An",
    "avatarUrl": "https://...",
    "role": "student",
    "status": "active",
    "createdAt": "2024-01-28T...",
    "updatedAt": "2024-01-28T..."
  }
}
```

#### PATCH /api/users/avatar
- **Mô tả**: Upload avatar mới cho người dùng
- **Authentication**: Required (JWT)
- **Request**: multipart/form-data
  - Field name: `avatar`
  - Supported types: image/jpeg, image/png, image/webp, image/gif
  - Max size: 10MB
- **Response**:
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/..."
  }
}
```

#### PATCH /api/users/profile
- **Mô tả**: Cập nhật thông tin hồ sơ người dùng
- **Authentication**: Required (JWT)
- **Request Body**:
```json
{
  "fullName": "Nguyễn Văn An",
  "email": "new-email@example.com"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "...",
    "email": "new-email@example.com",
    "fullName": "Nguyễn Văn An",
    ...
  }
}
```

### 2. Tệp được tạo/cập nhật

#### Backend:
- `src/controllers/user.controller.js` - Controller xử lý các yêu cầu user
- `src/routes/user.routes.js` - Routes cho API endpoints
- `src/middlewares/avatarUpload.middleware.js` - Multer configuration
- `src/models/user.model.js` - Updated with avatarCloudinaryId field
- `src/external/cloudinary.provider.js` - Updated to support buffer uploads

### 3. Configuration

Cần set các environment variables sau:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Frontend Implementation

### 1. Components

#### AvatarUploader Component
Located at: `src/components/features/AvatarUploader.jsx`

**Props**:
- `currentAvatar` (string): URL của avatar hiện tại
- `onUploadSuccess` (function): Callback khi upload thành công

**Features**:
- Hiển thị avatar hiện tại hoặc default avatar
- Nút edit để chọn file
- Image cropper dialog
- Progress bar khi uploading
- Support for jpg, png, webp, gif
- Max file size: 10MB

**Usage**:
```jsx
import AvatarUploader from '../../components/features/AvatarUploader';

<AvatarUploader 
  currentAvatar={student?.avatarUrl}
  onUploadSuccess={handleAvatarUploadSuccess}
/>
```

### 2. Pages

#### StudentProfilePage
Located at: `src/pages/StudentProfilePage.jsx`

**Features**:
- Avatar upload với crop functionality
- Xem thông tin profile
- Edit tên và email
- Hiển thị các khóa học đang theo học
- Download CV button (placeholder)
- Responsive design

**Route**: `/student/profile`

### 3. Services

#### userService
Updated at: `src/services/userService.js`

**Methods**:
- `getProfile()` - Lấy profile người dùng
- `updateAvatar(file, onUploadProgress)` - Upload avatar
- `updateProfile(data)` - Cập nhật profile

## Image Processing Flow

### Backend Flow
1. **File Upload**: Multer nhận file từ request (buffer)
2. **Cloudinary Upload**: Upload buffer to Cloudinary
3. **Optimization**: Auto format to webp, width 400px, height 400px
4. **Database Update**: Lưu URL và public_id vào MongoDB
5. **Old Image Cleanup**: Xóa ảnh cũ từ Cloudinary (nếu có)

### Frontend Flow
1. **File Selection**: Người dùng chọn file ảnh
2. **Image Cropping**: Hiển thị crop dialog
   - User có thể xem preview của ảnh cắt
3. **Canvas Processing**: Convert cropped image to WebP format
4. **Upload**: Send file to backend via multipart/form-data
5. **Progress Tracking**: Hiển thị progress bar dựa trên onUploadProgress
6. **Success**: Refresh profile data

## Styling

Sử dụng **Tailwind CSS** cho styling:
- Responsive grid layouts
- Blue color scheme (#3b82f6)
- Rounded buttons và cards
- Shadow effects
- Hover states

## Error Handling

### Backend Errors
- 400: Bad request (no file, invalid type)
- 404: User not found
- 500: Server error

### Frontend Errors
- Network errors display alert
- File validation before upload
- Try again button trên error state

## Security Features

1. **Authentication**: JWT required for all endpoints
2. **File Validation**: 
   - Mimetype check
   - File size limit (10MB)
3. **Image Optimization**: 
   - Cloudinary format conversion
   - Automatic compression
4. **Old Image Cleanup**: Xóa ảnh cũ từ Cloudinary

## Performance Optimizations

1. **Memory Storage**: Multer memory storage (không disk)
2. **Image Optimization**: Cloudinary auto-format và compression
3. **Progress Bar**: Real-time progress tracking
4. **Responsive Images**: Auto-scaled to 400x400px

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅ (with responsive design)

## Testing

### Test Avatar Upload
```bash
curl -X PATCH http://localhost:3000/api/users/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@path/to/image.jpg"
```

### Test Profile Update
```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Name","email":"new@example.com"}'
```

## Troubleshooting

### Avatar upload fails
1. Check Cloudinary credentials in .env
2. Verify file size < 10MB
3. Check file mimetype is image/*

### Progress bar not showing
1. Verify axios client setup supports onUploadProgress
2. Check network tab for actual progress events

### Image not displaying
1. Check CloudImagery URL is accessible
2. Verify CORS settings if on different domain
3. Check image public_id in database

## Future Enhancements

1. Batch upload multiple images
2. Image filter/effects before upload
3. Avatar history/gallery
4. Gravatar integration
5. Social media avatar import
