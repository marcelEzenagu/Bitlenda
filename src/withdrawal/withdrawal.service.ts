import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  HttpCode,
  HttpStatus,
  BadGatewayException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateWithdrawalDto } from './dto/update-withdrawal.dto';
import { HelperUtils } from 'src/common/helpers/helpers';
import { WITHDRAW_TYPE, WithdrawDto } from './dto/withdrawal.dto';
import { RedisService } from 'src/common/redis.service';
import { MexcService } from 'src/common/mexc/mexc.service';

@Injectable()
export class WithdrawalService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly mexcService: MexcService,

    private redisService: RedisService,
  ) {}
  create(createWithdrawalDto: CreateWithdrawalDto) {
    return 'This action adds a new withdrawal';
  }

  findAll() {
    return `This action returns all withdrawal`;
  }

  findOne(id: number) {
    return `This action returns a #${id} withdrawal`;
  }

  update(id: number, updateWithdrawalDto: UpdateWithdrawalDto) {
    return `This action updates a #${id} withdrawal`;
  }

  remove(id: number) {
    return `This action removes a #${id} withdrawal`;
  }

  async Withdraw(email, dto: WithdrawDto) {
    // confirm withdrawalCode

    const { amount, withdrawType, asset, address } = dto;
    if (withdrawType == WITHDRAW_TYPE.CASH_WITHDRAW) {
      // lock bal for update
      const trx = await this.knex.transaction();
      try {
        const reference = HelperUtils.generateReferenceNo();
        const availableBalResponse = await trx.raw(
          'SELECT bal FROM users WHERE email=? FOR UPDATE',
          [email],
        );

        const balance = availableBalResponse[0][0]['bal'];
        console.log(
          balance,
          // amount > availableBalResponse,
          'BALANC',
          availableBalResponse[0][0],
        );
        // return;
        if (amount > balance) {
          throw new BadRequestException('insufficient balance');
        }
        await trx('transactions').insert({
          type: 'FIAT_WITHDRAW',
          email,
          direction: 'debit',
          amount: amount,
          description: `withdrawal of ${amount}NGN`,
          asset: 'NGN',
          reference,
        });
        // debit users
        await trx('users').where({ email }).decrement({ bal: amount });

        // record withdrawal
        // record transaction
        //notification

        await trx.commit();
        return {
          success: 'true',
          message: 'withdrawal successful',
        };
      } catch (e) {
        await trx.rollback();
        console.log('ERROR', e);
        throw e;
      }
    } else if (withdrawType == WITHDRAW_TYPE.CRYPTO_WITHDRAW) {
      const trx = await this.knex.transaction();
      try {
        const reference = HelperUtils.generateReferenceNo();

        const assetBalResponse = await trx.raw(
          'SELECT bal FROM assets WHERE email=? AND coin=? FOR UPDATE',
          [email, asset],
        );

        if (assetBalResponse !== undefined) {
          const balance = assetBalResponse[0][0]['bal'];

          console.log(
            balance,
            // amount > assetBalResponse,
            'BALANC',
            assetBalResponse[0][0],
          );
          // return;
          if (amount > balance) {
            throw new BadRequestException('insufficient balance');
          }
          await trx('transactions').insert({
            type: 'CRYPTO_WITHDRAW',
            email,
            direction: 'debit',
            amount: amount,
            description: ` Withdraw of  ${amount} ${asset} to ${address} `,
            asset: 'NGN',
            reference,
          });
          // debit users
          await trx('users').where({ email }).decrement({ bal: amount });

          // record withdrawal
          // record transaction
          //notification

          await trx.commit();
          return {
            success: 'true',
            message: 'withdrawal successful',
          };
        }
      } catch (e) {
        await trx.rollback();
        console.log('ERROR', e);
        throw e;
      }
      // check verification token
      //record transaction and token withdraws
    }
  }

  async withdraw(email: string, username: string, dto: WithdrawDto) {
    try {
      const { amount, withdrawType, asset, address, token } = dto;

      if (withdrawType === WITHDRAW_TYPE.CASH_WITHDRAW) {
        dto.asset = undefined;
        dto.address = undefined;
      }
      // if (!token) {
      //   throw new BadRequestException('token required');
      // }
      // //  validate redis intent
      // const cached = await this.redisService.getValue(
      //   `withdraw:intent:${email}:${withdrawType}`,
      // );

      // if (!cached) {
      //   throw new BadRequestException('token expired');
      // }

      // const data = JSON.parse(cached);
      // const intentDto = { ...dto };
      // intentDto.token = undefined;
      // const intent = HelperUtils.buildWithdrawIntent(intentDto);

      // const intentString = JSON.stringify(intent);

      // const intentHash = HelperUtils.hashToken(JSON.stringify(intent));

      // if (intentHash !== data.intentHash) {
      //   throw new BadRequestException('withdrawal details changed');
      // }

      // // if (!HelperUtils.compareHash(token, data.tokenHash)) {
      // if (!HelperUtils.verifyToken(token, data.tokenHash)) {
      //   throw new BadRequestException('invalid token');
      // }

      //  authoritative execution (your logic)

      try {
        let result;
        const reference = HelperUtils.generateReferenceNo();

        if (withdrawType === WITHDRAW_TYPE.CASH_WITHDRAW) {
          console.log('GOT HERE');
          result = await this.handleBankWithdrawal(email, dto);
          // return;
          // const row = await trx.raw(
          //   'SELECT bal FROM users WHERE email=? FOR UPDATE',
          //   [email],
          // );

          // const bal = row[0][0].bal;
          // if (amount > bal) {
          //   throw new BadRequestException('insufficient balance');
          // }

          // await trx('transactions').insert([
          //   {
          //     type: 'BANK_WITHDRAW',
          //     email,
          //     direction: 'debit',
          //     amount,
          //     asset: 'NGN',
          //     reference,
          //     description: `withdrawal of ${amount} NGN`,
          //   },
          //   {
          //     type: 'BANK_WITHDRAW',
          //     email,
          //     direction: 'debit',
          //     amount,
          //     asset: 'NGN',
          //     reference,
          //     description: `withdrawal Fee for ${amount} NGN`,
          //   },
          // ]);

          // await trx('users').where({ email }).decrement({ bal: amount });
        }

        if (withdrawType === WITHDRAW_TYPE.CRYPTO_WITHDRAW) {
          const trx = await this.knex.transaction();

          const row = await trx.raw(
            'SELECT bal FROM assets WHERE email=? AND coin=? FOR UPDATE',
            [email, asset],
          );

          const bal = row[0][0].bal;
          if (amount > bal) {
            throw new BadRequestException('insufficient balance');
          }
          const assetDetails = await this.mexcService.DepositOrWithdrawAllowed(
            'withdraw',
            asset,
            asset,
          );
          console.log('assetDetails', assetDetails);

          const fee = assetDetails['withdraw_fee'];
          const withdrawAmount = Number(amount) - Number(fee);

          await trx('crypto_withdrawal').insert({
            email,
            amount: withdrawAmount,
            // fee,
            mexc_username: username,
            asset,
            network: asset == 'BTC' || 'ETH' ? asset : '',
            address,
            client_tx_id: HelperUtils.generateReferenceNo(),
          });

          await trx('transactions').insert([
            {
              type: 'COIN_WITHDRAW',
              email,
              direction: 'debit',
              amount: withdrawAmount,
              asset,
              reference,
              description: `withdraw ${amount} ${asset} to ${address}`,
            },
            {
              type: 'COIN_WITHDRAW',
              email,
              direction: 'debit',
              amount: fee,
              asset,
              reference: `${reference}_fee`,
              description: `withdrawal fee for ${amount} ${asset} to ${address}`,
            },
          ]);

          await trx('assets')
            .where({ email, coin: asset })
            .decrement({ bal: amount });
          await trx.commit();

          result = { message: 'crypto withdrawal successful', success: 'true' };
        }

        // best-effort cleanup
        this.redisService.remove(`withdraw:intent:${email}`).catch(() => {});

        return result;
      } catch (e) {
        throw e;
      }
    } catch (e) {
      console.log('ERROR: ', e);
      throw e;
    }
  }

  async handleBankWithdrawal(email, dto: WithdrawDto) {
    const { amount, accountId } = dto;
    try {
      let bankAccount = await this.knex('bank_accounts')
        .select(
          'id',
          'account_name',
          'account_number',
          'bank_name',
          'bank_code',
        )
        .whereNull('deleted_at')
        .where('id', accountId)
        .where('email', email)
        .first();
      if (bankAccount !== undefined) {
        const { account_number, bank_name, bank_code } = bankAccount;
        const trx = await this.knex.transaction();
        try {
          // get user available bal
          const availableBalRes = await trx.raw(
            'SELECT bal FROM users WHERE email=? FOR UPDATE',
            [email],
          );

          // if balance response is valid
          if (availableBalRes !== undefined && availableBalRes[0][0]) {
            const availableBal = availableBalRes[0][0]['bal'];

            //fee
            let withdrawalFee;
            if (amount < 10000) {
              withdrawalFee = 50;
            } else if (amount >= 10000 && amount < 100000) {
              withdrawalFee = 100;
            } else if (amount >= 100000 && amount < 500000) {
              withdrawalFee = 150;
            } else {
              withdrawalFee = 250;
            }

            if (availableBal >= amount + withdrawalFee) {
              const nonceStr = HelperUtils.generateReferenceNo();
              let trxId = `Bitlenda-${nonceStr}`;
              // debit user  balance
              await trx('users')
                .decrement('bal', amount + withdrawalFee)
                .where('email', email);

              //  create bank  withdraw record
              await trx('bank_withdrawal').insert({
                email,
                tx_id: trxId,
                reference: trxId,
                amount,
                fee: withdrawalFee,
                bank_account_id: accountId,
              });

              // add withdraw transaction
              await trx('transactions').insert([
                {
                  email: email,
                  type: `BANK_WITHDRAW`,
                  reference: `${trxId}_fee`,
                  direction: 'debit',
                  // slug: 'Bank_withdraw_fee',
                  asset: 'NGN',
                  amount: withdrawalFee,
                  // Bank_bal: availableBal - (amount + withdrawalFee),
                  description: `Fee for Withdraw of  ${amount.toFixed(2)} NGN to ${
                    bankAccount.account_name
                  } (${bankAccount.bank_name})`,
                },
                {
                  email: email,
                  type: `BANK_WITHDRAW`,
                  reference: trxId,
                  direction: 'debit',
                  // slug: 'bank_withdraw',
                  asset: 'NGN',
                  amount,
                  // Bank_bal: availableBal - amount,
                  description: ` Withdraw of  ${amount.toFixed(2)} NGN to ${
                    bankAccount.account_name
                  } (${bankAccount.bank_name})`,
                },
              ]);

              await trx.commit();
              return { message: 'bank withdrawal successful', success: 'true' };
            } else throw new BadRequestException(`Insufficient balance.`);
          } else throw new BadRequestException('Invalid transaction');
        } catch (error) {
          console.log('RROR', error);
          await trx.rollback();
          throw error;
        }
      } else throw new BadRequestException('Bank account not found');
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
