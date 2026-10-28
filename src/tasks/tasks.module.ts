import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { ProjectsModule } from '../projects/projects.module.js';

/**
 * TODO: Register TasksController, import TypeOrmModule.forFeature([...]) with
 *       the entities this module needs, and import whatever it needs from
 *       ProjectsModule (avoid circular module dependencies).
 */
@Module({
  providers: [TasksService],
  controllers: [TasksController],
  imports: [TypeOrmModule.forFeature([Task]), ProjectsModule],
})
export class TasksModule {}
