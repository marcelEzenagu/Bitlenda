import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { MexcService } from 'src/common/mexc/mexc.service';
import { PalmPayService } from 'src/common/helpers/palmpay';

@Module({
  controllers: [DepositsController],
  providers: [DepositsService, MexcService, PalmPayService],
  // imports: [PalmPayService],
  exports: [DepositsService],
})
export class DepositsModule {}
