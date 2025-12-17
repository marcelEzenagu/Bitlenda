import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TakeLoanDto } from './dto/loan.dto';
import { MexcService } from 'src/common/mexc/mexc.service';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { RedisService } from 'src/common/redis.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// import { generateShortId } from 'src/utils/generateId';
@Injectable()
export class LoansService {
  private readonly collateralPercent: number;
  private readonly loanPercent: number;

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly mexcService: MexcService,
    private redisClient: RedisService,
  ) {
    this.collateralPercent = Number(process.env.COLLATERAL_PERCENT);
    this.loanPercent = Number(process.env.LOAN_PERCENT);
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  async approveLoanCron() {
    console.log(
      'Running deposit cron job every 3 hours to check for handleApproveLoan...',
    );

    // await this.handleApproveLoan();
  }
  // @Cron(CronExpression.EVERY_3_HOURS)
  async loadMexcAccount() {
    console.log(
      'Running deposit cron job every 3 hours to check for handleApproveLoan...',
    );

    // MEXC
    await this.createMexSubAccountsBatch();
  }
  async createMexSubAccountsBatch() {
    console.log('RUNNING createMexSubAccountsBatch');

    const prefix = 'bitlendA';
    const start = 1;
    const end = 10;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    for (let i = start; i <= end; i++) {
      const subAccount = `${prefix}${i}`;
      const note = subAccount;

      console.log(`Processing ${subAccount}`);

      try {
        //  Create subaccount API key
        const res = await this.mexcService.createSubAccountApiKey(
          subAccount,
          note,
        );

        // 730101 = already exists on MEXC
        if (res.code === '730101') {
          console.log(`${subAccount} already exists on MEXC — skipping`);
          continue;
        }

        // Insert only on success
        await this.knex('mexc_sub_accounts').insert({
          sub_account: subAccount,
          note,
          api_key: res.apikey,
          secret_key: res.secretKey,
          created_at: new Date(),
        });

        console.log(`${subAccount} created`);
      } catch (err) {
        // duplicate insert = safe retry
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`${subAccount} already in DB — skipping`);
          continue;
        }

        console.error(`Failed on ${subAccount}`, err);
      }

      // ⏱ respect rate limits
      await sleep(3000);
    }

    console.log('All subaccounts processed');
  }

  async addMex() {
    console.log('RUNNING createMexSub_Account — inserting M1–M13');

    const prefix = 'kochureM';
    const start = 1;
    const end = 1000;

    for (let i = start; i <= end; i++) {
      const subAccountName = `${prefix}${i}`;
      console.log(`Inserting subaccount: ${subAccountName}`);

      try {
        await this.knex('mexc_sub_accounts').insert({
          sub_account: subAccountName,
          note: subAccountName,
          created_at: new Date(),
        });
      } catch (err) {
        console.error(`Error inserting subaccount ${subAccountName}:`, err);
      }
    }

    console.log('All subaccounts inserted');
  }

  async handleApproveLoan() {
    // get assetDeposits
    const startTime = new Date().getMilliseconds();

    const deposits = await this.mexcService.getSubAccountDeposits(startTime);

    let recordsLength = 0;
    if (deposits != undefined && deposits.length > 0) {
      for (const recharge of deposits) {
        recordsLength++;
        console.log('RECORD', recordsLength, 'OUT OF ', deposits.length);
        const unlockConfirm = Number(recharge.unlockConfirm);
        const confirmTimes = Number(recharge.confirmTimes);

        let { coin, amount, status, address, txId, memo } = recharge;

        if (status == '5' && confirmTimes >= unlockConfirm) {
          if (coin.split('-').length > 0) {
            coin = coin.split('-')[0];
          }

          const pendingLoanStr = await this.redisClient.getValue(
            'deposit_' + address,
          );
          if (pendingLoanStr) {
            const pendingLoan = JSON.parse(pendingLoanStr);

            // get assetBalance for the loanAsset
            const { coin, amount, collateralAmount, repayment_amount, txid } =
              pendingLoan;
            if (pendingLoan.coin.toUpperCase() == coin.toUpperCase()) {
              // compare with pendingLoans with assetBalance;
              const asset = await this.knex('assets')
                .where({ email: pendingLoan.email, coin: coin })
                .first();
              if (asset) {
                const userAssetBalance = Number(asset.balance);
                if (userAssetBalance >= pendingLoan.amountInAsset) {
                  const trx = await this.knex.transaction();

                  // lock bal for update
                  const availableBalResponse = await trx.raw(
                    'SELECT bal FROM users WHERE email=? FOR UPDATE',
                    [pendingLoan.email],
                  );
                  try {
                    // increase user-naira balance by deposit.amount
                    await trx('users')
                      .where({ email: pendingLoan.email })
                      .increment({ bal: pendingLoan.amount })
                      .update({});

                    // markLoan as approved and notify user
                    await trx('loans')
                      .insert({
                        email: pendingLoan.email,
                        requested_amount: amount,
                        repayment_amount,
                        collateral_amount: collateralAmount,
                        collateral_asset: coin,
                        rate: this.loanPercent,
                        deposit_txid: txid,
                        status: 'APPROVED',
                      })
                      .onConflict('deposit_txid')
                      .ignore();

                    // put it in transaction log
                    await trx('transactions').insert({
                      type: 'LOAN_DISBURSE',
                      user_id: '',
                      direction: 'credit',
                      amount: amount,
                      description: '',
                      asset: 'NGN',
                      loan_id: '',
                    });

                    // put it in loanHistory log
                  } catch (e) {
                    console.log('Error approving loan: ', e);
                  }
                }
              }
            }
            console.log(
              `Approving loan for deposit to address ${address} of amount ${amount} ${coin}`,
            );
            // Logic to approve loan goes here
          }
        }
      }
    }
    // redis-compare with pendingLoans;

    // get assetBalance for the loanAsset
    // increase user-naira balance by deposit.amount
    // markLoan as approved and notify user
    // put it in transaction log
    // put it in loanHistory log
    // Logic to check for new deposits goes here
  }

  handleCryptoDeposit() {
    // get all deposits and compare with pendingLoans;
    // if true, approve loan and notify user;
    // increase assetBalance
    return { amount: '', status: 1 };
  }
  // async takeLoan(data: {
  //   userId: string;
  //   loanAmount: number;
  //   collateralAsset: string;
  //   collateralAmount: number;
  //   rate: number;
  // }) {
  //   const id = 'generateShortId();';

  //   await this.knex('loans').insert({
  //     id,
  //     userId: data.userId,
  //     loanAmount: data.loanAmount,
  //     balance: data.loanAmount,
  //     collateralAsset: data.collateralAsset,
  //     collateralAmount: data.collateralAmount,
  //     rate: data.rate,
  //     status: 'PENDING',
  //   });

  //   return this.getLoan(id);
  // }

  // async getLoanOffer(dto: TakeLoanDto) {
  //   const { amount, cryptoType } = dto;

  //   // Calculate collateral requirements
  //   const collateralRequired = amount * (1 + this.collateralPercent / 100);
  //   const collateralMinRequired =
  //     amount * (1 + this.collateralPercent / 2 / 100);

  //   // Generate short ID for loan reference
  //   const loanId = 'this.generateShortId();';

  //   // Insert loan record
  //   const [loan] = await this.knex('loans')
  //     .insert({
  //       loan_id: loanId,
  //       user_id: userId,
  //       amount,
  //       balance: amount,
  //       collateral_asset: cryptoType,
  //       collateral_required: collateralRequired,
  //       collateral_min_required: collateralMinRequired,
  //       collateral_current_value: 0,
  //       status: 'PENDING',
  //     })
  //     .returning('*');

  //   return {
  //     message: 'Loan created. Collateral deposit required.',
  //     loan,
  //   };
  // }

  async requestLoan(dto: TakeLoanDto, userEmail: string) {
    const { amount, cryptoType, address } = dto;

    if (!address) {
      throw new Error('Deposit address is required to take a loan.');
    }
    // check assetPrice
    // return assetPrice; rate; depositAmount

    // Calculate collateral requirements
    const repayment_amount = amount * (1 + this.loanPercent / 100);
    const collateral = amount * (1 + this.collateralPercent / 100);
    const collateralMinRequired =
      amount * (1 + this.collateralPercent / 2 / 100);

    const nairaRate = await this.getNairaRate();
    const collateralUSD = collateral / nairaRate;

    const asset = await this.knex('cryptos')
      .where('coin', cryptoType.toUpperCase())
      .first();

    const amountInUSd = amount / nairaRate;
    const assetRateInNaira = asset.price * nairaRate;

    const collateralRequired = Number(collateralUSD / asset.price).toFixed(8);
    const amountInAsset = (amountInUSd / asset.price).toFixed(8);
    const loan = {
      rate: this.loanPercent,
      collateralPriceInNaira: nairaRate,
      amount,
      repayment_amount,
      collateralPercent: this.collateralPercent,
      amountInAsset: Number(amountInAsset),
      collateralRequired: Number(collateralRequired),
      assetRateInNaira,
      coin: cryptoType,
      email: userEmail,
    };

    await this.redisClient.setTimedValue(
      'deposit_' + address,
      JSON.stringify(loan),
      1800,
    );

    return loan;
  }

  async getLoanOffer(dto: TakeLoanDto) {
    const { amount, cryptoType } = dto;

    // check assetPrice
    // return assetPrice; rate; depositAmount

    // Calculate collateral requirements
    const repayment_amount = amount * (1 + this.loanPercent / 100);
    const collateral = amount * (1 + this.collateralPercent / 100);
    const collateralMinRequired =
      amount * (1 + this.collateralPercent / 2 / 100);

    const nairaRate = await this.getNairaRate();
    const collateralUSD = collateral / nairaRate;

    // console.log('repayment_amount: ', repayment_amount);
    // getCryptoPrice(cryptoType);
    // Generate short ID for loan reference
    const asset = await this.knex('cryptos')
      .where('coin', cryptoType.toUpperCase())
      .first();

    const amountInUSd = amount / nairaRate;
    const assetRateInNaira = asset.price * nairaRate;

    const collateralRequired = (collateralUSD / asset.price).toFixed(8);
    const amountInAsset = (amountInUSd / asset.price).toFixed(8);
    const loan = {
      rate: this.loanPercent,
      collateralRequired,
      collateralPriceInNaira: nairaRate,
      amount,
      repayment_amount,
      collateralPercent: this.collateralPercent,
      amountInAsset,
      assetRateInNaira,
    };

    return {
      message: 'OK',
      loan,
    };
  }

  async getAddress(user, dto: TakeLoanDto) {
    try {
      const { amount, cryptoType } = dto;

      // check assetPrice
      // return assetPrice; rate; depositAmount

      // Calculate collateral requirements
      // const repayment_amount = amount * (1 + this.loanPercent / 100);
      // const collateral = amount * (1 + this.collateralPercent / 100);
      // const collateralMinRequired =
      //   amount * (1 + this.collateralPercent / 2 / 100);

      // const nairaRate = await this.getNairaRate();
      // const collateralUSD = nairaRate * collateral;

      // getCryptoPrice(cryptoType);
      // Generate short ID for loan reference
      const asset = await this.knex('cryptos')
        .where('coin', cryptoType.toUpperCase())
        .first();
      // const collateralRequired = collateralUSD / asset.price;

      let wallet = await this.knex('wallets')
        .where({
          email: user.email,
          coin: cryptoType,
          network: asset.network,
        })
        .first();
      let addressDetails = null;
      if (!wallet) {
        addressDetails = await this.mexcService.getOrCreateSubAccAddress(
          user,
          cryptoType,
          asset.network,
        );
        addressDetails.chainName = undefined;
        addressDetails.chainDisplayName = undefined;

        dto.address = addressDetails.address;
        await this.knex('wallets').insert({
          asset_id: user.asset_id,
          email: user.email,
          provider_username: user.mexc_username,
          network: addressDetails.network,
          coin: dto.cryptoType,
          address: addressDetails.address,
          memo: addressDetails.memo ? addressDetails.memo : '',
        });
        wallet = addressDetails;
      } else {
        dto.address = wallet.address;
        // wallet = addressDetails;
      }

      // let loanData = undefined;

      const loanData = await this.requestLoan(dto, user.email);
      const { coin, network, address, memo } = wallet;

      return {
        message: 'address retrieved successfully.',
        addressDetails: { coin, network, address, memo },
        loanData,
      };
    } catch (err) {
      console.log('Error in getAddress: ', err);
      throw err;
    }
  }

  async takeLoan(user, network, dto: TakeLoanDto) {
    const { amount, cryptoType } = dto;

    // Calculate collateral requirements
    const repayment_amount = amount * (1 + this.loanPercent / 100);
    const collateralRequired = amount * (1 + this.collateralPercent / 100);
    const collateralMinRequired =
      amount * (1 + this.collateralPercent / 2 / 100);

    // Generate short ID for loan reference

    // Insert loan record
    const [loan] = await this.knex('loans')
      .insert({
        user_id: user.id,
        amount,
        balance: amount,
        collateral_asset: cryptoType,
        collateral_required: collateralRequired,
        collateral_min_required: collateralMinRequired,
        // collateral_current_value: 0,
        repayment_amount,
        status: 'PENDING',
      })
      .returning('*');

    // getAssetDepositAddress
    const depositAddress = this.mexcService.getOrCreateSubAccAddress(
      user,
      cryptoType,
      network,
    );

    return {
      message: 'Loan created. Collateral deposit required.',
      loan,
    };
  }

  async getUserLoans(userId: string) {
    return this.knex('loans').where({ userId }).orderBy('created_at', 'desc');
  }

  async getRangedLoans(params: { startDate: string; endDate: string }) {
    const { startDate, endDate } = params;

    return this.knex('loans')
      .whereBetween('created_at', [startDate, endDate])
      .orderBy('created_at', 'desc');
  }

  async getLoan(id: string) {
    return this.knex('loans').where({ id }).first();
  }

  async completeLoan(id: string) {
    await this.knex('loans').where({ id }).update({
      status: 'COMPLETED',
      balance: 0,
    });

    return this.getLoan(id);
  }

  // async updatebalance(id: string, amount: number) {
  //   // subtract repayment from balance

  //   await this.knex('loans')
  //     .where({ id })
  //     .update({
  //       balance: this.knex.raw('balance - ?', [amount]),
  //     });

  //   return this.getLoan(id);
  // }

  // async processCollateralDepositWebhook(deposit: {
  //   userId: number;
  //   loanId: string;
  //   cryptoAmount: number;
  //   usdValue: number; // price * cryptoAmount
  // }) {
  //   const { userId, loanId, usdValue } = deposit;

  //   // Fetch loan
  //   const loan = await this.knex('loans')
  //     .where({ loan_id: loanId, user_id: userId })
  //     .first();

  //   if (!loan) {
  //     throw new Error('Loan not found');
  //   }

  //   // Update collateral current value
  //   const newCollateralValue = Number(loan.collateral_current_value) + usdValue;

  //   await this.knex('loans').where({ loan_id: loanId }).update({
  //     collateral_current_value: newCollateralValue,
  //     updated_at: this.knex.fn.now(),
  //   });

  //   // If collateral is now enough, approve loan
  //   if (
  //     newCollateralValue >= loan.collateral_required &&
  //     loan.status === 'PENDING'
  //   ) {
  //     await this.knex('loans').where({ loan_id: loanId }).update({
  //       status: 'APPROVED',
  //       approved_at: this.knex.fn.now(),
  //       updated_at: this.knex.fn.now(),
  //     });

  //     // Record transaction
  //     await this.knex('transactions').insert({
  //       type: 'LOAN_DISBURSE',
  //       loan_id: loan.id,
  //       user_id: userId,
  //       amount: loan.amount,
  //       status: 'SUCCESS',
  //       reference: this.generateReference(),
  //     });
  //   }

  //   return { success: true };
  // }

  // async checkCollateralHealthCron() {
  //   const loans = await this.knex('loans')
  //     .whereIn('status', ['APPROVED'])
  //     .select();

  //   for (const loan of loans) {
  //     const price = await this.getCryptoPrice(loan.collateral_asset);
  //     const currentValue = loan.crypto_amount * price; // store deposited amount in loan or another table

  //     // Update collateral value
  //     await this.knex('loans').where({ id: loan.id }).update({
  //       collateral_current_value: currentValue,
  //       updated_at: this.knex.fn.now(),
  //     });

  //     // If collateral dropped below minimum
  //     if (currentValue <= loan.collateral_min_required) {
  //       // If grace period not already set
  //       if (!loan.grace_period_until) {
  //         await this.knex('loans')
  //           .where({ id: loan.id })
  //           .update({
  //             grace_period_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
  //           });

  //         await this.notifyUser(
  //           loan.user_id,
  //           'Collateral value too low. Please top up.',
  //         );
  //       }

  //       // If grace period expired
  //       if (loan.grace_period_until && new Date() > loan.grace_period_until) {
  //         await this.liquidateLoan(loan.id);
  //       }
  //     }
  //   }
  // }

  async getNairaRate() {
    const key = 'exchange_rates';
    const getVal = await this.redisClient.getValue(key);
    console.log('getNairaRate value', getVal);

    return Number(getVal);
  }
}
