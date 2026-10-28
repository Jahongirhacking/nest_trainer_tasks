Migrations live here (`*.ts`). They are compiled to `dist/migrations/*.js` by
`pnpm build` and executed by the TypeORM CLI.

Existing migrations belong to Task 3 (`projects`, `tasks`). **Do not edit or
delete them.** Task 4 adds ONE new migration for the `users` table, after the
`User` entity is finished and registered in `UsersModule`:

```bash
pnpm db:up                                         # development database
pnpm migration:generate src/migrations/AddUsers    # builds, then diffs entities vs. database
```

Then REVIEW the generated file before running it:

- `up()` must only `CREATE TABLE "users"` (plus its constraints). Any `DROP`,
  `ALTER` of `projects`/`tasks`, or data change means an entity is wrong.
- Check `email` is `UNIQUE`, `passwordHash` is `NOT NULL`, timestamps are
  `TIMESTAMP WITH TIME ZONE`.
- `down()` must undo exactly what `up()` did.

```bash
pnpm migration:show      # pending migrations
pnpm migration:run       # apply to the development database
pnpm migration:revert    # undo the last one (then run it again to be sure)
```

The test database is rebuilt from your migrations automatically
(`test/global-setup.ts`). Until the migration exists, the auth e2e and
integration tests fail because the `users` table is missing.
`synchronize` stays off; never turn it on to "fix" a missing table.
