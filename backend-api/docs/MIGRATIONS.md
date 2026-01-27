# MongoDB Atlas Migrations (Team Standard)

This project uses a simple, explicit migration runner so schema/data changes stay
consistent across team members and Atlas environments.

## 1) Environment Setup

Each developer creates a local `.env` file from `.env.example`:

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to the shared Atlas cluster.
3. Keep `MONGODB_DB_NAME` the same across the team (for dev).

Important:
- Do not commit `.env`.
- Only commit `.env.example`.

## 2) How Migrations Work

The migration runner lives at:
- `src/database/migrations/index.js`

Applied migrations are tracked in MongoDB collection:
- `__migrations` (configurable via `MONGODB_MIGRATIONS_COLLECTION`)

Migrations are plain JS files inside:
- `src/database/migrations`

Each migration exports:

```js
module.exports = {
  id: '20260127-some-change',
  description: 'What this migration does',
  async up(ctx) {},
  async down(ctx) {},
};
```

## 3) Commands

Run from `backend-api/`:

1. Apply all pending migrations:
```bash
npm run migrate
```

2. Roll back the last applied migration:
```bash
npm run migrate:down
```

3. See status:
```bash
npm run migrate:status
```

## 4) Team Workflow (Required)

When changing entities/models:

1. Update mongoose models.
2. Add a new migration file with a timestamp prefix.
3. Ensure migrations are idempotent:
   - Use `updateOne(..., { upsert: true })`
   - Or check for existing docs before creating.
4. Run locally:
   - `npm run migrate:status`
   - `npm run migrate`
5. Commit together:
   - Model changes
   - Migration file
   - Any docs updates

Rule:
- No one should pull model changes without also running migrations.

