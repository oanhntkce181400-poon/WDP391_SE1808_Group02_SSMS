# ✅ Implementation Checklist & Quick Start Guide

## 🚀 QUICK START (5 Phút)

### Step 1: Cập nhật Environment Variables (2 min)

**File**: `backend-api/.env`

```bash
# Find these 3 lines and update:
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret
```

**Lấy giá trị từ**: https://console.cloudinary.com/ → Dashboard → Settings

### Step 2: Chạy Backend (1 min)

```bash
cd backend-api
npm install  # Nếu chưa chạy
npm run dev
```

✅ Kiểm tra: Xem "🚀 Server is running on http://localhost:3000"

### Step 3: Chạy Frontend (1 min)

```bash
cd frontend-web
npm install  # Nếu chưa chạy
npm run dev
```

✅ Kiểm tra: Server chạy ở http://localhost:5173

### Step 4: Truy cập Trang (1 min)

```
http://localhost:5173/student/profile
```

✅ Xong! 🎉

---

## 📋 COMPLETE IMPLEMENTATION CHECKLIST

### Backend Setup
- [ ] Clone/pull latest code
- [ ] Navigate to `backend-api/` directory
- [ ] Run `npm install` (if dependencies changed)
- [ ] Update `.env` with Cloudinary credentials:
  - [ ] CLOUDINARY_CLOUD_NAME
  - [ ] CLOUDINARY_API_KEY
  - [ ] CLOUDINARY_API_SECRET
- [ ] Verify MongoDB connection string in .env
- [ ] Run `npm run dev` to start server
- [ ] Server running on port 3000? ✓

### Backend Files Verification
- [ ] ✅ `src/controllers/user.controller.js` - Created
- [ ] ✅ `src/routes/user.routes.js` - Created
- [ ] ✅ `src/middlewares/avatarUpload.middleware.js` - Created
- [ ] ✅ `src/models/user.model.js` - Updated (avatarCloudinaryId)
- [ ] ✅ `src/external/cloudinary.provider.js` - Updated (buffer support)
- [ ] ✅ `src/index.js` - Updated (user routes added)

### Frontend Setup
- [ ] Navigate to `frontend-web/` directory
- [ ] Run `npm install` (if dependencies changed)
- [ ] Verify `src/services/axiosClient.js` base URL points to `http://localhost:3000/api`
- [ ] Run `npm run dev` to start dev server
- [ ] Frontend accessible? ✓

### Frontend Files Verification
- [ ] ✅ `src/pages/StudentProfilePage.jsx` - Created
- [ ] ✅ `src/components/features/AvatarUploader.jsx` - Created
- [ ] ✅ `src/services/userService.js` - Updated
- [ ] ✅ `src/App.jsx` - Updated (route added)

### Documentation
- [ ] ✅ `IMPLEMENTATION_SUMMARY.md` - Created
- [ ] ✅ `AVATAR_SETUP_GUIDE.md` - Created
- [ ] ✅ `STUDENT_PROFILE_FEATURE.md` - Created
- [ ] ✅ `USER_API_DOCUMENTATION.md` - Created (Backend)
- [ ] ✅ `USAGE_EXAMPLES.js` - Created

---

## 🧪 TESTING CHECKLIST

### Manual Testing - Avatar Upload

**Test Case 1: Upload Avatar with Crop**
- [ ] Navigate to `/student/profile`
- [ ] Click avatar edit button (camera icon)
- [ ] Select image file (JPG, PNG, or WebP)
- [ ] Crop dialog appears
- [ ] Verify crop preview in canvas
- [ ] Click "Confirm Crop"
- [ ] Progress bar shows (0-100%)
- [ ] Success message appears
- [ ] Avatar updates with new image
- [ ] Page refresh - avatar persists

**Test Case 2: Avatar with Different File Types**
- [ ] Test with JPG ✓
- [ ] Test with PNG ✓
- [ ] Test with WebP ✓
- [ ] Test with GIF ✓

