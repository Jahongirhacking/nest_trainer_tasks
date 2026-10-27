import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import type { Project } from './entities/project.entity.js';

/**
 * NOTE: every body below is TEMPORARY SCAFFOLDING (HTTP 501). Keep the method
 * names and parameter order: the tests depend on them.
 *
 * TODO: Inject the Project repository with @InjectRepository(Project) and
 *       implement every method on top of it (no arrays).
 * TODO: Translate KNOWN database errors only (see
 *       src/common/database/postgres-errors.ts); let everything else surface.
 */
@Injectable()
export class ProjectsService {
  create(_dto: CreateProjectDto): Promise<Project> {
    // TODO: create a project. Duplicate name -> ConflictException (409).
    throw new NotImplementedException('ProjectsService.create');
  }

  findAll(): Promise<Project[]> {
    // TODO: list all projects.
    throw new NotImplementedException('ProjectsService.findAll');
  }

  findOne(_id: number): Promise<Project> {
    // TODO: return the project or throw NotFoundException.
    throw new NotImplementedException('ProjectsService.findOne');
  }

  update(_id: number, _dto: UpdateProjectDto): Promise<Project> {
    // TODO: update; 404 if missing; 409 on name conflict with ANOTHER project.
    throw new NotImplementedException('ProjectsService.update');
  }

  remove(_id: number): Promise<void> {
    // TODO: 404 if missing; 409 if the project still has tasks; never cascade.
    // TODO: think about what happens if a task is inserted between your check
    //       and your delete (ASSIGNMENT.md, "Concurrency").
    throw new NotImplementedException('ProjectsService.remove');
  }
}
