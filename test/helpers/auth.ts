import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { http } from './app.js';

export const VALID_PASSWORD = 'correct horse battery staple';

let counter = 0;
export const uniqueEmail = (prefix = 'user'): string =>
  `${prefix}-${Date.now()}-${++counter}@example.com`;

export interface SafeUserBody {
  id: number;
  email: string;
  [key: string]: unknown;
}

export async function registerUser(
  app: INestApplication<App>,
  overrides: Record<string, unknown> = {},
): Promise<{ email: string; password: string; user: SafeUserBody }> {
  const body = { email: uniqueEmail(), password: VALID_PASSWORD, ...overrides };
  const res = await http(app).post('/auth/register').send(body);
  if (res.status !== 201) {
    throw new Error(
      `Test SETUP failed: POST /auth/register with a valid body returned ` +
        `${res.status} ${JSON.stringify(res.body)}. Fix registration first.`,
    );
  }
  return {
    email: body.email as string,
    password: body.password as string,
    user: res.body as SafeUserBody,
  };
}

export async function loginUser(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string> {
  const res = await http(app).post('/auth/login').send({ email, password });
  if (res.status !== 200 || typeof res.body.accessToken !== 'string') {
    throw new Error(
      `Test SETUP failed: POST /auth/login with valid credentials returned ` +
        `${res.status} ${JSON.stringify(res.body)}. Fix login first.`,
    );
  }
  return res.body.accessToken as string;
}

export async function registerAndLogin(
  app: INestApplication<App>,
  overrides: Record<string, unknown> = {},
) {
  const registered = await registerUser(app, overrides);
  const token = await loginUser(app, registered.email, registered.password);
  return { ...registered, token };
}

export const bearer = (token: string): [string, string] => [
  'Authorization',
  `Bearer ${token}`,
];

/** Raw row of the `users` table (bypasses entities, DTOs and `select: false`). */
export async function findUserRow(
  app: INestApplication<App>,
  email: string,
): Promise<Record<string, any> | undefined> {
  const rows: Record<string, any>[] = await app
    .get(DataSource)
    .query(`SELECT * FROM "users" WHERE "email" = $1`, [email]);
  return rows[0];
}

export async function countUsers(app: INestApplication<App>): Promise<number> {
  const rows = await app
    .get(DataSource)
    .query(`SELECT COUNT(*)::int AS n FROM "users"`);
  return rows[0].n as number;
}

export async function deleteUserRow(
  app: INestApplication<App>,
  id: number,
): Promise<void> {
  await app.get(DataSource).query(`DELETE FROM "users" WHERE "id" = $1`, [id]);
}

/** Asserts a body contains no credential material, whatever the key names. */
export function expectNoCredentials(
  body: unknown,
  plainPassword?: string,
): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toMatch(/password/i);
  expect(raw).not.toMatch(/hash/i);
  expect(raw).not.toMatch(/\$argon2|\$2[aby]\$/);
  if (plainPassword) expect(raw).not.toContain(plainPassword);
}
