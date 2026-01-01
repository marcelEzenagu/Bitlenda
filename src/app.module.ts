import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { LoansModule } from './loans/loans.module';
import { CountryCurrencyModule } from './country_currency/country_currency.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DepositsModule } from './deposits/deposits.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CronJobModule } from './cron-jobs/cron-jobs.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';

@Module({
  imports: [
    AuthModule,
    ScheduleModule.forRoot(),

    UserModule,
    CountryCurrencyModule,
    DatabaseModule,
    LoansModule,
    DepositsModule,
    TransactionsModule,
    CronJobModule,
    WithdrawalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
