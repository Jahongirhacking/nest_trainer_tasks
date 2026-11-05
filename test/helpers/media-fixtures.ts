import type { UploadedFileLike } from '../../src/common/validators/uploaded-file.interface.js';

/**
 * Test data for Task 7: tiny but structurally valid files, and files that LOOK
 * valid by name or MIME type but are not. These are fixtures, not a reference
 * for your signature checks: research the formats yourself.
 */
const pad = (head: Buffer, size: number): Buffer =>
  size <= head.length
    ? head
    : Buffer.concat([head, Buffer.alloc(size - head.length, 0x20)]);

export const validJpeg = (size = 0): Buffer =>
  pad(
    Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]),
    size,
  );

export const validPng = (size = 0): Buffer =>
  pad(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    ),
    size,
  );

export const validWebp = (size = 0): Buffer =>
  pad(
    Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x1a, 0x00, 0x00, 0x00]),
      Buffer.from('WEBPVP8L'),
      Buffer.from([0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x10]),
      Buffer.alloc(8),
    ]),
    size,
  );

export const validPdf = (size = 0): Buffer =>
  pad(
    Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
        '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n' +
        'trailer\n<< /Root 1 0 R >>\n%%EOF\n',
    ),
    size,
  );

/** HTML with a script: a classic "image" that is really an XSS payload. */
export const htmlPayload = (): Buffer =>
  Buffer.from('<html><script>alert(document.cookie)</script></html>');

/** Starts like a Linux executable. */
export const elfPayload = (): Buffer =>
  Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01]), Buffer.alloc(32)]);

/** A RIFF container that is NOT WebP (a WAV file). */
export const wavPayload = (): Buffer =>
  Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WAVEfmt '),
    Buffer.alloc(24),
  ]);

export interface FileSpec {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/** An in-memory Multer file as the validators and the service receive it. */
export function memoryFile(spec: FileSpec, claimedSize?: number): UploadedFileLike {
  return {
    originalname: spec.originalname,
    mimetype: spec.mimetype,
    buffer: spec.buffer,
    size: claimedSize ?? spec.buffer.length,
  };
}

export const jpegFile = (name = 'photo.jpg', size = 0): FileSpec => ({
  originalname: name,
  mimetype: 'image/jpeg',
  buffer: validJpeg(size),
});
export const pngFile = (name = 'logo.png', size = 0): FileSpec => ({
  originalname: name,
  mimetype: 'image/png',
  buffer: validPng(size),
});
export const webpFile = (name = 'banner.webp', size = 0): FileSpec => ({
  originalname: name,
  mimetype: 'image/webp',
  buffer: validWebp(size),
});
export const pdfFile = (name = 'report.pdf', size = 0): FileSpec => ({
  originalname: name,
  mimetype: 'application/pdf',
  buffer: validPdf(size),
});
