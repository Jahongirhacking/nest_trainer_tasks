import { MigrationInterface, QueryRunner } from "typeorm";

export class UserTable1793278924686 implements MigrationInterface {
    name = 'UserTable1793278924686'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
