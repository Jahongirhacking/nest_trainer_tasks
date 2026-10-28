import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
  type INestApplication,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  signTestJwt,
  tamperPayload,
  TEST_JWT_AUDIENCE,
  TEST_JWT_ISSUER,
  TEST_JWT_SECRET,
} from '../../../test/helpers/jwt.js';
import { UsersService } from '../../users/users.service.js';
import { JWT_CONFIG } from '../auth.constants.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

const jwtConfig = {
  secret: TEST_JWT_SECRET,
  expiresIn: '15m',
  issuer: TEST_JWT_ISSUER,
  audience: TEST_JWT_AUDIENCE,
};
const stored = {
  id: 5,
  email: 'dev@example.com',
  passwordHash: '$argon2id$never-expose-me',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JwtStrategy', () => {
  const usersService = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  };

  @Controller('probe')
  class ProbeController {
    @UseGuards(JwtAuthGuard)
    @Get()
    probe(@Req() req: { user: unknown }) {
      return { user: req.user };
    }
  }

  let app: INestApplication;
  let strategy: JwtStrategy;

  beforeEach(async () => {
    vi.clearAllMocks();
    usersService.findById.mockImplementation(async (id: number) =>
      id === stored.id ? { ...stored } : null,
    );
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProbeController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: JWT_CONFIG, useValue: jwtConfig },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    strategy = moduleRef.get(JwtStrategy);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('validate(payload)', () => {
    it('loads the CURRENT user from the database by the token subject', async () => {
      await strategy.validate({ sub: 5 });
      expect(usersService.findById).toHaveBeenCalledWith(5);
    });

    it('accepts a numeric-string subject', async () => {
      await expect(strategy.validate({ sub: '5' })).resolves.toMatchObject({
        id: 5,
      });
    });

    it('returns a principal without credential material', async () => {
      const principal = await strategy.validate({ sub: 5 });
      expect(principal).toMatchObject({ id: 5, email: 'dev@example.com' });
      expect(principal).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(principal)).not.toContain('never-expose-me');
    });

    it('does not copy untrusted claims into the principal', async () => {
      const principal = await strategy.validate({
        sub: 5,
        role: 'admin',
        roles: ['admin'],
        permissions: ['*'],
      } as any);
      expect(principal).not.toHaveProperty('role');
      expect(principal).not.toHaveProperty('roles');
      expect(principal).not.toHaveProperty('permissions');
    });

    it('rejects a token whose user no longer exists', async () => {
      await expect(strategy.validate({ sub: 999 })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['zero', 0],
      ['negative', -1],
      ['fractional', 1.5],
      ['a non-numeric string', 'abc'],
      ['an empty string', ''],
      ['an object', { $ne: 0 }],
      ['an array', [5]],
    ])(
      'rejects a malformed subject (%s) without querying the database',
      async (_l, sub) => {
        await expect(strategy.validate({ sub } as any)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(usersService.findById).not.toHaveBeenCalled();
      },
    );
  });

  describe('through Passport (token verification)', () => {
    const get = (token?: string) => {
      const req = request(app.getHttpServer()).get('/probe');
      return token === undefined
        ? req
        : req.set('Authorization', `Bearer ${token}`);
    };

    it('accepts a valid token and exposes a safe principal', async () => {
      const res = await get(signTestJwt({ sub: 5 })).expect(200);
      expect(res.body.user).toMatchObject({ id: 5, email: 'dev@example.com' });
      expect(JSON.stringify(res.body)).not.toContain('never-expose-me');
    });

    it('rejects a request without a token', async () => {
      await get().expect(401);
    });

    it('rejects a malformed token', async () => {
      await get('not.a.jwt').expect(401);
      await get('garbage').expect(401);
    });

    it('rejects a token signed with another secret', async () => {
      await get(
        signTestJwt(
          { sub: 5 },
          { secret: 'another-secret-entirely-0123456789' },
        ),
      ).expect(401);
    });

    it('rejects an expired token', async () => {
      await get(signTestJwt({ sub: 5 }, { expiresInSeconds: -60 })).expect(401);
    });

    it('rejects a token without an expiration', async () => {
      await get(signTestJwt({ sub: 5, exp: undefined }, {})).expect(401);
    });

    it('rejects an unsigned (alg "none") token', async () => {
      await get(signTestJwt({ sub: 5 }, { alg: 'none' })).expect(401);
    });

    it('rejects a token whose payload was tampered with', async () => {
      const token = tamperPayload(signTestJwt({ sub: 5 }), { sub: 6 });
      await get(token).expect(401);
    });

    it('rejects a token with the wrong issuer', async () => {
      await get(signTestJwt({ sub: 5 }, { issuer: 'someone-else' })).expect(
        401,
      );
      await get(signTestJwt({ sub: 5 }, { issuer: null })).expect(401);
    });

    it('rejects a token with the wrong audience', async () => {
      await get(signTestJwt({ sub: 5 }, { audience: 'another-api' })).expect(
        401,
      );
      await get(signTestJwt({ sub: 5 }, { audience: null })).expect(401);
    });

    it('rejects a token whose subject is unknown or malformed', async () => {
      await get(signTestJwt({ sub: 999 })).expect(401);
      await get(signTestJwt({ sub: 'abc' })).expect(401);
      await get(signTestJwt({})).expect(401);
    });

    it('treats a deleted user as unauthenticated even with a valid token', async () => {
      const token = signTestJwt({ sub: 5 });
      await get(token).expect(200);
      usersService.findById.mockResolvedValue(null);
      await get(token).expect(401);
    });

    it('does not read the token from the query string', async () => {
      await request(app.getHttpServer())
        .get('/probe')
        .query({ access_token: signTestJwt({ sub: 5 }) })
        .expect(401);
    });

    it('does not accept another authorization scheme', async () => {
      await request(app.getHttpServer())
        .get('/probe')
        .set('Authorization', `Basic ${signTestJwt({ sub: 5 })}`)
        .expect(401);
    });
  });
});
