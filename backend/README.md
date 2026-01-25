# Backend (NestJS + MongoDB) Structure

src/
- main.ts, app.module.ts – bootstrap
- config/ – configuration schemas and loaders
- database/
  - schemas/ – Mongoose schemas and models
- common/
  - filters/ – global exception filters
  - interceptors/ – logging/transform interceptors
  - guards/ – RBAC/auth guards
- modules/ – domain modules
  - auth/ – JWT, refresh tokens, RBAC roles
  - users/ – admins/teachers/students/parents
  - classes/ – class entities and assignments
  - rooms/ (add if needed)
  - timetable/ – schedules
  - attendance/ – check-in/out, real-time gateway (WS)
  - exams/ – exam sessions
  - grades/ – grade entries and reports
  - fees/ – payments/invoices
  - notifications/ – email/push/websocket
- integrations/
  - email/, payments/ – external service adapters
- docs/ – OpenAPI/Swagger docs
- test/ – unit/e2e tests

Conventions:
- Use Mongoose with NestJS (`@nestjs/mongoose`).
- DTOs + Validation with `class-validator` or shared Zod schemas.
- Expose Swagger at `/api` and generate client types for frontends.
