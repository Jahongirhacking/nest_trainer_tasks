import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

// TODO: Register TasksController and TasksService in this module.
@Module({
  providers: [TasksService],
  controllers: [TaskController],
})
export class TasksModule {}
