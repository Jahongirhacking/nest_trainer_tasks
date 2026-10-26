import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from '@nestjs/common';

/**
 * OPTIONAL scaffold: decide whether you need this class at all.
 *
 * Nest already turns every `HttpException` into `{ statusCode, message, error }`.
 * The gap between that default and the schema in ASSIGNMENT.md is the
 * `errors: [{ field, messages }]` list for validation failures and a plain
 * string `message`. You can close that gap with a filter (this file), or at the
 * source (see HINTS.md), or both: justify your choice.
 *
 * If you use it, keep it focused on HTTP error formatting:
 *  - preserve the original status code,
 *  - do not re-implement validation rules,
 *  - do not swallow unexpected (non-HTTP) errors,
 *  - never include stack traces or internal details in the response.
 *
 * TODO: implement `catch()` and register the filter (see `configureApp`).
 *       Until then do NOT register this class: an empty `catch()` would leave
 *       requests hanging.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(_exception: HttpException, _host: ArgumentsHost): void {
    // TODO: read the response object from `_host`, build the documented
    //       error body from the exception, and send it with the same status.
  }
}
