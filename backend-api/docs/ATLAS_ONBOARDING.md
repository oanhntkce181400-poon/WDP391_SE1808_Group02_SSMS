# MongoDB Atlas Onboarding (Team Dev)

Tai lieu nay giup thanh vien moi:

- Truy cap duoc MongoDB Atlas
- Cau hinh `.env` dung chuan du an
- Chay migrations/seeds dung thu tu

Ap dung cho repo:

- `backend-api`
- `frontend-web`

## 1) Atlas: quy trinh share dung chuan

Nguoi quan tri Atlas can lam:

1. Moi thanh vien vao Project

- Atlas -> Project -> Project Access -> Invite
- Goi y role: `Project Data Access Read/Write`

2. Mo Network Access cho dev

- Atlas -> Network Access
- Dev nhanh: add `0.0.0.0/0`
- An toan hon: add tung IP dev

3. Tao Database User cho ung dung

- Atlas -> Database Access -> Add New Database User
- Goi y:
  - Username: `wdp-dev`
  - Role: `readWriteAnyDatabase` (dev)

Quan trong:

- Khong commit user/password vao git
- Neu lo password: doi password DB user tren Atlas

## 2) Backend env chuan (bat buoc)

Trong `backend-api/.env`:

```env
PORT=3000

MONGODB_URI=mongodb+srv://<db_user>:<db_password>@<cluster-host>/?retryWrites=true&w=majority&appName=WDP301
MONGODB_DB_NAME=wdp301
MONGODB_APP_NAME=wdp-backend
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIGRATIONS_COLLECTION=__migrations

CORS_ORIGINS=http://localhost:5173,http://localhost:3000

JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ACCESS_TOKEN_COOKIE_NAME=at
REFRESH_TOKEN_COOKIE_NAME=rt
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

GOOGLE_CLIENT_ID=<google-client-id>.apps.googleusercontent.com

DEFAULT_USER_ROLE=student
```

Ghi chu:

- `MONGODB_DB_NAME` la ten database trong cluster (khong phai project/cluster)
- Team nen thong nhat mot DB name duy nhat, vi du: `wdp301`

## 3) Frontend env chuan (bat buoc)

Tao file `frontend-web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<google-client-id>.apps.googleusercontent.com
```

Hai bien quan trong:

- `VITE_API_BASE_URL` phai trung voi backend
- `VITE_GOOGLE_CLIENT_ID` nen giong voi `GOOGLE_CLIENT_ID` o backend

## 4) Lenh chay dung thu tu (copy/paste)

Mo 2 terminal rieng.

### 4.1) Backend

```bash
cd d:\WDP\WDP391_SE1808_Group02_SSMS\backend-api
npm install
npm run migrate
npm run seed
npm run dev
```

Health check:

- `http://localhost:3000/health`

### 4.2) Frontend

```bash
cd d:\WDP\WDP391_SE1808_Group02_SSMS\frontend-web
npm install
npm run dev
```

Frontend:

- `http://localhost:5173`

## 5) Quy trinh doi schema/entity dung chuan team

Khi thay doi model/entity:

1. Sua mongoose model

- Vi du: `src/models/*.model.js`

2. Tao migration moi

- Thu muc: `src/database/migrations`
- Ten file: `YYYYMMDD-short-name.js`

Mau migration:

```js
module.exports = {
  id: "20260127-some-change",
  description: "Explain what changes",
  async up(ctx) {
    // Write idempotent updates here
  },
  async down(ctx) {
    // Optional rollback
  },
};
```

3. Chay migrations truoc khi dev tiep

```bash
npm run migrate:status
npm run migrate
```

4. Commit cung nhau

- Model changes
- Migration file
- Docs neu can

Rule quan trong:

- Khong pull model moi ma khong chay migrations

## 6) Checklist khi loi ket noi Atlas

Neu khong ket noi duoc:

1. Kiem tra lai `MONGODB_URI`

- Sai username/password la loi pho bien nhat

2. Kiem tra Network Access

- IP chua duoc allow

3. Kiem tra DB user co dung role

- Can quyen read/write

4. Restart server sau khi sua `.env`

- Dotenv chi doc luc process start

## 7) Google login loi 401 invalid_client

Neu gap:

- `Access blocked: Authorization Error`
- `Error 401: invalid_client`

Hay kiem tra:

1. Client ID co ton tai va dung project
2. `frontend-web/.env`:

- `VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com`

3. `backend-api/.env`:

- `GOOGLE_CLIENT_ID=...apps.googleusercontent.com`

4. Restart ca backend va frontend

Design Parameters (Prompt Info)
Style: Minimalist Academic / Clean SaaS
Layout: Centered Card Layout (Single Column)
Corner Radius: rounded-2xl (for cards), rounded-xl (for buttons)
Shadows: Soft, diffused shadows (shadow-xl shadow-slate-200/50)
Font: Sans-serif (Inter/System UI)
Color Palette (Mã Màu)
Primary Brand Blue: #2563EB (Tailwind blue-600) - Used for the logo background and accents.
Background Gradient:
Start: #F0F7FF (Very pale blue)
End: #E0E7FF (Light indigo/blue mix)
Surface/Card: #FFFFFF (White)
Text Colors:
Headings: #0F172A (Slate 900)
Subtitles: #64748B (Slate 500)
Links: #2563EB (Blue 600)
