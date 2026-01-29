# User API Documentation

## Base URL
```
http://localhost:3000/api/users
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. Get User Profile

#### Request
```
GET /profile
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "student@example.com",
    "fullName": "Nguyễn Văn An",
    "authProvider": "google",
    "googleId": "google_id_string",
    "avatarUrl": "https://res.cloudinary.com/...",
    "avatarCloudinaryId": "ssms/avatars/public_id",
    "role": "student",
    "isActive": true,
    "status": "active",
    "lastLoginAt": "2024-01-28T10:30:00.000Z",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-28T10:30:00.000Z"
  }
}
```

#### Response (404 Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 2. Update User Avatar

#### Request
```
PATCH /avatar
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

#### Request Body
```
Field: avatar
Type: File (multipart)
Accepted MIME types: image/jpeg, image/png, image/webp, image/gif
Max size: 10MB
```

#### Example using cURL
```bash
curl -X PATCH http://localhost:3000/api/users/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

#### Example using JavaScript/Fetch
```javascript
const file = document.getElementById('fileInput').files[0];
const formData = new FormData();
formData.append('avatar', file);

const response = await fetch('/api/users/avatar', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/your-cloud/image/upload/..."
  }
}
```

#### Response (400 Bad Request)
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

#### Response (404 Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### Response (500 Internal Server Error)
```json
{
  "success": false,
  "message": "Failed to upload image: [Error details]"
}
```

---

### 3. Update User Profile

#### Request
```
PATCH /profile
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "fullName": "Nguyễn Văn An",
  "email": "new-email@example.com"
}
```

#### Optional Fields
- `fullName` (string): User's full name, 1-255 characters
- `email` (string): Valid email format, must be unique

#### Example using cURL
```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "New Name",
    "email": "newemail@example.com"
  }'
```

#### Example using JavaScript/Fetch
```javascript
const response = await fetch('/api/users/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fullName: 'New Name',
    email: 'newemail@example.com'
  })
});

const result = await response.json();
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "new-email@example.com",
    "fullName": "Nguyễn Văn An",
    "avatarUrl": "https://...",
    "role": "student",
    "status": "active",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-28T11:00:00.000Z"
  }
}
```

#### Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Email already in use"
}
```

#### Response (404 Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## Error Codes

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 400 | No file uploaded | Avatar endpoint called without file | Ensure file is attached |
| 400 | Email already in use | Email is already registered | Use different email |
| 401 | Unauthorized | Missing or invalid token | Include valid JWT token |
| 404 | User not found | User doesn't exist in database | Check user ID in token |
| 500 | Failed to upload image | Cloudinary error | Check Cloudinary config |

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error |

---

## Avatar Upload Process (Backend)

1. **Multer Receives File**
   - Validates MIME type
   - Checks file size (max 10MB)
   - Stores in memory buffer

2. **Cloudinary Upload**
   - Sends buffer to Cloudinary
   - Auto-optimizes: WebP format, 400x400px
   - Returns secure_url and public_id

3. **Database Update**
   - Stores avatarUrl (image URL)
   - Stores avatarCloudinaryId (for future deletion)
   - Marks updatedBy field

4. **Cleanup**
   - Deletes previous avatar from Cloudinary
   - Prevents storage bloat

---

## Data Validation

### Full Name
- Required for update profile
- Type: String
- Length: 1-255 characters
- Trimmed of whitespace

### Email
- Type: String
- Must be valid email format
- Must be unique in database
- Case-insensitive for uniqueness

### Avatar File
- Type: File (multipart)
- MIME types: image/jpeg, image/png, image/webp, image/gif
- Max size: 10MB
- Dimensions: Auto-scaled to 400x400px

---

## Rate Limiting

Currently no rate limiting on user endpoints. Consider implementing:
```javascript
// Example with express-rate-limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.patch('/avatar', limiter, authenticate, updateAvatar);
```

---

## Cloudinary Integration

### Configuration Required
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Upload Settings
- **Folder**: ssms/avatars
- **Format**: Auto (converted to WebP)
- **Quality**: auto (Cloudinary optimizes)
- **Dimensions**: 400x400px (fill crop mode)
- **Resource Type**: auto

### Image URL Example
```
https://res.cloudinary.com/your-cloud/image/upload/v1234567890/ssms/avatars/public_id.webp
```

---

## Frontend Integration

### Using userService

```javascript
import userService from './services/userService';

// Get profile
const { success, data } = await userService.getProfile();

// Upload avatar
const response = await userService.updateAvatar(file, (progress) => {
  console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
});

// Update profile
const response = await userService.updateProfile({
  fullName: 'New Name',
  email: 'new@example.com'
});
```

### Using AvatarUploader Component

```jsx
import AvatarUploader from './components/features/AvatarUploader';

<AvatarUploader 
  currentAvatar={student?.avatarUrl}
  onUploadSuccess={() => {
    console.log('Avatar uploaded!');
    // Refresh profile data
  }}
/>
```

---

## Security Considerations

1. **JWT Validation**: Token must be valid and not expired
2. **CORS**: Frontend origin must be in CORS_ORIGINS env variable
3. **File Type Check**: Both client and server validate MIME type
4. **File Size Limit**: Maximum 10MB enforced by Multer
5. **Email Uniqueness**: Database ensures no duplicate emails

---

## Performance Notes

- Avatar upload uses memory storage (Multer) for efficiency
- Cloudinary handles image optimization automatically
- Direct buffer upload to Cloudinary (no disk I/O)
- Progress events enabled for real-time feedback
- Automatic image format conversion to WebP

---

## Changelog

### Version 1.0.0 (January 28, 2026)
- Initial release
- Avatar upload with Cloudinary integration
- Profile update functionality
- Image crop support on frontend
- Progress bar for uploads
- Responsive design for mobile
