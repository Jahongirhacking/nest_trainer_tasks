import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from '../auth.service.js';
import { LocalStrategy } from './local.strategy.js';

const user = {
  id: 1,
  email: 'dev@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  const authService = { validateUser: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();
    strategy = moduleRef.get(LocalStrategy);
  });

  it('asks AuthService to validate the submitted credentials', async () => {
    authService.validateUser.mockResolvedValue(user);
    await strategy.validate('Dev@Example.com', 'my password 123');
    expect(authService.validateUser).toHaveBeenCalledTimes(1);
    const [email, password] = authService.validateUser.mock.calls[0];
    expect(email.trim().toLowerCase()).toBe('dev@example.com');
    expect(password).toBe('my password 123');
  });

  it('returns the authenticated principal for valid credentials', async () => {
    authService.validateUser.mockResolvedValue(user);
    await expect(strategy.validate('dev@example.com', 'pw')).resolves.toEqual(
      user,
    );
  });

  it('never exposes a password hash, even if the service returned one', async () => {
    authService.validateUser.mockResolvedValue({
      ...user,
      passwordHash: '$argon2id$x',
    });
    const principal = await strategy.validate('dev@example.com', 'pw');
    expect(principal).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid credentials with UnauthorizedException', async () => {
    authService.validateUser.mockResolvedValue(null);
    await expect(
      strategy.validate('dev@example.com', 'bad'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses one public message for every failed login', async () => {
    authService.validateUser.mockResolvedValue(null);
    const messages = await Promise.all(
      ['dev@example.com', 'nobody@example.com'].map((email) =>
        strategy
          .validate(email, 'bad')
          .catch((e: UnauthorizedException) => e.message),
      ),
    );
    expect(messages[0]).toBe(messages[1]);
    expect(messages[0]).not.toContain('@');
  });
});
