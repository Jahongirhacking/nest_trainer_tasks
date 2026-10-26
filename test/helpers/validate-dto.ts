import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Runs a plain payload through the same two steps `ValidationPipe` performs:
 * `plainToInstance` (class-transformer) then `validate` (class-validator),
 * with the options the assignment requires (`whitelist` +
 * `forbidNonWhitelisted`).
 *
 * Returns the names of the properties that failed validation.
 */
export async function invalidFields<T extends object>(
  dtoClass: new () => T,
  payload: unknown,
): Promise<string[]> {
  const instance = plainToInstance(dtoClass, payload) as object;
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}
