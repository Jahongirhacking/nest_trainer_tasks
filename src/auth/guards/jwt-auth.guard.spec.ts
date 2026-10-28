import {
  Controller,
  Get,
  Req,
  UseGuards,
  type INestApplication,
} from '@nestjs/common';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { signTestJwt } from '../../../test/helpers/jwt.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * The guard is tested against a STUB "jwt" strategy defined in this file, so
 * these tests check the guard's behaviour independently of your JwtStrategy.
 */
const SECRET = 'guard-spec-secret-0123456789-0123456789';
const validateSpy = vi.fn();
const handlerSpy = vi.fn();

class StubJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET,
      algorithms: ['HS256'],
    });
  }
  validate(payload: { sub: number }) {
    validateSpy(payload);
    return { id: payload.sub };
  }
}

@Controller('probe')
class ProbeController {
  @UseGuards(JwtAuthGuard)
  @Get()
  probe(@Req() req: { user: unknown }) {
    handlerSpy(req.user);
    return { ok: true };
  }
}

describe('JwtAuthGuard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProbeController],
      providers: [StubJwtStrategy, JwtAuthGuard],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => vi.clearAllMocks());

  const get = (token?: string) => {
    const req = request(app.getHttpServer()).get('/probe');
    return token === undefined
      ? req
      : req.set('Authorization', `Bearer ${token}`);
  };

  it('invokes the configured "jwt" strategy', async () => {
    await get(signTestJwt({ sub: 9 }, { secret: SECRET }));
    expect(validateSpy).toHaveBeenCalledTimes(1);
  });

  it('lets the handler run and exposes the principal on the request', async () => {
    await get(signTestJwt({ sub: 9 }, { secret: SECRET })).expect(200);
    expect(handlerSpy).toHaveBeenCalledWith({ id: 9 });
  });

  it.each([
    ['no token', undefined],
    ['a malformed token', 'abc.def.ghi'],
    ['a token with a bad signature', signTestJwt({ sub: 9 })],
    [
      'an expired token',
      signTestJwt({ sub: 9 }, { secret: SECRET, expiresInSeconds: -30 }),
    ],
  ])(
    'rejects %s with 401 and never runs the handler',
    async (_label, token) => {
      await get(token).expect(401);
      expect(handlerSpy).not.toHaveBeenCalled();
    },
  );
});