**Test Case 3: Avatar Upload Error Handling**
- [ ] Try uploading file > 10MB - Error shown ✓
- [ ] Try uploading non-image file - Error shown ✓
- [ ] Cancel crop dialog - No upload ✓
- [ ] Network error handling - Graceful error ✓

### Manual Testing - Profile Update

**Test Case 1: Edit Full Name**
- [ ] Click "Chính sửa hồ sơ" button
- [ ] Modify full name field
- [ ] Keep email unchanged
- [ ] Click "Save Changes"
- [ ] Success message appears
- [ ] Form closes
- [ ] Name updates in UI
- [ ] Page refresh - changes persist

**Test Case 2: Edit Email**
- [ ] Click edit button
- [ ] Change email address
- [ ] Click save
- [ ] Verify email updated
- [ ] Refresh page - persists

**Test Case 3: Edit Both Name & Email**
- [ ] Click edit button
- [ ] Change both fields
- [ ] Click save
- [ ] Both fields update
- [ ] Refresh - changes persist

**Test Case 4: Invalid Email**
- [ ] Click edit button
- [ ] Enter invalid email format
- [ ] Attempt to save
- [ ] Verify validation message (if implemented)

**Test Case 5: Duplicate Email**
- [ ] Click edit button
- [ ] Enter email already in system
- [ ] Click save
- [ ] Error message appears: "Email already in use"
- [ ] Changes not saved

### Manual Testing - UI/UX

**Test Case 1: Responsive Design**
- [ ] Desktop (1920px) - Layout correct
- [ ] Tablet (768px) - Layout adapts
- [ ] Mobile (375px) - Touch-friendly
- [ ] Elements not cut off
- [ ] Text readable
- [ ] Buttons clickable

**Test Case 2: Loading States**
- [ ] Profile loading spinner shows
- [ ] Upload progress bar shows
- [ ] Buttons disabled during upload
- [ ] Success message appears
- [ ] Error states display clearly

**Test Case 3: Accessibility**
- [ ] Keyboard navigation works
- [ ] Form labels present
- [ ] Error messages descriptive
- [ ] Color contrast adequate
- [ ] Alt text on images

### API Testing

**Test Case 1: GET /api/users/profile**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200 status
- [ ] Contains user data
- [ ] Contains avatarUrl field
- [ ] No password field returned

**Test Case 2: PATCH /api/users/avatar**
```bash
curl -X PATCH http://localhost:3000/api/users/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@image.jpg"
```
- [ ] Returns 200 status
- [ ] Returns new avatarUrl
- [ ] Image uploaded to Cloudinary
- [ ] Old image deleted from Cloudinary

**Test Case 3: PATCH /api/users/profile**
```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Name","email":"new@test.com"}'
```
- [ ] Returns 200 status
- [ ] Data saved to database
- [ ] Email uniqueness validated

**Test Case 4: Error Cases**
- [ ] No token - returns 401 ✓
- [ ] Invalid token - returns 401 ✓
- [ ] No file in avatar upload - returns 400 ✓
- [ ] Invalid file type - returns 400 ✓
- [ ] User not found - returns 404 ✓

---

## 🔧 TROUBLESHOOTING

### Problem: Page shows "User not found"
**Solution:**
1. Check you're logged in
2. Verify JWT token is valid
3. Check backend console for errors
4. Restart backend server

### Problem: Avatar upload fails silently
**Solution:**
1. Open browser DevTools (F12)
2. Check Network tab for request status
3. Check Console tab for JavaScript errors
4. Verify .env Cloudinary credentials
5. Check Cloudinary account not blocked

### Problem: "CORS error" appears
**Solution:**
1. Update `CORS_ORIGINS` in backend `.env`:
   ```env
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```
2. Restart backend server
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try in incognito window

### Problem: Form fields empty after page load
**Solution:**
1. Check network request in DevTools
2. Verify user profile API returns data
3. Check userService.getProfile() working
4. Look for JavaScript errors in console

