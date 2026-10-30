import type { Fixture } from './rbac-app.js';

export type Method = 'get' | 'post' | 'patch' | 'delete';

/** Sends a request as the account with id `as` (or anonymously when omitted). */
export function call(
  f: Fixture,
  method: Method,
  url: string,
  as?: number,
  body?: object,
) {
  let req = f.http()[method](url);
  if (as !== undefined) req = req.set(...f.as(as));
  return body ? req.send(body) : req;
}
