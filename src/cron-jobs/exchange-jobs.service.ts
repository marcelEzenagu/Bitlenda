import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { CountryCurrencyService } from 'src/country_currency/country_currency.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { RedisService } from 'src/common/redis.service';

@Injectable()
export class ExchangeJobService implements OnApplicationBootstrap {
  constructor(
    private readonly exchangeService: CountryCurrencyService,
    private redisClient: RedisService,
  ) {}
  onApplicationBootstrap() {
    // This runs IMMEDIATELY when the server restarts
    console.log('Server restarted. Running startup task...');
    this.loadExchangeRateCron();
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  async loadExchangeRateCron() {
    const key = 'exchange_rates';

    const result = await axios.get(process.env.EXCHANGE_URL);

    console.log(
      'Cron job running every EVERY_3_HOURS',
      result.data.conversion_rates['NGN'],
    );
    const responseData = JSON.stringify(result.data.conversion_rates['NGN']);
    this.redisClient.setValue(key, responseData);
    console.log('End of Cron job running every EVERY_3_HOURS');
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async loadCountryCron() {
    await this.exchangeService.handleLoadCountry();
  }
}
