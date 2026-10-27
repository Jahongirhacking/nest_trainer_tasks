import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { buildTypeOrmOptions, loadEnvFile } from './database.config.js';

/**
 * DataSource used ONLY by the TypeORM CLI (migration:generate / run / revert /
 * show). The running application is configured in AppModule instead.
 *
 * The CLI loads this file from the COMPILED output, so run `pnpm build`
 * first and point the CLI at `dist/database/data-source.js`
 * (see the `migration:*` scripts in package.json).
 */
loadEnvFile();

// `autoLoadEntities` is a NestJS-only option; the plain DataSource rejects it.
const { autoLoadEntities: _autoLoad, ...options } =
  buildTypeOrmOptions() as DataSourceOptions & { autoLoadEntities?: boolean };

export default new DataSource({
  ...options,
  entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
  migrations: [join(import.meta.dirname, '..', 'migrations', '*.js')],
});
