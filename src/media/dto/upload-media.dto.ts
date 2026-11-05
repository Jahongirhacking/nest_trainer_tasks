/**
 * Non-file fields of an upload request (multipart text parts).
 *
 * The global ValidationPipe runs with `forbidNonWhitelisted`, so any extra text
 * field is a 400 unless it is declared here.
 *
 * TODO: Decide whether the upload accepts ANY text field. The tests expect an
 *       unknown field such as `role=admin` to be rejected with 400.
 */
export class UploadMediaDto {}
