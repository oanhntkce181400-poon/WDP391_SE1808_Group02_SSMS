# Web (React) Structure

src/
- app/ – app shell, routing, global providers
- pages/ – route-level pages
- features/ – domain features (attendance, timetable, classes, exams, grades, fees, notifications, users, auth)
- widgets/ – feature-composed UI blocks
- components/ – reusable presentational components
- shared/
  - api/ – API client wrappers (reuse shared/api-client if used)
  - hooks/ – common hooks
  - utils/ – pure utilities
  - constants/ – tokens and config
- tests/ – unit/integration tests
public/ – static assets

Conventions: TypeScript, React Query, routing via React Router, Tailwind or CSS Modules.
