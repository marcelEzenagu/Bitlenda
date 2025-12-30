import { Module } from '@nestjs/common';
import { LoanJobsService } from './loans-jobs.service';
import { DepositJobsService } from './deposit-job.service';
import { LoansModule } from 'src/loans/loans.module';
import { DepositsModule } from 'src/deposits/deposits.module';

@Module({
  providers: [LoanJobsService, DepositJobsService],
  //   exports: [DepositsService],
  imports: [LoansModule, DepositsModule],
})
export class CronJobModule {}
