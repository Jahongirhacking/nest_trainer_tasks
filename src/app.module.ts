import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  buildTypeOrmOptions,
  loadEnvFile,
} from './database/database.config.js';
import { AuthModule } from './auth/auth.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { ProjectsModule } from './projects/projects.module.js';
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
  ],
})
export class AppModule {}
