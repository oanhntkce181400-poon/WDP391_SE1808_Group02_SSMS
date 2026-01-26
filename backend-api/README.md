# Backend API

Backend API cho hệ thống quản lý sinh viên.

## 1. Cấu trúc thư mục chính

```txt
backend-api/
├── src/
│   ├── configs/        # Cấu hình DB, Redis, S3
│   ├── controllers/    # Nhận request từ routes (Login, ImportUser, Backup)
│   ├── middlewares/    # Middleware (auth, rbac, upload)
│   ├── routes/         # Khai báo endpoint (/api/auth, /api/users, ...)
│   ├── services/       # Business logic (CRUD, hash password, ...)
│   ├── models/         # Schema cho DB (User, Major, Subject, ...)
│   ├── utils/          # Helper dùng chung (excelHelper, zipHelper, ...)
│   ├── jobs/           # Job chạy ngầm (backup.job)
│   └── external/       # Tích hợp bên ngoài (S3, email)
└── package.json
```

## 2. Cài đặt

```bash
cd backend-api
npm install
```

## 3. Chạy lần đầu (cho tất cả thành viên)

Flow đề xuất cho mỗi người trong nhóm:

1. Cài **MongoDB local**.
2. Clone repo về máy.
3. Vào thư mục backend-api và cài dependency:

  ```bash
  cd backend-api
  npm install
  ```

4. Tạo file `.env` từ `.env.example` (giữ nguyên `MONGODB_URI`, `MONGODB_DB_NAME` hoặc chỉnh theo ý nhóm).
5. Chạy seed để tạo database + dữ liệu mẫu (admin user):

  ```bash
  npm run seed
  ```

6. Chạy backend ở chế độ dev:

  ```bash
  npm run dev
  ```

Sau khi server chạy, có thể kiểm tra nhanh:

- API health check: `GET http://localhost:3000/health`.
- Database mới + collection users sẽ xuất hiện trong MongoDB Compass.

## 4. Chạy backend (prod đơn giản)

```bash
npm start
```

Mặc định script `start` đang trỏ tới `src/index.js`. Bạn cần tạo file `src/index.js` (Express/NestJS tuỳ stack) và khởi tạo server tại đây.

## 5. Các task quan trọng

- **Task #1**: Verify Token nằm ở `src/middlewares/auth.middleware.js`.
- **Task #2**: Hỗ trợ refresh token (liên quan tới frontend axios interceptor).
- **Task #8**: Import User qua Excel
  - Middleware upload file: `src/middlewares/upload.middleware.js`
  - Xử lý file Excel: `src/utils/excelHelper.js`
  - Route + controller + service cho `/api/users/import`.
- **Task #37**: Backup DB
  - Nén file backup: `src/utils/zipHelper.js`
  - Job backup: `src/jobs/backup.job.js`
  - Upload S3: `src/external/s3.provider.js`.

## 6. Gợi ý tiếp theo

- Thêm file config: `src/configs/db.config.js`, `redis.config.js`, `s3.config.js`.
- Tạo router chính (ví dụ: `src/routes/index.js`) và mount vào server trong `src/index.js`.
