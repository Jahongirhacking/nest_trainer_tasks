import { Module } from '@nestjs/common';
import { loadUploadLimits } from './config/upload-limits.js';
import { UPLOAD_LIMITS } from './media.constants.js';

@Module({
  providers: [
    { provide: UPLOAD_LIMITS, useFactory: () => loadUploadLimits(process.env) },
  ],
  exports: [UPLOAD_LIMITS],
})
export class UploadConfigModule {}
