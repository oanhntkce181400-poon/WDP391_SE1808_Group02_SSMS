# Auth & Actor Entities (Iteration 1)

Tai lieu nay bam theo:
- `backend-api/DATABASESeed.drawio.xml`
- `Interation1_Evaluation_LOC.pdf` (cac muc: Login, RefreshToken, ResetPassword, View actor, Add/Update actor)

Muc tieu la thiet ke cac collection/entity phuc vu:
- Dang nhap chu yeu bang Google
- Access Token (AT) song ngan
- Refresh Token (RT) song dai + rotation + reuse detection
- Reset password bang OTP (fallback khi can tai khoan local)
- Quan ly "actor" theo nghia role/permission

## 1) Actor (Role/Permission)

Cac bang trong so do da co san:
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

Mapping sang mongoose model:
- `src/models/role.model.js`
- `src/models/permission.model.js`
- `src/models/rolePermission.model.js`
- `src/models/userRole.model.js`

Goi y truy van cho cac man hinh:
- View actor (danh sach role): doc tu `roles`
- Add/Update actor (gan quyen cho role): ghi vao `role_permissions`
- Phan quyen nguoi dung: ghi vao `user_roles`

## 2) Access Token (AT) - "Ve vao cong"

Khai niem:
- AT la JWT song ngan, dung de goi API.

Dac diem:
- TTL de xuat: 15-30 phut.
- Khong can (va khong nen) luu AT thang vao DB.

Nen luu gi lien quan AT:
- Luu metadata de audit/tracking trong `login_events`:
  - `accessTokenJti`
  - `ipAddress`
  - `userAgent`
  - `familyId`

Model lien quan:
- `src/models/loginEvent.model.js`

## 3) Refresh Token (RT) - "Phieu doi ve"

Khai niem:
- RT chi dung de xin cap AT moi khi AT het han.

Dac diem:
- Song dai (7 ngay, 30 ngay...).
- Nen gui/luu qua HttpOnly cookie.
- Trong DB chi luu `tokenHash`, khong luu token tho.

Model lien quan:
- `src/models/refreshToken.model.js`

Cac truong chinh (da ho tro rotation + IP/UA):
- `user`: tham chieu `User`
- `tokenHash`: hash cua refresh token
- `jti`: dinh danh duy nhat cho tung RT
- `familyId`: ma dinh danh day chuyen token (rotation id)
- `replacedByToken`: lien ket RT moi khi rotation
- `revokedAt` va `revokeReason`: phuc vu chan reuse
- `expiresAt`: co TTL index de tu don dep
- IP/UA tracking:
  - `issuedIp`, `issuedUserAgent`
  - `lastUsedIp`, `lastUsedUserAgent`

## 4) Token Rotation - "Luat doi ve 1 lan"

Quy tac rotation de xuat:
1. Khi dung RT_1 de refresh:
   - Cap AT moi.
   - Revoke RT_1 (`revokedAt`).
   - Tao RT_2 moi.
   - Set `replacedByToken = RT_2` cho RT_1.
2. Lan sau chi chap nhan RT_2.

Cac truong ho tro rotation:
- `familyId`
- `replacedByToken`
- `revokedAt`

## 5) Family ID / Rotation ID - "Ma dinh danh day chuyen"

Y tuong:
- Moi lan login tren 1 thiet bi se tao 1 `familyId` rieng.
- Tat ca RT trong cung chuoi refresh deu mang cung `familyId`.

Cong dung:
- Khi phat hien reuse, co the revoke theo tung chuoi (`familyId`) thay vi dang xuat tat ca thiet bi.

Noi luu:
- `refresh_tokens.familyId`
- `login_events.familyId`

## 6) Reuse Detection - "Cai bay hacker"

Chinh sach de xuat:
1. Neu RT da bi revoke ma van bi dung lai => reuse.
2. Khi reuse xay ra:
   - Revoke toan bo RT trong cung `familyId`.
   - Danh dau su kien trong `login_events` voi `eventType = refresh`, `success = false`.

Cac truong ho tro:
- `refresh_tokens.revokedAt`
- `refresh_tokens.familyId`
- `refresh_tokens.replacedByToken`
- `login_events.familyId`, `ipAddress`, `userAgent`

## 7) Login & Session Tracking (IP + UA)

Tu so do co cac bang lien quan:
- `device_sessions`
- `login_events`
- `audit_logs` (co `actor_user_id`)

Mapping sang mongoose model:
- `src/models/deviceSession.model.js`
- `src/models/loginEvent.model.js`

Thong tin IP/UA nen luu:
- Khi login: luu vao `login_events` va `device_sessions`
- Khi refresh: cap nhat vao `refresh_tokens.lastUsedIp/lastUsedUserAgent`
- Khi cap RT: luu `issuedIp/issuedUserAgent`

## 8) Reset Password (OTP)

PDF yeu cau:
- `POST /auth/forgot-password` sinh OTP va gui mail
- `POST /auth/reset-password` verify OTP va cap nhat mat khau

So do chua co bang OTP, nen bo sung collection:
- `password_reset_otps`

Mapping sang mongoose model:
- `src/models/passwordResetOtp.model.js`

Cac truong chinh:
- `user` va `email`: dinh danh nguoi yeu cau
- `otpHash`: hash OTP
- `expiresAt`: thoi han OTP (TTL index)
- `consumedAt`: danh dau da dung
- `attempts` va `maxAttempts`: gioi han so lan nhap sai
- `requestIp`, `requestUserAgent`: tracking IP/UA

## 9) Google Login la chinh

Vi ban uu tien login bang Google, user model da duoc dieu chinh:
- `password` khong con bat buoc
- Them:
  - `authProvider`: `google` | `local` (default: `google`)
  - `googleId`: unique + sparse
  - `avatarUrl`

Model lien quan:
- `src/models/user.model.js`

Goi y:
- Khi login Google thanh cong:
  - Upsert user theo `googleId` hoac `email`
  - Set `authProvider = google`
  - Cap AT/RT nhu binh thuong

## 10) Ghi chu trien khai

Cac model moi chi la lop du lieu. De hoan thien API theo PDF, buoc tiep theo thuong la:
- Them service cho Auth (login/refresh/forgot/reset)
- Them route/controller cho Auth va Actor
- Them middleware de resolve permission tu `user_roles` + `role_permissions`

## 11) Kien truc Controller - Service - Repository

Module auth da duoc to chuc theo dung mo hinh:
- Controller: `src/modules/auth/auth.controller.js`
- Service: `src/modules/auth/auth.service.js`
- Repository: `src/modules/auth/auth.repository.js`

Muc tieu:
- Controller chi nhan request, validate co ban, tra response.
- Service chua toan bo nghiep vu: verify Google, ky token, rotation, reuse detection.
- Repository chi lam viec voi MongoDB qua mongoose models.

## 12) Auth API da co san

Base path: `/auth`

Endpoints:
1. `POST /auth/google`
   - Body: `{ \"idToken\": \"<google-id-token>\" }`
   - Tac vu: verify Google ID token, upsert user, cap AT/RT vao cookie.
2. `POST /auth/refresh`
   - Body: rong (doc refresh token tu cookie)
   - Tac vu: rotation refresh token + reuse detection.
3. `POST /auth/logout`
   - Body: rong
   - Tac vu: revoke toan bo token trong cung `familyId`, clear cookie.
4. `GET /auth/me`
   - Yeu cau: co access token hop le trong cookie (hoac Bearer header)
   - Tac vu: tra thong tin user hien tai.
