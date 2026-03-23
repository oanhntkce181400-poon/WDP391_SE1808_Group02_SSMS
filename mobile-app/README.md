# Mobile App

React Native / Expo app for the student-facing mobile experience.

## Install

```bash
cd mobile-app
npm install
```

## Environment

Expo reads `EXPO_PUBLIC_*` variables from the local `.env` file.

Files:

- `.env`: active local config used by the app
- `.env.example`: template for new machines
- `src/config/env.js`: shared resolver used by API and socket clients

Current variables:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.4:3000/api
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.4:3000
```

If your computer gets a new LAN IP, update the host in `.env`.

## Run

```bash
npx expo start -c
```

Other commands:

```bash
npm run android
npm run ios
npm run web
```

## Backend links

- Axios client: `src/services/axiosClient.js`
- Socket client: `src/contexts/SocketContext.js`
- Shared env config: `src/config/env.js`

## Notes

- Expo Go on the phone must support the same Expo SDK as this project.
- For physical devices, prefer the LAN IP in `.env` instead of `localhost`.
