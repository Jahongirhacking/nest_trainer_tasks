import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  buildTypeOrmOptions,
  loadEnvFile,
} from './database/database.config.js';
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
    ProjectsModule,
    TasksModule,
  ],
})
export class AppModule {}
