import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
} from '@nestjs/common';
import { PositiveIntParam } from '../common/decorators/positive-int-param.decorator.js';
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
@Controller('projects')
export class ProjectsController {
  // TODO: inject ProjectsService through the constructor.
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() _dto: CreateProjectDto): Promise<Project> {
    // TODO: POST /projects
    return this.projectsService.create(_dto);
  }

  @Get()
  findAll(): Promise<Project[]> {
    // TODO: GET /projects
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@PositiveIntParam('id') _id: number): Promise<Project> {
    // TODO: GET /projects/:id
    return this.projectsService.findOne(_id);
  }

  @Patch(':id')
  update(
    @PositiveIntParam('id') _id: number,
    @Body() _dto: UpdateProjectDto,
  ): Promise<Project> {
    // TODO: PATCH /projects/:id
    return this.projectsService.update(_id, _dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@PositiveIntParam('id') _id: number): Promise<void> {
    // TODO: DELETE /projects/:id
    return this.projectsService.remove(_id);
  }
}
