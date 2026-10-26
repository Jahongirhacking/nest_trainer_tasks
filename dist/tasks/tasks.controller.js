var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Controller } from '@nestjs/common';
let TasksController = class TasksController {
    create(dto) {
        void dto;
        throw new Error('Not implemented');
    }
    findAll() {
        throw new Error('Not implemented');
    }
    findOne(id) {
        void id;
        throw new Error('Not implemented');
    }
    update(id, dto) {
        void id;
        void dto;
        throw new Error('Not implemented');
    }
    remove(id) {
        void id;
        throw new Error('Not implemented');
    }
};
TasksController = __decorate([
    Controller()
], TasksController);
export { TasksController };
//# sourceMappingURL=tasks.controller.js.map