import type { User } from '../users/entities/user.entity.js';

/** Injection token for the validated JWT settings (see auth.config.ts). */
export const JWT_CONFIG = Symbol('JWT_CONFIG');

export interface JwtConfig {
  /** Signing secret. Never hard-coded, never defaulted. */
  secret: string;
  /** Lifetime of an access token, e.g. "15m". */
  expiresIn: string;
  /** Optional: when set, issuance AND validation must both use it. */
  issuer?: string;
  /** Optional: when set, issuance AND validation must both use it. */
  audience?: string;
}

/** Claims you choose to put in the token. Keep this list minimal. */
export interface JwtPayload {
  sub: number | string;
}

/** A user without any credential material. Safe to return to clients. */
export type SafeUser = Omit<User, 'passwordHash'>;

/** Passport strategy names. The provided tests rely on these exact names. */
export const LOCAL_STRATEGY = 'local';
export const JWT_STRATEGY = 'jwt';
