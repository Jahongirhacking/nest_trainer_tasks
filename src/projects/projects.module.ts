import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';

/**
 * TODO: Register ProjectsController, import
 *       TypeOrmModule.forFeature([...]) with the entities this module needs,
 *       and export whatever other modules (e.g. TasksModule) must reuse.
 *       Decide deliberately whether TasksModule needs ProjectsService or just
 *       the Project repository.
 */
@Module({
  providers: [ProjectsService],
})
export class ProjectsModule {}
