import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { MexcService } from '../common/mexc/mexc.service';
import { RedisService } from 'src/common/redis.service';

@Module({
  controllers: [LoansController],
  providers: [LoansService, MexcService, RedisService],
  exports: [LoansService],
})
export class LoansModule {}
