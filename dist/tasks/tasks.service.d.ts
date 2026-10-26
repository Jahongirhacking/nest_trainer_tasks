import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import type { Task } from './entities/task.entity.js';
export declare class TasksService {
    create(dto: CreateTaskDto): Task;
    findAll(): Task[];
    findOne(id: number): Task;
    update(id: number, dto: UpdateTaskDto): Task;
    remove(id: number): void;
}
