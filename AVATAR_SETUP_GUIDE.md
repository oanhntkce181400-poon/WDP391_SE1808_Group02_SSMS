# Setup Guide: Student Profile & Avatar Upload Feature

## Prerequisites

1. **Cloudinary Account** (Free tier sufficient)
   - Visit: https://cloudinary.com
   - Sign up for free account
   - Get API credentials from dashboard

2. **Node.js** >= 14.0
3. **MongoDB** (Atlas or Local)
4. **Multer** (already in dependencies)
5. **Axios** in frontend

## Backend Setup

### 1. Install Dependencies (if not already done)

```bash
cd backend-api
npm install
```

The following packages are already included:
- `multer`: ^2.0.2 - File upload handling
- `cloudinary`: ^2.9.0 - Cloud image storage
- `express`: ^4.19.0 - Web framework

### 2. Environment Configuration

Update `backend-api/.env` with Cloudinary credentials:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**How to get credentials:**
1. Go to https://console.cloudinary.com/
2. Navigate to Dashboard/Settings
3. Copy "Cloud Name", "API Key", and "API Secret"
4. Paste into .env file

### 3. Start Backend Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The backend should now be running on `http://localhost:3000`

## Frontend Setup

### 1. Install Dependencies (if not already done)

```bash
cd frontend-web
npm install
```

The following packages are already included:
- `react`: ^19.2.4
- `axios`: ^1.13.3
- `tailwindcss`: ^3.4.17

### 2. Start Frontend Server

```bash
# Development mode
npm run dev

# Build for production
npm run build
```

The frontend will be available at `http://localhost:5173` (or similar)

### 3. Update API Endpoint (if needed)

Check `src/services/axiosClient.js` to ensure it points to correct backend:

```javascript
const baseURL = 'http://localhost:3000/api';
```

## File Structure

### Backend Files Created/Modified:

```
backend-api/
├── src/
│   ├── controllers/
│   │   └── user.controller.js (NEW)
│   ├── routes/
│   │   └── user.routes.js (NEW)
│   ├── middlewares/
│   │   └── avatarUpload.middleware.js (NEW)
│   ├── models/
│   │   └── user.model.js (UPDATED - added avatarCloudinaryId)
│   ├── external/
│   │   └── cloudinary.provider.js (UPDATED - buffer support)
│   └── index.js (UPDATED - added user routes)
└── .env.example (updated with Cloudinary section)
```

### Frontend Files Created/Modified:

```
frontend-web/
├── src/
│   ├── components/
│   │   └── features/
│   │       └── AvatarUploader.jsx (NEW)
│   ├── pages/
│   │   └── StudentProfilePage.jsx (NEW)
│   ├── services/
│   │   └── userService.js (UPDATED)
│   └── App.jsx (UPDATED - added profile route)
```

## How to Use

### 1. Access Student Profile Page

Navigate to: `http://localhost:5173/student/profile`

### 2. Upload Avatar

1. Click the camera icon on the avatar
2. Select an image from your computer
3. Use the crop dialog to adjust the image
4. Click "Confirm Crop"
5. Watch the progress bar as it uploads
6. Avatar updates automatically upon success

### 3. Edit Profile

1. Click "Chính sửa hồ sơ" button
2. Modify Full Name and Email
3. Click "Save Changes"
4. Profile updates and form closes

### 4. View Enrolled Courses

The page displays:
- Student ID
- Major/Program
- Semester/Year
- List of enrolled courses with instructor names and status

## API Testing

### Using cURL

**Get User Profile:**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Upload Avatar:**
```bash
curl -X PATCH http://localhost:3000/api/users/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

**Update Profile:**
```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "New Name",
    "email": "newemail@example.com"
  }'
```

### Using Postman

1. Create new requests for each endpoint
2. Set Authorization header: `Bearer YOUR_JWT_TOKEN`
3. For avatar: Set request body to `form-data`, add file field
4. For profile: Set Content-Type to `application/json`

## Troubleshooting

### Issue: "Failed to upload image: Failed to upload"

**Solution:**
1. Check Cloudinary credentials in .env
2. Verify credentials are correct in Cloudinary dashboard
3. Ensure account has not exceeded free tier limits
4. Check file size is under 10MB

### Issue: CORS Error

**Solution:**
Update `CORS_ORIGINS` in backend .env:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Issue: "User not found" error

**Solution:**
1. Ensure user is authenticated (valid JWT token)
2. Check token is passed in Authorization header
3. Verify JWT_ACCESS_SECRET is correct

### Issue: Image not displaying

**Solution:**
1. Check CloudImagery URL is correct
2. Verify image was actually uploaded to Cloudinary
3. Check browser console for 404 errors
4. Verify CORS is enabled in Cloudinary

## Performance Tips

1. **Image Optimization**: Cloudinary automatically:
   - Converts to WebP format
   - Resizes to 400x400px
   - Compresses automatically

2. **Progress Tracking**: Frontend shows real-time progress during upload

3. **Error Handling**: Graceful error handling with user-friendly messages

## Security Best Practices

1. **Token Security**:
   - JWT tokens stored in secure http-only cookies
   - Access tokens expire after 15 minutes
   - Refresh tokens expire after 7 days

2. **File Validation**:
   - Only image files accepted
   - Max file size: 10MB
   - MIME type validation on both client and server

3. **Image Security**:
   - Old images deleted from Cloudinary when replaced
   - Images stored in private Cloudinary folder
   - No public URLs disclosed

## Next Steps

1. Customize email addresses for notifications
2. Add avatar resize options
3. Implement image filters
4. Add avatar history/gallery
5. Integrate with student enrollment data

## Support & Documentation

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Multer Docs**: https://github.com/expressjs/multer
- **Axios Docs**: https://axios-http.com/docs/intro
- **React Docs**: https://react.dev

## Version Information

- **Node**: 14.0+
- **MongoDB**: 4.4+
- **React**: 19.2.4
- **Express**: 4.19.0
- **Cloudinary SDK**: 2.9.0
- **Multer**: 2.0.2

---

**Created**: January 28, 2026  
**Last Updated**: January 28, 2026
