import { AllowedExtensionValidator } from './allowed-extension.validator.js';
import { AllowedMimeTypeValidator } from './allowed-mime-type.validator.js';
import { FileSignatureValidator } from './file-signature.validator.js';
import { MaxFileSizeValidator } from './max-file-size.validator.js';
import { ALLOWED_MEDIA_TYPES } from '../../media/media.constants.js';
import {
  elfPayload,
  htmlPayload,
  jpegFile,
  memoryFile,
  pdfFile,
  pngFile,
  validJpeg,
  validPng,
  wavPayload,
  webpFile,
} from '../../../test/helpers/media-fixtures.js';

/** Module C: reusable validators. Names, sizes and MIME types are client data. */
const MIMES = ALLOWED_MEDIA_TYPES.map((t) => t.mimeType);

describe('MaxFileSizeValidator', () => {
  const validator = new MaxFileSizeValidator({ maxSize: 1000 });

  it('accepts a file below and exactly at the limit', () => {
    expect(validator.isValid(memoryFile(jpegFile('a.jpg', 999)))).toBe(true);
    expect(validator.isValid(memoryFile(jpegFile('a.jpg', 1000)))).toBe(true);
  });

  it('rejects a file above the limit', () => {
    expect(validator.isValid(memoryFile(jpegFile('a.jpg', 1001)))).toBe(false);
  });

  it('rejects an empty file', () => {
    const empty = { originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: Buffer.alloc(0) };
    expect(validator.isValid(memoryFile(empty))).toBe(false);
  });

  it('does not trust the size the client/parser reports', () => {
    const big = memoryFile(jpegFile('a.jpg', 5000), 10);
    expect(validator.isValid(big)).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });

  it('has a message that does not reveal server details', () => {
    const message = validator.buildErrorMessage(memoryFile(jpegFile()));
    expect(message).toBeTypeOf('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

describe('AllowedMimeTypeValidator', () => {
  const validator = new AllowedMimeTypeValidator({ allowed: MIMES });

  it.each(MIMES)('accepts %s', (mimetype) => {
    expect(validator.isValid(memoryFile({ ...jpegFile(), mimetype }))).toBe(true);
  });

  it.each([
    ['text/html'],
    ['image/svg+xml'],
    ['image/gif'],
    ['application/octet-stream'],
    ['application/x-msdownload'],
    ['image/jpegx'],
    ['image/'],
    ['image/*'],
    [''],
  ])('rejects %j', (mimetype) => {
    expect(validator.isValid(memoryFile({ ...jpegFile(), mimetype }))).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });
});

describe('AllowedExtensionValidator', () => {
  const validator = new AllowedExtensionValidator({ types: ALLOWED_MEDIA_TYPES });
  const check = (originalname: string, mimetype = 'image/jpeg') =>
    validator.isValid(memoryFile({ ...jpegFile(), originalname, mimetype }));

  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['PHOTO.JPG', 'image/jpeg'],
    ['logo.png', 'image/png'],
    ['banner.webp', 'image/webp'],
    ['report.pdf', 'application/pdf'],
    ['my.holiday.photo.jpg', 'image/jpeg'],
  ])('accepts %s declared as %s', (name, mime) => {
    expect(check(name, mime)).toBe(true);
  });

  it.each([
    ['no extension', 'photo'],
    ['a script', 'shell.php'],
    ['an executable', 'setup.exe'],
    ['a double extension', 'photo.jpg.exe'],
    ['a trailing space', 'photo.jpg '],
    ['a trailing dot', 'photo.jpg.'],
    ['only an extension', '.jpg'],
    ['a NUL byte', 'photo.jpg\0.exe'],
    ['an unsupported image', 'anim.gif'],
    ['svg', 'vector.svg'],
  ])('rejects %s', (_label, name) => {
    expect(check(name)).toBe(false);
  });

  it('rejects an extension that does not belong to the declared MIME type', () => {
    expect(check('logo.png', 'image/jpeg')).toBe(false);
    expect(check('report.pdf', 'image/png')).toBe(false);
  });

  it('is not fooled by directory parts in the name', () => {
    expect(check('../../etc/passwd')).toBe(false);
    expect(check('..\\..\\boot.ini')).toBe(false);
    expect(check('folder.jpg/evil')).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });
});

describe('FileSignatureValidator', () => {
  const validator = new FileSignatureValidator({ allowed: MIMES });

  it.each([
    ['JPEG', jpegFile()],
    ['PNG', pngFile()],
    ['WebP', webpFile()],
    ['PDF', pdfFile()],
  ])('accepts real %s content', (_label, spec) => {
    expect(validator.isValid(memoryFile(spec))).toBe(true);
  });

  it('rejects HTML renamed to .jpg and declared as an image', () => {
    const spoof = { originalname: 'cat.jpg', mimetype: 'image/jpeg', buffer: htmlPayload() };
    expect(validator.isValid(memoryFile(spoof))).toBe(false);
  });

  it('rejects an executable renamed to .jpg and declared as an image', () => {
    const spoof = { originalname: 'cat.jpg', mimetype: 'image/jpeg', buffer: elfPayload() };
    expect(validator.isValid(memoryFile(spoof))).toBe(false);
  });

  it('rejects real content whose declared MIME type is different', () => {
    const png = { originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: validPng() };
    const jpeg = { originalname: 'a.png', mimetype: 'image/png', buffer: validJpeg() };
    const pdfAsImage = { ...pdfFile(), mimetype: 'image/png' };
    expect(validator.isValid(memoryFile(png))).toBe(false);
    expect(validator.isValid(memoryFile(jpeg))).toBe(false);
    expect(validator.isValid(memoryFile(pdfAsImage))).toBe(false);
  });

  it('rejects a RIFF container that is not WebP (WAV)', () => {
    const wav = { originalname: 'a.webp', mimetype: 'image/webp', buffer: wavPayload() };
    expect(validator.isValid(memoryFile(wav))).toBe(false);
  });

  it.each([[0], [1], [2]])('rejects a JPEG buffer cut after %i byte(s)', (length) => {
    const tiny = { ...jpegFile(), buffer: validJpeg().subarray(0, length) };
    expect(validator.isValid(memoryFile(tiny))).toBe(false);
  });

  it('rejects a file whose content was not loaded (no buffer)', () => {
    const noBuffer = { ...memoryFile(jpegFile()), buffer: undefined };
    expect(validator.isValid(noBuffer)).toBe(false);
  });

  it('rejects a type it has no signature for, even if "allowed"', () => {
    const odd = new FileSignatureValidator({ allowed: ['image/gif'] });
    const gif = { originalname: 'a.gif', mimetype: 'image/gif', buffer: Buffer.from('GIF89a') };
    expect(odd.isValid(memoryFile(gif))).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });
});
