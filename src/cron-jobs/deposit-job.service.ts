import { Injectable, OnModuleInit } from '@nestjs/common';
import { DepositsService } from 'src/deposits/deposits.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DepositJobsService implements OnModuleInit {
  constructor(private readonly depositService: DepositsService) {}
  async onModuleInit() {
    await this.tokenDepositCron();
    // await this.depositService.fix().catch((err) => {
    //   console.error(err);
    //   process.exit(1);
    // });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tokenDepositCron() {
    console.log(
      'Running token_deposit cron job every 5 minutes to check for handleApproveLoan...',
    );

    await this.depositService.handleTokenDeposit();
  }
}
