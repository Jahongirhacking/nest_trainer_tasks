import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { loadUploadLimits } from './config/upload-limits.js';
import { Media } from './entities/media.entity.js';
import { MediaController } from './media.controller.js';
import { UPLOAD_LIMITS } from './media.constants.js';
import { MediaService } from './media.service.js';

/**
 * Wiring of the Task 7 feature.
 *
 * SCAFFOLDING: this module is NOT imported by AppModule yet, because its
 * providers read configuration that you still have to implement (starting the
 * application would fail). The e2e tests import it themselves and override the
 * configuration.
 *
 * TODO: Register Multer for this module (`MulterModule.registerAsync` with
 *       `buildMulterOptions`) or pass the options per interceptor - decide and
 *       justify.
 * TODO: Import MediaModule in AppModule once `loadStorageConfig` and
 *       `loadUploadLimits` work (test/media-registration.e2e-spec.ts checks it) and
 *       add `STORAGE_LOCAL_ROOT` to your `.env` (see .env.example).
 * TODO: `PaginationPipe` (Task 6) needs `REQUEST_PROCESSING_CONFIG`: import the
 *       module that provides it instead of re-declaring the provider.
 * TODO: JwtAuthGuard needs the "jwt" Passport strategy registered by
 *       AuthModule. Do not import AuthModule again.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Media]), StorageModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    { provide: UPLOAD_LIMITS, useFactory: () => loadUploadLimits(process.env) },
  ],
  exports: [MediaService],
})
export class MediaModule {}
