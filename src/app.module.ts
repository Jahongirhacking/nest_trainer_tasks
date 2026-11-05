import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { RequestProcessingModule } from './common/request-processing.module.js';
import {
  buildTypeOrmOptions,
  loadEnvFile,
} from './database/database.config.js';
import { MediaModule } from './media/media.module.js';
import { UploadConfigModule } from './media/upload-config.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { TasksModule } from './tasks/tasks.module.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        loadEnvFile();
        return buildTypeOrmOptions();
      },
    }),
    AuthModule,
    ProjectsModule,
    TasksModule,
    RbacModule,
    RequestProcessingModule,
    MediaModule,
    UploadConfigModule,
  ],
})
export class AppModule {}
