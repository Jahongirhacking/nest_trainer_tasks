import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

/**
 * TODO: Register ProjectsController, import
 *       TypeOrmModule.forFeature([...]) with the entities this module needs,
 *       and export whatever other modules (e.g. TasksModule) must reuse.
 *       Decide deliberately whether TasksModule needs ProjectsService or just
 *       the Project repository.
 */
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  imports: [TypeOrmModule.forFeature([Project])],
  exports: [ProjectsService],
})
export class ProjectsModule {}
