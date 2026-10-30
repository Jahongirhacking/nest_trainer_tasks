import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskAssignment1793365281923 implements MigrationInterface {
    name = 'AddTaskAssignment1793365281923'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "status" character varying(20) NOT NULL DEFAULT 'todo'`);
        // Keep the invariant completed === (status = 'done') for existing rows.
        await queryRunner.query(`UPDATE "tasks" SET "status" = 'done' WHERE "completed" = true`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "assigneeId" integer`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "createdById" integer`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "assigneeId"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "status"`);
    }

}
