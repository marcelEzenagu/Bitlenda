import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { RedisService } from 'src/common/redis.service';
@Module({
  controllers: [WithdrawalController],
  providers: [WithdrawalService, RedisService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
