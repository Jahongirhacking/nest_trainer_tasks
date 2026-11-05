import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { buildMulterOptions } from './config/multer.config.js';
import { Media } from './entities/media.entity.js';
import { UploadLimits } from './interfaces/media.interface.js';
import { UPLOAD_LIMITS } from './media.constants.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { UploadConfigModule } from './upload-config.module.js';

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
  imports: [
    TypeOrmModule.forFeature([Media]),
    StorageModule,
    MulterModule.registerAsync({
      imports: [UploadConfigModule],
      inject: [UPLOAD_LIMITS],
      useFactory: (limits: UploadLimits) => buildMulterOptions(limits),
    }),
    UploadConfigModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
