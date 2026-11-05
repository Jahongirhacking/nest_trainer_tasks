import { loadStorageConfig } from './storage.config.js';

/** Module E: configuration injected into the storage layer. */
describe('loadStorageConfig()', () => {
  it('reads the root and defaults the driver to "local"', () => {
    expect(loadStorageConfig({ STORAGE_LOCAL_ROOT: '/srv/media' })).toEqual({
      driver: 'local',
      localRoot: '/srv/media',
    });
  });

  it('accepts the driver "local" explicitly', () => {
    const config = loadStorageConfig({
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_ROOT: '/srv/media',
    });
    expect(config.driver).toBe('local');
  });

  it('returns an immutable object', () => {
    expect(
      Object.isFrozen(loadStorageConfig({ STORAGE_LOCAL_ROOT: '/srv/media' })),
    ).toBe(true);
  });

  it.each([
    ['STORAGE_LOCAL_ROOT', undefined],
    ['STORAGE_LOCAL_ROOT', ''],
    ['STORAGE_LOCAL_ROOT', '   '],
    ['STORAGE_LOCAL_ROOT', 'uploads'],
    ['STORAGE_LOCAL_ROOT', './uploads'],
    ['STORAGE_LOCAL_ROOT', '../uploads'],
  ])('rejects %s=%j and names the variable', (name, value) => {
    expect(() => loadStorageConfig({ [name]: value })).toThrow(new RegExp(name));
  });

  it.each(['s3', 'LOCAL', ''])('rejects STORAGE_DRIVER=%j and names the variable', (driver) => {
    expect(() =>
      loadStorageConfig({ STORAGE_DRIVER: driver, STORAGE_LOCAL_ROOT: '/srv/media' }),
    ).toThrow(/STORAGE_DRIVER/);
  });

  it('only looks at the env it is given, never at process.env', () => {
    vi.stubEnv('STORAGE_LOCAL_ROOT', '/from/process/env');
    try {
      expect(() => loadStorageConfig({})).toThrow(/STORAGE_LOCAL_ROOT/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
