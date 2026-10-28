import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../common/database/postgres-errors.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { Project } from './entities/project.entity.js';

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
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async create(_dto: CreateProjectDto): Promise<Project> {
    try {
      // TODO: create a project. Duplicate name -> ConflictException (409).
      const project = this.projectsRepository.create(_dto);
      return await this.projectsRepository.save(project);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Project name already taken');
      throw err;
    }
  }

  findAll(): Promise<Project[]> {
    // TODO: list all projects.
    return this.projectsRepository.find();
  }

  async findOne(_id: number): Promise<Project> {
    // TODO: return the project or throw NotFoundException.
    const project = await this.projectsRepository.findOne({
      where: { id: _id },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(_id: number, _dto: UpdateProjectDto): Promise<Project> {
    // TODO: update; 404 if missing; 409 on name conflict with ANOTHER project.
    const changes = Object.fromEntries(
      Object.entries(_dto).filter(([, value]) => value !== undefined),
    );
    if (!Object.keys(changes).length)
      throw new BadRequestException('Empty body');
    const project = await this.findOne(_id);
    Object.assign(project, changes);
    try {
      return await this.projectsRepository.save(project);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Project name already taken');
      throw err;
    }
  }

  async remove(_id: number): Promise<void> {
    const project = await this.findOne(_id);

    try {
      await this.projectsRepository.remove(project);
    } catch (err: unknown) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException(
          'Cannot delete project because it has tasks',
        );
      }

      throw err;
    }
  }
}
