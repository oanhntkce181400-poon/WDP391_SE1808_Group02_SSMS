# Mobile App

Ứng dụng mobile (React Native / Expo) cho sinh viên.

## 1. Cấu trúc thư mục chính

```txt
mobile-app/
├── android/                # Code native Android (tự sinh)
├── ios/                    # Code native iOS (tự sinh)
├── src/
│   ├── assets/             # Fonts, images (logo trường)
│   ├── components/
│   │   ├── common/         # Button, InputField, LoadingSpinner
│   │   └── layout/         # ScreenWrapper, Header
│   ├── navigation/         # Cấu hình React Navigation
│   │   ├── AppNavigator.js # Root navigator
│   │   ├── AuthStack.js    # Login, ForgotPassword
│   │   └── MainStack.js    # BottomTab (Home, Profile, Schedule)
│   ├── screens/
│   │   ├── auth/           # LoginScreen, ForgotPasswordScreen
│   │   └── student/        # HomeScreen, ProfileScreen
│   ├── services/           # Gọi API (axiosClient, authService)
│   ├── stores/             # State (useAuthStore - Zustand)
│   ├── utils/              # storage (AsyncStorage), validation (Zod schemas)
│   └── hooks/              # useAuth, useProfile
├── App.js                  # Entry point
└── package.json
```

## 2. Cài đặt

```bash
cd mobile-app
npm install
```

(hoặc `yarn install`, tuỳ bạn).

## 3. Chạy app (Expo)

```bash
npm run start
```

Sau đó dùng Expo Go (trên điện thoại) quét QR code để mở app.

## 4. Liên hệ với Backend

- Axios client: `src/services/axiosClient.js`
  - Cần chỉnh `baseURL` trỏ tới backend API thật (ví dụ: `http://10.0.2.2:3000/api` cho Android emulator).
  - Thêm interceptor gắn token và xử lý refresh token giống web.
- Auth service: `src/services/authService.js`.
- Lưu token & user:
  - Store Zustand: `src/stores/useAuthStore.js`.
  - Lưu trữ lâu dài: `src/utils/storage.js` (AsyncStorage).

## 5. Các task quan trọng

- **Task #1**: Login form tại `src/screens/auth/LoginScreen.js`.
- **Task #4**: Profile screen tại `src/screens/student/ProfileScreen.js`.
- Điều hướng:
  - Auth flow trong `src/navigation/AuthStack.js`.
  - Main flow (BottomTab) trong `src/navigation/MainStack.js`.

## 6. Gợi ý tiếp theo

- Hoàn thiện `AppNavigator` trong `src/navigation/AppNavigator.js` và sử dụng nó trong `App.js`.
- Cài đặt `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`, `@react-native-async-storage/async-storage`, ...