### Problem: Crop dialog doesn't appear
**Solution:**
1. Verify image file selected
2. Check browser console for errors
3. Verify modern browser (Chrome, Firefox, Safari)
4. Check canvas support on browser

---

## 📊 VERIFICATION CHECKLIST

Run these commands to verify setup:

```bash
# Backend verification
curl -X GET http://localhost:3000/health
# Should return: {"status":"ok"}

# Check MongoDB connection
# Look for: "Connected to MongoDB"

# Check user routes registered
curl -X GET http://localhost:3000/api/users/profile
# Should return error with 401 (unauthorized) or 200 (with token)

# Frontend verification
# Visit http://localhost:5173
# Check console for errors
# Verify no CORS warnings
```

---

## 🎓 LEARNING RESOURCES

### For Backend Development
- Multer: https://github.com/expressjs/multer
- Cloudinary: https://cloudinary.com/documentation
- Express.js: https://expressjs.com/
- MongoDB: https://docs.mongodb.com/

### For Frontend Development
- React: https://react.dev
- Axios: https://axios-http.com/
- Tailwind CSS: https://tailwindcss.com/
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

### Additional Resources
- MDN Web Docs: https://developer.mozilla.org
- Stack Overflow: https://stackoverflow.com
- GitHub Issues: Ask questions in repository

---

## 📱 DEVICE TESTING

- [ ] Chrome (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Edge (Desktop)
- [ ] Chrome Mobile
- [ ] Safari Mobile (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet

---

## 🔐 SECURITY VERIFICATION

- [ ] JWT tokens required for all endpoints
- [ ] No passwords returned in API responses
- [ ] File upload size validated (10MB limit)
- [ ] File type validated (image/* only)
- [ ] Email uniqueness enforced
- [ ] Old images deleted from Cloudinary
- [ ] CORS configured properly
- [ ] No sensitive data in .env example

---

## 📈 PERFORMANCE CHECKLIST

- [ ] Avatar upload completes < 5 seconds
- [ ] Progress bar updates smoothly
- [ ] No memory leaks on repeated uploads
- [ ] Page loads in < 3 seconds
- [ ] Components render efficiently
- [ ] No console warnings or errors
- [ ] Network requests optimized

---

## 🎉 DEPLOYMENT READY

Before deploying to production:

- [ ] Verify all tests pass
- [ ] Production .env values set:
  - [ ] CLOUDINARY credentials updated
  - [ ] JWT secrets changed
  - [ ] CORS_ORIGINS updated
  - [ ] MongoDB connection verified
- [ ] Frontend built: `npm run build`
- [ ] Backend tested with production values
- [ ] Database backups taken
- [ ] Error logging configured
- [ ] Monitoring tools enabled

---

## 📞 SUPPORT & HELP

**Documentation Files:**
- 📄 `IMPLEMENTATION_SUMMARY.md` - Overview
- 📄 `AVATAR_SETUP_GUIDE.md` - Setup instructions
- 📄 `STUDENT_PROFILE_FEATURE.md` - Feature details
- 📄 `USER_API_DOCUMENTATION.md` - API reference
- 📄 `USAGE_EXAMPLES.js` - Code examples

**Quick Links:**
- Cloudinary Console: https://console.cloudinary.com/
- MongoDB Atlas: https://www.mongodb.com/atlas
- GitHub Repository: [Your repo URL]

---

## ✅ FINAL CHECKLIST

- [ ] All files created
- [ ] All files modified correctly
- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Avatar upload works
- [ ] Profile edit works
- [ ] Avatar displays correctly
- [ ] Progress bar shows
- [ ] All documentation complete
- [ ] Testing completed
- [ ] Ready for production ✅

---

**Last Updated**: January 28, 2026  
**Version**: 1.0.0  
**Status**: ✅ COMPLETE & READY

🚀 **You're all set! Enjoy the new feature!**
