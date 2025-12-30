import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { MexcService } from 'src/common/mexc/mexc.service';

@Module({
  controllers: [DepositsController],
  providers: [DepositsService, MexcService],
  exports: [DepositsService],
})
export class DepositsModule {}
