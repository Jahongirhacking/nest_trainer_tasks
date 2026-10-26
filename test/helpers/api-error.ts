import { STATUS_CODES } from 'node:http';
import type request from 'supertest';

export interface FieldError {
  field: string;
  messages: string[];
}

/**
 * Asserts the documented error envelope (see ASSIGNMENT.md, "Error response
 * schema"). It never compares human-readable message text.
 *
 * - `fields: true` additionally requires a non-empty `errors` array.
 */
export function expectApiError(
  res: request.Response,
  status: number,
  options: { fields?: boolean } = {},
): FieldError[] {
  expect(res.status).toBe(status);
  const body = res.body as Record<string, unknown>;

  expect(body.statusCode).toBe(status);
  expect(body.error).toBe(STATUS_CODES[status]);
  expect(typeof body.message).toBe('string');
  expect((body.message as string).length).toBeGreaterThan(0);

  expectNoInternalDetails(res);

  if (body.errors === undefined) {
    expect(options.fields ?? false).toBe(false);
    return [];
  }
  expect(Array.isArray(body.errors)).toBe(true);
  const errors = body.errors as FieldError[];
  if (options.fields) expect(errors.length).toBeGreaterThan(0);
  for (const entry of errors) {
    expect(Object.keys(entry).sort()).toEqual(['field', 'messages']);
    expect(typeof entry.field).toBe('string');
    expect(entry.field.length).toBeGreaterThan(0);
    expect(Array.isArray(entry.messages)).toBe(true);
    expect(entry.messages.length).toBeGreaterThan(0);
    entry.messages.forEach((m) => expect(typeof m).toBe('string'));
  }
  return errors;
}

/** No stack traces / file paths, without depending on their exact text. */
export function expectNoInternalDetails(res: request.Response): void {
  const raw = JSON.stringify(res.body);
  expect(res.body).not.toHaveProperty('stack');
  expect(res.body).not.toHaveProperty('trace');
  expect(raw).not.toMatch(/\n\s+at\s/);
  expect(raw).not.toMatch(/\bat\s+\S+\s+\(.*:\d+:\d+\)/);
  expect(raw).not.toContain('node_modules');
}

export const errorFields = (errors: FieldError[]): string[] =>
  errors.map((e) => e.field);
