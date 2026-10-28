import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { JWT_CONFIG } from './auth.constants.js';
import { AuthService } from './auth.service.js';

const PASSWORD = 'correct horse battery staple';

// Works whether the service method is sync or async.
const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
  };
  const jwtService = {
    sign: vi.fn((_payload: object) => 'signed.token.value'),
    signAsync: vi.fn(async (_payload: object) => 'signed.token.value'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    usersService.create.mockImplementation(
      async (data: { email: string; passwordHash: string }) => ({
        id: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: JWT_CONFIG,
          useValue: { secret: 'unit-test-secret', expiresIn: '15m' },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password before handing it to UsersService', async () => {
      await settle(() =>
        service.register({ email: 'a@example.com', password: PASSWORD }),
      );
      expect(usersService.create).toHaveBeenCalledTimes(1);
      const saved = usersService.create.mock.calls[0][0];
      expect(saved.passwordHash).toBeTypeOf('string');
      expect(saved.passwordHash).not.toBe(PASSWORD);
      expect(saved.passwordHash).not.toContain(PASSWORD);
      expect(await argon2.verify(saved.passwordHash, PASSWORD)).toBe(true);
      expect(await argon2.verify(saved.passwordHash, `${PASSWORD}!`)).toBe(
        false,
      );
    });

    it('never hands the plaintext password to UsersService', async () => {
      await settle(() =>
        service.register({ email: 'a@example.com', password: PASSWORD }),
      );
      expect(JSON.stringify(usersService.create.mock.calls)).not.toContain(
        PASSWORD,
      );
    });

    it('salts: the same password does not produce the same hash twice', async () => {
      await settle(() =>
        service.register({ email: 'a@example.com', password: PASSWORD }),
      );
      await settle(() =>
        service.register({ email: 'b@example.com', password: PASSWORD }),
      );
      const [first, second] = usersService.create.mock.calls.map(
        (c) => c[0].passwordHash,
      );
      expect(first).not.toBe(second);
    });

    it('normalizes the email (trim + lower case) before persisting', async () => {
      await settle(() =>
        service.register({ email: '  Dev@Example.COM ', password: PASSWORD }),
      );
      expect(usersService.create.mock.calls[0][0].email).toBe(
        'dev@example.com',
      );
    });

    it('does not trim or otherwise change the password', async () => {
      const padded = `  ${PASSWORD}  `;
      await settle(() =>
        service.register({ email: 'a@example.com', password: padded }),
      );
      const { passwordHash } = usersService.create.mock.calls[0][0];
      expect(await argon2.verify(passwordHash, padded)).toBe(true);
      expect(await argon2.verify(passwordHash, PASSWORD)).toBe(false);
    });

    it('returns a safe user without any credential material', async () => {
      const result = await settle(() =>
        service.register({ email: 'a@example.com', password: PASSWORD }),
      );
      expect(result).toMatchObject({ id: 7, email: 'a@example.com' });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
      expect(JSON.stringify(result)).not.toContain(PASSWORD);
    });
  });

  describe('validateUser', () => {
    let storedHash: string;
    beforeAll(async () => {
      storedHash = await argon2.hash(PASSWORD);
    });
    const stored = () => ({
      id: 3,
      email: 'dev@example.com',
      passwordHash: storedHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('returns the safe user for the right password', async () => {
      usersService.findByEmail.mockResolvedValue(stored());
      const user = await settle(() =>
        service.validateUser('dev@example.com', PASSWORD),
      );
      expect(user).toMatchObject({ id: 3, email: 'dev@example.com' });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('looks the user up by the normalized email', async () => {
      usersService.findByEmail.mockResolvedValue(stored());
      await settle(() => service.validateUser('  DEV@Example.com ', PASSWORD));
      expect(usersService.findByEmail).toHaveBeenCalledWith('dev@example.com');
    });

    it('returns null for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(stored());
      await expect(
        settle(() =>
          service.validateUser('dev@example.com', 'wrong password!!'),
        ),
      ).resolves.toBeNull();
    });

    it('returns null for an unknown email (does not throw)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        settle(() => service.validateUser('nobody@example.com', PASSWORD)),
      ).resolves.toBeNull();
    });

    it('does not accept the stored hash as a password', async () => {
      usersService.findByEmail.mockResolvedValue(stored());
      await expect(
        settle(() => service.validateUser('dev@example.com', storedHash)),
      ).resolves.toBeNull();
    });
  });

  describe('login', () => {
    const user = {
      id: 3,
      email: 'dev@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const issuedPayload = (): Record<string, unknown> => {
      const calls = [
        ...jwtService.signAsync.mock.calls,
        ...jwtService.sign.mock.calls,
      ];
      expect(calls).toHaveLength(1);
      return calls[0][0] as Record<string, unknown>;
    };

    it('returns the token produced by the JWT service', async () => {
      await expect(settle(() => service.login(user))).resolves.toEqual({
        accessToken: 'signed.token.value',
      });
    });

    it('identifies the user through the `sub` claim', async () => {
      await settle(() => service.login(user));
      expect(String(issuedPayload().sub)).toBe('3');
    });

    it('keeps the claims minimal and free of credentials', async () => {
      await settle(() => service.login(user));
      const payload = issuedPayload();
      expect(JSON.stringify(payload)).not.toMatch(/password|hash/i);
      expect(
        Object.keys(payload).filter((k) => !['sub', 'email'].includes(k)),
      ).toEqual([]);
    });
  });
});
