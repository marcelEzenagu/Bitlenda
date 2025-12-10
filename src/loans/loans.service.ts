import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TakeLoanDto } from './dto/loan.dto';
import { MexcService } from 'src/common/mexc/mexc.service';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { RedisService } from 'src/common/redis.service';

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

  async requestLoan(dto: TakeLoanDto) {
    const { amount, cryptoType, address } = dto;

    if (!address) {
      throw new Error('Deposit address is required to take a loan.');
    }
    // check assetPrice
    // return assetPrice; rate; depositAmount

    // Calculate collateral requirements
    const repayment_amount = amount * (1 + this.loanPercent / 100);
    const collateral = amount * (1 + this.collateralPercent / 100);
    // const collateralMinRequired =
    //   amount * (1 + this.collateralPercent / 2 / 100);

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

      const addressDetails = await this.mexcService.getOrCreateSubAccAddress(
        user,
        cryptoType,
        asset.network,
      );

      let loanData = undefined;
      if (addressDetails.address) {
        dto.address = addressDetails.address;

        loanData = await this.requestLoan(dto);
      }

      return {
        message: 'address retrieved successfully.',
        addressDetails,
        loanData,
      };
    } catch (err) {
      console.log('Error in getAddress: ', err);
      // throw err;
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
    const loanId = 'this.generateShortId();';

    console.log('');

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
