import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { MexcService } from 'src/common/mexc/mexc.service';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoansService } from 'src/loans/loans.service';

@Injectable()
export class LoanJobsService implements OnModuleInit {
  private readonly collateralPercent: number;
  private readonly loanPercent: number;
  private readonly loanProcessingTime: number;

  constructor(private readonly loanService: LoansService) {}

  async onModuleInit() {
    await this.loanService.handleApproveLoan();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async approveLoanCron() {
    console.log(
      'Running approveLoan cron job every 5 minutes to check for handleApproveLoan...',
    );

    await this.loanService.handleApproveLoan();
  }
}
