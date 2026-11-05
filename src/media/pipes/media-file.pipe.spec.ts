import { HttpException } from '@nestjs/common';
import {
  elfPayload,
  htmlPayload,
  jpegFile,
  memoryFile,
  pdfFile,
  pngFile,
  validPng,
  webpFile,
} from '../../../test/helpers/media-fixtures.js';
import { createMediaFilePipe } from './media-file.pipe.js';

/** Module C: the pipe that puts the four validators together. */
let pipe: ReturnType<typeof createMediaFilePipe>;

async function statusOf(file: unknown): Promise<number | undefined> {
  try {
    await pipe.transform(file);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    return (error as HttpException).getStatus();
  }
  return undefined;
}

describe('createMediaFilePipe()', () => {
  beforeEach(() => {
    pipe = createMediaFilePipe({ maxFileSizeBytes: 1024, maxFiles: 3 });
  });

  it.each([
    ['JPEG', jpegFile()],
    ['PNG', pngFile()],
    ['WebP', webpFile()],
    ['PDF', pdfFile()],
  ])('accepts a valid %s and returns it unchanged', async (_label, spec) => {
    const file = memoryFile(spec);
    await expect(pipe.transform(file)).resolves.toBe(file);
  });

  it('accepts a file of exactly the maximum size', async () => {
    await expect(
      pipe.transform(memoryFile(jpegFile('a.jpg', 1024))),
    ).resolves.toBeDefined();
  });

  it.each([
    ['a missing file', undefined],
    ['null', null],
    ['an empty file', memoryFile({ ...jpegFile(), buffer: Buffer.alloc(0) })],
    ['an unsupported type', memoryFile({ originalname: 'a.gif', mimetype: 'image/gif', buffer: Buffer.from('GIF89a') })],
    ['a wrong extension', memoryFile({ ...jpegFile(), originalname: 'a.exe' })],
    ['a MIME type the server never allowed', memoryFile({ ...jpegFile(), mimetype: 'text/html' })],
    ['HTML pretending to be a JPEG', memoryFile({ originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: htmlPayload() })],
    ['an executable pretending to be a JPEG', memoryFile({ originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: elfPayload() })],
    ['PNG content declared as JPEG', memoryFile({ originalname: 'a.jpg', mimetype: 'image/jpeg', buffer: validPng() })],
  ])('rejects %s with 400', async (_label, file) => {
    expect(await statusOf(file)).toBe(400);
  });

  it('rejects a file above the maximum size', async () => {
    const status = await statusOf(memoryFile(jpegFile('a.jpg', 1025)));
    expect([400, 413]).toContain(status);
  });
});
