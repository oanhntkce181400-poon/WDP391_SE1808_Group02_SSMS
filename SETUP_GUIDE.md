# 🚀 SETUP SAU KHI PULL CODE - Cloudinary & Socket.IO

## Bước 1: Pull code mới nhất
```bash
git pull origin main
```

## Bước 2: Install dependencies

### Backend:
```bash
cd backend-api
npm install
```

### Frontend Web:
```bash
cd frontend-web
npm install
```

### Mobile App (nếu chạy):
```bash
cd mobile-app
npm install
```

## Bước 3: Setup Backend .env

1. Copy file `.env.example` thành `.env`:
```bash
cd backend-api
copy .env.example .env
```

2. Mở file `.env` và **COPY TOÀN BỘ** đoạn dưới đây vào cuối file:

```env
# ============================================
# TEAM CONFIG - Copy toàn bộ đoạn này vào .env
# ============================================

# MongoDB Atlas
MONGODB_ATLAS_USERNAME=bangdcce181999_db_user
MONGODB_ATLAS_PASSWORD=4BGEqRInOiMIE1Zq
MONGODB_ATLAS_CLUSTER=wdp301.miovw6s.mongodb.net
MONGODB_URI=mongodb+srv://bangdcce181999_db_user:4BGEqRInOiMIE1Zq@wdp301.miovw6s.mongodb.net/?retryWrites=true&w=majority&appName=WDP301

# Google OAuth
GOOGLE_CLIENT_ID=583293240846-9vhdacdar9gsgrlrg4tc614guaesdoj4.apps.googleusercontent.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=dbykoodod
CLOUDINARY_API_KEY=228352452884324
CLOUDINARY_API_SECRET=gxL7O6ZqvWD7t3CCdm4AS4U1bYQ
```

**Xong!** Chỉ cần copy 1 lần là đủ cả 3 services.

## Bước 4: Chạy project

### Backend:
```bash
cd backend-api
npm run dev
```
→ Phải thấy:
```
✅ Socket.IO initialized with JWT authentication
🚀 Server is running on http://localhost:3000
```

### Frontend:
```bash
cd frontend-web
npm run dev
```
→ Mở: http://localhost:5173

## ✅ Kiểm tra Socket.IO hoạt động chưa:

1. Login vào app
2. Mở DevTools Console (F12)
3. Gõ: `document.cookie`
4. Phải thấy `at=...` (access token)
5. Refresh trang → Console sẽ thấy:
```
🔌 Connecting to socket server...
✅ Socket connected: xxxxx
```

## 🐛 Nếu gặp lỗi:

### Lỗi: "Socket disconnected"
→ Chưa login hoặc token hết hạn → Login lại

### Lỗi: "MongoDB connection error"
→ Check lại `MONGODB_URI` trong `.env`

### Lỗi: "Cloudinary upload failed"
→ Check lại 3 biến `CLOUDINARY_*` trong `.env`

### Lỗi: "Port 3000 already in use"
→ Stop backend cũ: `Ctrl+C` rồi chạy lại

## 📝 Chú ý:

- **KHÔNG push file `.env`** lên Git (đã có trong .gitignore)
- Credentials trên đây là của team, dùng chung
- Nếu cần credentials khác, hỏi admin

---

**Done! Giờ có thể code được rồi 🎉**
