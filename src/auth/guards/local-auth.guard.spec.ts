import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  type INestApplication,
} from '@nestjs/common';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Strategy } from 'passport-local';
import { LocalAuthGuard } from './local-auth.guard.js';

/**
 * The guard is tested against a STUB "local" strategy defined in this file,
 * so these tests check the guard's behaviour independently of your
 * LocalStrategy implementation.
 */
const validateSpy = vi.fn();
const handlerSpy = vi.fn();

class StubLocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor() {
    super({ usernameField: 'email' });
  }
  validate(email: string, password: string) {
    validateSpy(email, password);
    if (password !== 'right-password') throw new UnauthorizedException();
    return { id: 42, email };
  }
}

@Controller('probe')
class ProbeController {
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: { user: unknown }) {
    handlerSpy(req.user);
    return { ok: true };
  }
}

describe('LocalAuthGuard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProbeController],
      providers: [StubLocalStrategy, LocalAuthGuard],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => vi.clearAllMocks());

  const login = (body: object) =>
    request(app.getHttpServer()).post('/probe/login').send(body);

  it('invokes the configured "local" strategy with the submitted credentials', async () => {
    await login({ email: 'a@example.com', password: 'right-password' });
    expect(validateSpy).toHaveBeenCalledWith('a@example.com', 'right-password');
  });

  it('lets the handler run and exposes the principal on the request', async () => {
    await login({ email: 'a@example.com', password: 'right-password' }).expect(
      201,
    );
    expect(handlerSpy).toHaveBeenCalledTimes(1);
    expect(handlerSpy.mock.calls[0][0]).toEqual({
      id: 42,
      email: 'a@example.com',
    });
  });

  it('rejects invalid credentials with 401 and never runs the handler', async () => {
    await login({ email: 'a@example.com', password: 'wrong' }).expect(401);
    expect(handlerSpy).not.toHaveBeenCalled();
  });

  it('rejects a request without credentials and never runs the handler', async () => {
    const res = await login({});
    expect([400, 401]).toContain(res.status);
    expect(handlerSpy).not.toHaveBeenCalled();
  });
});
