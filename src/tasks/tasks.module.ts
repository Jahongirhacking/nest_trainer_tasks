import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

/**
 * TODO: Register TasksController, import TypeOrmModule.forFeature([...]) with
 *       the entities this module needs, and import whatever it needs from
 *       ProjectsModule (avoid circular module dependencies).
 */
@Module({
  providers: [TasksService],
})
export class TasksModule {}
