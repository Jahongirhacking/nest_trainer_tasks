import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../rbac/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../rbac/rbac.types.js';
import type { MediaMetadata } from './interfaces/media.interface.js';
import { MediaService } from './media.service.js';

/**
 * NOTE: scaffolding. Every handler answers HTTP 501 until you implement it.
 * Keep the routes. The order matters: `upload/multiple` and `upload` must not
 * be captured by `:id`.
 *
 *   POST   /media/upload            201  one file, field "file"
 *   POST   /media/upload/multiple   201  several files, field "files"
 *   GET    /media                   200  own files (?category, ?page, ?limit)
 *   GET    /media/:id               200  metadata
 *   GET    /media/:id/download      200  the bytes
 *   DELETE /media/:id               204  no body
 *
 * TODO: Add the interceptors (`FileInterceptor` / `FilesInterceptor` with the
 *       options from src/media/config/multer.config.ts), the file pipe, the
 *       `@UploadedFile()` / `@UploadedFiles()` parameters, the id and query
 *       pipes and the response headers. Authentication is already applied
 *       (JwtAuthGuard, Task 4); do NOT add a second login mechanism.
 * TODO: Keep the controller thin: no filesystem, no repository, no
 *       `if (user.role === ...)`; delegate to MediaService.
 * TODO: Download: the response must not let the browser run the content
 *       (think `Content-Disposition`, `X-Content-Type-Options`) and the
 *       original name in the header must be encoded safely.
 */
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  upload(@CurrentUser() _user: AuthenticatedUser): Promise<MediaMetadata> {
    void this.mediaService;
    throw new NotImplementedException();
  }

  @Post('upload/multiple')
  uploadMultiple(
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<MediaMetadata[]> {
    throw new NotImplementedException();
  }

  @Get()
  list(@CurrentUser() _user: AuthenticatedUser): Promise<MediaMetadata[]> {
    throw new NotImplementedException();
  }

  @Get(':id')
  getOne(@CurrentUser() _user: AuthenticatedUser): Promise<MediaMetadata> {
    throw new NotImplementedException();
  }

  @Get(':id/download')
  download(@CurrentUser() _user: AuthenticatedUser): Promise<void> {
    throw new NotImplementedException();
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@CurrentUser() _user: AuthenticatedUser): Promise<void> {
    throw new NotImplementedException();
  }
}
