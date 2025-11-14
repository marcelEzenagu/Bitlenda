import { Global, Module } from '@nestjs/common';
import { knexProvider } from './knex.config';

@Global()
@Module({
  providers: [knexProvider],
  exports: [knexProvider],
})
export class DatabaseModule {}
