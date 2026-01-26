# WDP301 Monorepo

Monorepo cho hệ thống quản lý sinh viên, gồm:

- `backend-api/`: API server (Node.js, Express, MongoDB)
- `frontend-web/`: Web admin + student portal (React)
- `mobile-app/`: Ứng dụng mobile (React Native / Expo)
- `shared/`: Code dùng chung (models, validation, api-client, ...)

---

## 1. Kiến trúc tổng quan

### 1.1 Các package chính

- **backend-api/**
  - Chịu trách nhiệm:
    - Xác thực (login, refresh token sau này).
    - CRUD Users, Majors, Subjects, Attendance, Scores, Fees, Notifications, ...
    - Import/Export (Excel, backup S3).
  - Công nghệ: Node.js, Express, MongoDB (Mongoose).

- **frontend-web/**
  - Web cho **admin/staff** + **student**:
    - Admin: Dashboard, User Management, Major Management, cấu hình...
    - Student: xem lịch, điểm, thông báo, học phí, ...
  - Công nghệ: React + Vite, Axios, Zustand/Redux (tuỳ nhóm).

- **mobile-app/**
  - Ứng dụng dành cho sinh viên:
    - Đăng nhập, xem lịch học, điểm, thông tin cá nhân, thông báo.
  - Công nghệ: React Native / Expo, React Navigation, Axios, Zustand.

- **shared/**
  - Dùng để chứa:
    - `models/`: định nghĩa type/interface chung cho FE.
    - `validation/`: schema Zod dùng chung web + mobile.
    - `api-client/`: cấu hình axios client dùng chung (có thể refactor sau).

### 1.2 Luồng kết nối

- **Frontend Web**
  - Gọi API qua `frontend-web/src/services/axiosClient.js`.
  - Mặc định `baseURL` trỏ tới `http://localhost:3000/api` (cần chỉnh trong file này).
  - Auth:
    - `authService` gọi `/api/auth/login`, `/api/auth/logout`.
    - Token được lưu ở store (Zustand/Redux) và/hoặc localStorage.

- **Mobile App**
  - Gọi API qua `mobile-app/src/services/axiosClient.js`.
  - `baseURL` trỏ tới máy backend (ví dụ: `http://10.0.2.2:3000/api` cho Android emulator).
  - Token được lưu trong `useAuthStore` + `AsyncStorage` (`utils/storage.js`).

- **Backend API**
  - Lắng nghe ở `PORT` (mặc định 3000) – cấu hình trong `.env`.
  - Kết nối MongoDB qua `src/configs/db.config.js`.
  - Seed dữ liệu ban đầu qua `src/database/seeds/index.js`.

---

## 2. Backend API

Thư mục: `backend-api/` (xem chi tiết hơn tại `backend-api/README.md`).

### 2.1 Cấu trúc chính

- `src/index.js`: entry chính, khởi động Express + kết nối MongoDB.
- `src/configs/db.config.js`: cấu hình & hàm `connectDB` dùng Mongoose.
- `src/models/`: Mongoose models
  - `user.model.js`: schema User (email, password, fullName, role, isActive).
- `src/controllers/`: nhận request từ routes, gọi services.
- `src/services/`: business logic (CRUD, hash password, ...).
- `src/routes/`: khai báo các router `/api/...` (auth, users, majors, ...).
- `src/middlewares/`:
  - `auth.middleware.js`: verify access token (Task #1).
  - `rbac.middleware.js`: kiểm tra quyền (admin/staff).
  - `upload.middleware.js`: nhận file Excel/ảnh từ FE.
- `src/utils/`:
  - `excelHelper.js`: đọc & validate file Excel (Task #8).
  - `zipHelper.js`: nén file backup (Task #37).
- `src/jobs/`:
  - `backup.job.js`: job backup DB & upload S3 (Task #37).
- `src/external/`:
  - `s3.provider.js`: upload file lên AWS S3.
  - `mailer.js`: gửi email OTP.
- `src/database/seeds/`:
  - `index.js`: script seed (tạo admin user mẫu).

### 2.2 Biến môi trường (`backend-api/.env`)

Tham khảo `backend-api/.env.example`:

- `PORT` – port cho Express (mặc định 3000).
- `MONGODB_URI` – connection string Mongo (local: `mongodb://127.0.0.1:27017`).
- `MONGODB_DB_NAME` – tên database dành riêng cho project.

### 2.3 Setup & chạy backend

```bash
cd backend-api
npm install
# tạo .env từ .env.example
npm run seed   # tạo DB + user admin mẫu
npm run dev    # chạy server với nodemon
```

Health check: `GET http://localhost:3000/health`.

---

## 3. Frontend Web

Thư mục: `frontend-web/` (xem thêm `frontend-web/README.md`).

### 3.1 Cấu trúc chính

- `src/assets/`: logo, icon.
- `src/components/`:
  - `common/`: button, input, modal dùng chung.
  - `layout/`: sidebar, header, layout chính.
  - `features/`:
    - `ImportModal.jsx`: popup upload Excel User (Task #8).
    - `BackupButton.jsx`: nút kích hoạt backup (Task #37).
- `src/pages/`:
  - `auth/`: Login, ForgotPassword (sẽ thêm sau).
  - `admin/`:
    - `Dashboard.jsx`.
    - `UserManagement.jsx`: quản lý user (Task #4–8).
    - `MajorManagement.jsx`: quản lý ngành (Task #33–35).
  - `student/`: trang student (Profile, ...).
- `src/services/`:
  - `axiosClient.js`: cấu hình Axios + interceptor (Task #2).
  - `authService.js`: login/logout.
  - `userService.js`: importUsers, getUsers.
- `src/stores/`: state management (Zustand/Redux) – lưu user & token.
- `src/hooks/`: custom hooks (`useAuth`, `useFetch`, ...).

### 3.2 Kết nối backend

Trong `frontend-web/src/services/axiosClient.js`:

- Cần chỉnh `baseURL` trỏ tới backend-api, ví dụ:

```js
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api',
});
```

Setup:

```bash
cd frontend-web
npm install
npm run start   # hoặc npm run dev tuỳ config Vite
```

---

## 4. Mobile App

Thư mục: `mobile-app/` (xem thêm `mobile-app/README.md`).

### 4.1 Cấu trúc chính

- `android/`, `ios/`: code native do Expo/React Native sinh.
- `App.js`: entry point, render `AppNavigator` (sau này).
- `src/assets/`: fonts, logo.
- `src/components/`:
  - `common/`: Button, InputField, LoadingSpinner.
  - `layout/`: ScreenWrapper, Header.
- `src/navigation/`:
  - `AppNavigator.js`: root navigator.
  - `AuthStack.js`: stack Auth (Login, ForgotPassword).
  - `MainStack.js`: bottom tab (Home, Profile, Schedule).
- `src/screens/`:
  - `auth/`: `LoginScreen.js`, `ForgotPasswordScreen.js`.
  - `student/`: `HomeScreen.js`, `ProfileScreen.js`.
- `src/services/`:
  - `axiosClient.js`: Axios cho mobile (có interceptor refresh token).
  - `authService.js`: login.
- `src/stores/`:
  - `useAuthStore.js`: Zustand lưu user + token.
- `src/utils/`:
  - `storage.js`: wrapper AsyncStorage.
  - `validation.js`: schema Zod có thể chia sẻ với web.
- `src/hooks/`: `useAuth`, `useProfile`.

### 4.2 Kết nối backend

Trong `mobile-app/src/services/axiosClient.js`:

- Chỉnh `baseURL` tương ứng môi trường dev:
  - Android emulator: `http://10.0.2.2:3000/api`.
  - iOS simulator / device thật: `http://<ip-may-pc>:3000/api`.

Setup:

```bash
cd mobile-app
npm install
npm run start   # Expo start
```

---

## 5. Shared

Thư mục: `shared/`

- `api-client/`: (dự kiến) axios client chung cho web + mobile.
- `models/`: type/interface chung (User, Class, Subject, ...).
- `validation/`: schema Zod dùng chung (login, profile, import file, ...).

Hiện tại phần lớn vẫn là skeleton để nhóm triển khai dần. Khi refactor:

- Web & mobile có thể import từ `shared/models` và `shared/validation` để tránh trùng code.

---

## 6. Flow làm việc cho cả nhóm

### 6.1 Lần đầu setup (mỗi thành viên)

1. Cài **Node.js** + **MongoDB local**.
2. Clone repo về máy.
3. Backend API:

   ```bash
   cd backend-api
   npm install
   # copy .env.example -> .env và chỉnh nếu cần
   npm run seed   # tạo DB + user admin mẫu
   npm run dev
   ```

4. Frontend Web:

   ```bash
   cd frontend-web
   npm install
   npm run start
   ```

5. Mobile App:

   ```bash
   cd mobile-app
   npm install
   npm run start
   ```

### 6.2 Quy ước

- Không commit file `.env` (chỉ commit `.env.example`).
- Khi thêm model/validation mới, ưu tiên đặt ở `shared/` nếu dùng chung cho cả web + mobile.
- API mới:
  - Định nghĩa ở backend-api (routes + controller + service + model).
  - Web/mobile gọi qua services tương ứng (`frontend-web/src/services`, `mobile-app/src/services`).
