# Mobile (React Native/Expo) Structure

src/
- screens/ – screen components mapped to navigation routes
- navigation/ – stack/tab navigators
- features/ – domain features matching web (attendance, timetable, classes, exams, grades, fees, notifications, users, auth)
- components/ – reusable RN components
- shared/
  - api/ – API client wrappers (reuse shared/api-client types)
  - hooks/ – common hooks
  - utils/ – pure utilities
  - constants/ – config and UI tokens
assets/ – images/fonts
tests/ – unit/e2e tests (Detox later)

Conventions: TypeScript, React Query, Expo, NativeWind/Tailwind (optional).
