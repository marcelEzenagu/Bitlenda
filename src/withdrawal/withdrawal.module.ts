import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { RedisService } from 'src/common/redis.service';
import { MexcService } from 'src/common/mexc/mexc.service';
@Module({
  controllers: [WithdrawalController],
  providers: [WithdrawalService, RedisService, MexcService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
