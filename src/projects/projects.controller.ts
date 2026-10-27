import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import type { Project } from './entities/project.entity.js';
import { ProjectsService } from './projects.service.js';

/**
 * NOTE: scaffolding. Keep the method names and parameter order: the
 * controller unit tests call them directly.
 *
 * TODO: Replace @Injectable() with @Controller('projects'), inject
 *       ProjectsService, and add the route decorators, @Param (with
 *       ParsePositiveIntPipe), @Body and the status code decorators
 *       (POST 201, DELETE 204) for every endpoint in ASSIGNMENT.md.
 */
@Injectable()
export class ProjectsController {
  // TODO: inject ProjectsService through the constructor.
  constructor(private readonly projectsService: ProjectsService) {}

  create(_dto: CreateProjectDto): Promise<Project> {
    // TODO: POST /projects
    throw new NotImplementedException('ProjectsController.create');
  }

  findAll(): Promise<Project[]> {
    // TODO: GET /projects
    throw new NotImplementedException('ProjectsController.findAll');
  }

  findOne(_id: number): Promise<Project> {
    // TODO: GET /projects/:id
    throw new NotImplementedException('ProjectsController.findOne');
  }

  update(_id: number, _dto: UpdateProjectDto): Promise<Project> {
    // TODO: PATCH /projects/:id
    throw new NotImplementedException('ProjectsController.update');
  }

  remove(_id: number): Promise<void> {
    // TODO: DELETE /projects/:id
    throw new NotImplementedException('ProjectsController.remove');
  }
}
