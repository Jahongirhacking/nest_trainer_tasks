# NestJS Training – Task Management API

Current assignment: **Task 3 – Persistent Task Management API with TypeORM and PostgreSQL**.

- Start with [ASSIGNMENT.md](ASSIGNMENT.md). Hints are in [HINTS.md](HINTS.md) (read them level by level), and the grading rubric is in [EVALUATION.md](EVALUATION.md).
- Earlier assignments are preserved in [docs/task_1/](docs/task_1/) and [docs/task_2/](docs/task_2/). Their in-memory e2e suites are in `test/legacy/` and are no longer run.

Requires **Node.js 24** (see `.nvmrc`; Node 18 cannot run the toolchain), pnpm and Docker (or a local PostgreSQL 16).

Quick start: `cp .env.example .env` → fill in passwords → `pnpm install` → `pnpm db:up` → `pnpm test`.
