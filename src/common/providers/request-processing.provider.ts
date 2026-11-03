import type { Provider } from '@nestjs/common';
import { REQUEST_PROCESSING_CONFIG } from '../tokens/request-processing.tokens.js';

/**
 * Registration of the `RequestProcessingConfig` provider.
 *
 * SCAFFOLDING: the factory throws, so a module that really uses this provider
 * (instead of the test override) does not start. That is why nothing imports
 * `RequestProcessingModule` in AppModule yet.
 *
 * TODO: Choose and justify the provider pattern (`useValue`, `useClass`,
 *       `useFactory` or `useExisting`) and make the provider build the config
 *       from the environment with `loadRequestProcessingConfig()`. Think about
 *       WHEN `process.env` is read: at import time or when the module is
 *       created? The provider spec stubs the environment per test.
 */
export const requestProcessingConfigProvider: Provider = {
  provide: REQUEST_PROCESSING_CONFIG,
  useFactory: () => {
    throw new Error('Not implemented');
  },
};
