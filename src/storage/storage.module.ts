import { Module } from '@nestjs/common';
import { loadStorageConfig } from './config/storage.config.js';
import { LocalStorageService } from './services/local-storage.service.js';
import { STORAGE_CONFIG, STORAGE_SERVICE } from './tokens/storage.tokens.js';

/**
 * Registers the storage layer. Consumers inject `STORAGE_SERVICE` (the
 * interface), never `LocalStorageService`.
 *
 * TODO: Justify the provider patterns used here (`useFactory` for the config,
 *       `useClass` for the service). When is `process.env` read? What would
 *       you change to select S3 with an environment variable?
 */
@Module({
  providers: [
    { provide: STORAGE_CONFIG, useFactory: () => loadStorageConfig(process.env) },
    { provide: STORAGE_SERVICE, useClass: LocalStorageService },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
