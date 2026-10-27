import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import type { Task } from './entities/task.entity.js';

/**
 * NOTE: every body below is TEMPORARY SCAFFOLDING (HTTP 501). The Task 1/2
 * in-memory implementation was removed on purpose: Task 3 replaces the array
 * with a TypeORM repository. Keep the method names and parameter order.
 *
 * TODO: Inject the Task repository with @InjectRepository(Task) (and whatever
 *       you need to verify that the parent project exists).
 * TODO: Never let the client set id, projectId, createdAt or updatedAt.
 * TODO: Translate KNOWN database errors only; let everything else surface.
 */
@Injectable()
export class TasksService {
  create(_projectId: number, _dto: CreateTaskDto): Promise<Task> {
    // TODO: 404 if the project does not exist; completed defaults to false.
    throw new NotImplementedException('TasksService.create');
  }

  findAll(): Promise<Task[]> {
    // TODO: all tasks, via a database query.
    throw new NotImplementedException('TasksService.findAll');
  }

  findAllByProject(_projectId: number): Promise<Task[]> {
    // TODO: 404 if the project does not exist; only that project's tasks.
    throw new NotImplementedException('TasksService.findAllByProject');
  }

  findOne(_id: number): Promise<Task> {
    // TODO: the task or NotFoundException.
    throw new NotImplementedException('TasksService.findOne');
  }

  update(_id: number, _dto: UpdateTaskDto): Promise<Task> {
    // TODO: reject an empty body (400); 404 if missing; no project reassignment.
    throw new NotImplementedException('TasksService.update');
  }

  remove(_id: number): Promise<void> {
    // TODO: 404 if missing; must not touch the parent project.
    throw new NotImplementedException('TasksService.remove');
  }
}
