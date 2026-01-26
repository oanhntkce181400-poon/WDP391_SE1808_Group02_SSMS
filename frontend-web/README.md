# Frontend Web

Frontend web (React) cho trang quản trị và sinh viên.

## 1. Cấu trúc thư mục chính

```txt
frontend-web/
├── src/
│   ├── assets/             # Logo, icon, hình ảnh
│   ├── components/
│   │   ├── common/         # Button, Input, Modal dùng chung
│   │   ├── layout/         # Sidebar, Header, Layout chính
│   │   └── features/       # Component chức năng (ImportModal, BackupButton, ...)
│   ├── pages/
│   │   ├── auth/           # Login, ForgotPassword
│   │   ├── admin/          # Trang quản trị (Dashboard, UserManagement, MajorManagement)
│   │   └── student/        # Trang student (Profile, Home, ...)
│   ├── services/           # Gọi API (axiosClient, authService, userService)
│   ├── stores/             # State management (Zustand/Redux)
│   └── hooks/              # Custom hooks (useAuth, useFetch, ...)
└── package.json
```

## 2. Cài đặt

```bash
cd frontend-web
npm install
```

## 3. Chạy web

```bash
npm run start
```

Hiện script `start` dùng `vite`, tuỳ bạn cấu hình thêm file `vite.config.js` và entry (ví dụ `src/main.jsx`).

## 4. Liên hệ với Backend

- Axios client: `src/services/axiosClient.js`
  - Cần cấu hình `baseURL` trỏ tới backend-api (ví dụ: `http://localhost:3000/api`).
  - Thêm interceptor gắn access token và xử lý refresh token (Task #2).
- Auth service: `src/services/authService.js` (login/logout).
- User service: `src/services/userService.js` (importUsers, getUsers).

## 5. Các task quan trọng

- **Task #1**: Form Login ở `src/pages/auth` (sau này bạn tạo Login.jsx).
- **Task #2**: Refresh token interceptor trong `src/services/axiosClient.js`.
- **Task #4-8**: User Management
  - Trang: `src/pages/admin/UserManagement.jsx`.
  - Import Excel: `src/components/features/ImportModal.jsx` + `userService.importUsers`.
- **Task #33-35**: Major Management
  - Trang: `src/pages/admin/MajorManagement.jsx`.

## 6. Gợi ý tiếp theo

- Tạo router (React Router hoặc Next.js pages) để điều hướng giữa các trang.
- Tạo layout chung (Sidebar + Header) trong `src/components/layout/`.
