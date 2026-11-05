import { buildMulterOptions } from './multer.config.js';
import { loadUploadLimits } from './upload-limits.js';

/** Module B: upload limits and the Multer options built from them. */
describe('loadUploadLimits()', () => {
  it('returns the documented defaults for an empty environment', () => {
    expect(loadUploadLimits({})).toEqual({
      maxFileSizeBytes: 5 * 1024 * 1024,
      maxFiles: 5,
    });
  });

  it('reads both variables', () => {
    expect(
      loadUploadLimits({ MEDIA_MAX_FILE_SIZE_BYTES: '1024', MEDIA_MAX_FILES: '2' }),
    ).toEqual({ maxFileSizeBytes: 1024, maxFiles: 2 });
  });

  it('returns an immutable object', () => {
    expect(Object.isFrozen(loadUploadLimits({}))).toBe(true);
  });

  it.each([
    ['MEDIA_MAX_FILE_SIZE_BYTES', ''],
    ['MEDIA_MAX_FILE_SIZE_BYTES', '0'],
    ['MEDIA_MAX_FILE_SIZE_BYTES', '-1'],
    ['MEDIA_MAX_FILE_SIZE_BYTES', '1.5'],
    ['MEDIA_MAX_FILE_SIZE_BYTES', '1e3'],
    ['MEDIA_MAX_FILE_SIZE_BYTES', 'abc'],
    ['MEDIA_MAX_FILES', ''],
    ['MEDIA_MAX_FILES', '0'],
    ['MEDIA_MAX_FILES', '3.5'],
    ['MEDIA_MAX_FILES', 'many'],
  ])('rejects %s=%j and names the variable', (name, value) => {
    expect(() => loadUploadLimits({ [name]: value })).toThrow(new RegExp(name));
  });
});

const limitsOf = (options: ReturnType<typeof buildMulterOptions>) =>
  options.limits as Record<string, number | undefined>;

describe('buildMulterOptions()', () => {
  const limits = { maxFileSizeBytes: 4096, maxFiles: 3 };

  it('applies the size and file count limits', () => {
    const l = limitsOf(buildMulterOptions(limits));
    expect(l.fileSize).toBe(4096);
    expect(l.files).toBe(3);
  });

  it('also bounds fields, parts and field size (no endless multipart bodies)', () => {
    const l = limitsOf(buildMulterOptions(limits));
    for (const key of ['fields', 'parts', 'fieldSize'] as const) {
      expect(l[key], key).toBeTypeOf('number');
      expect(Number.isFinite(l[key]), key).toBe(true);
    }
  });

  it('chooses a storage on purpose (no implicit temp-directory writes)', () => {
    expect(buildMulterOptions(limits).storage).toBeDefined();
  });

  it('does not share state between calls', () => {
    const a = buildMulterOptions({ maxFileSizeBytes: 10, maxFiles: 1 });
    const b = buildMulterOptions({ maxFileSizeBytes: 20, maxFiles: 2 });
    expect(limitsOf(a).fileSize).toBe(10);
    expect(limitsOf(b).fileSize).toBe(20);
  });
});
