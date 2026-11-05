import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TODO: Create the `media` table for the `Media` entity.
 *
 * Do not write it from memory: finish the entity, then generate a draft
 *   pnpm migration:generate src/migrations/CreateMedia
 * and REVIEW it (src/migrations/README.md): a real foreign key to "users",
 * UNIQUE "storageKey", NOT NULL where the data model says so, CHECK
 * constraints, an index for "files of a user", `timestamptz` columns.
 * `down()` must undo exactly what `up()` did.
 *
 * Until `up()` creates the table, test/integration/media.int-spec.ts and
 * test/media.e2e-spec.ts fail on purpose. If you generate a new migration,
 * delete this skeleton: two migrations must not create the same table.
 */
export class CreateMedia1793880000000 implements MigrationInterface {
  name = 'CreateMedia1793880000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // TODO: CREATE TABLE "media" ...
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // TODO: DROP TABLE "media"
  }
}
