import { Module } from '@nestjs/common';
import { CountryCurrencyService } from './country_currency.service';
import { CountryCurrencyController } from './country_currency.controller';
import { RedisService } from 'src/common/redis.service';

@Module({
  controllers: [CountryCurrencyController],
  providers: [CountryCurrencyService, RedisService],
})
export class CountryCurrencyModule {}
