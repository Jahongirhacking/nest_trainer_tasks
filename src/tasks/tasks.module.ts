import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

// TODO: Register TasksController and TasksService in this module.
@Module({
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
