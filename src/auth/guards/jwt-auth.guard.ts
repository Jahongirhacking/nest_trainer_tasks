import {
  CanActivate,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';

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
export class JwtAuthGuard implements CanActivate {
  canActivate(): boolean {
    throw new NotImplementedException('TODO: JwtAuthGuard');
  }
}
