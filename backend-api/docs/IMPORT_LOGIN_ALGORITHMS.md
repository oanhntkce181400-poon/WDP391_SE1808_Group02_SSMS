# Import + Local Login Algorithms (Team Guide)

Muc tieu:
- Ho tro login bang email/password (local)
- De sau nay import Excel co the merge an toan

Lien quan den code hien tai:
- Login local: `POST /auth/login`
- Forgot/reset password: `/auth/forgot-password`, `/auth/reset-password`
- User model co them:
  - `authProvider`: `google | local`
  - `mustChangePassword`: boolean
  - `importSource`: string

## 1) Algorithm: Local Login (email/password)

Input:
- `email`
- `password`

Steps:
1. Normalize email: trim + lowercase.
2. Tim user theo email.
3. So khop password bang bcrypt:
   - `bcrypt.compare(plain, storedHash)`
4. Kiem tra trang thai:
   - `status === active`
   - `isActive !== false`
5. Tao device session + refresh token family.
6. Cap access token + refresh token vao cookie.
7. Tra ve:
   - `user`
   - `meta.mustChangePassword`

Ghi chu:
- Khong bao lo user co ton tai hay khong.

## 2) Algorithm: Import Excel -> Local Accounts

Khi import tai khoan tu Excel, team import nen lam theo:

Input moi dong:
- `email`
- `fullName`
- `role`

Recommend steps cho moi dong:
1. Normalize email.
2. Xac dinh password ban dau:
   - Cach A (de demo): dung temp password chung
   - Cach B (tot hon): random password tung user
3. Hash password bang bcrypt:
   - `bcrypt.hash(tempPassword, saltRounds)`
4. Upsert user:
   - Neu chua co: create
   - Neu da co: update cac field cho phep
5. Cac field quan trong:
   - `authProvider = 'local'`
   - `password = <bcrypt-hash>`
   - `mustChangePassword = true`
   - `importSource = 'excel:<file-or-batch-id>'`
   - `status = 'active'`

## 3) Algorithm: Force Reset Sau Import

Neu `mustChangePassword === true`:
1. Cho login binh thuong (de lay session).
2. Frontend thay `meta.mustChangePassword === true` thi:
   - dieu huong den man reset password.
3. Sau khi reset thanh cong:
   - backend set:
     - `mustChangePassword = false`
     - `passwordChangedAt = now`

## 4) Cac bien ENV quan trong

Co the cau hinh them:

```env
PASSWORD_SALT_ROUNDS=10
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
```

