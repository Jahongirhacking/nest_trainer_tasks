import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_STRATEGY } from '../auth.constants.js';

/**
 * Protects endpoints with the "jwt" strategy.
 *
 * SCAFFOLDING: denies everything until you implement it (fails closed).
 *
 * TODO: Make it a guard backed by Passport's "jwt" strategy: unauthenticated
 *       requests get 401 and the protected handler never runs; authenticated
 *       requests get the principal on the request.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY) {}
