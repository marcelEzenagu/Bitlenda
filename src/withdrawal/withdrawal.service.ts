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
      //  validate redis intent
      const cached = await this.redisService.getValue(
        `withdraw:intent:${email}:${withdrawType}`,
      );

      // console.log('cached', cached);
      if (!cached) {
        throw new BadRequestException('token required or expired');
      }

      const data = JSON.parse(cached);
      const intent = HelperUtils.buildWithdrawIntent(dto);

      const intentString = JSON.stringify(intent);

      // console.log('WITHDRAW intentString:', intentString);
      console.log('REDIS intentHash:', data.intentHash);
      const intentHash = HelperUtils.hashToken(JSON.stringify(intent));
      console.log('WITHDRAW intentHash:', intentHash);

      if (intentHash !== data.intentHash) {
        throw new BadRequestException('withdrawal details changed');
      }

      // if (!HelperUtils.compareHash(token, data.tokenHash)) {
      if (!HelperUtils.verifyToken(token, data.tokenHash)) {
        throw new BadRequestException('invalid token');
      }

      // 2️⃣ authoritative execution (your logic)
      const trx = await this.knex.transaction();

      try {
        const reference = HelperUtils.generateReferenceNo();

        if (withdrawType === WITHDRAW_TYPE.CASH_WITHDRAW) {
          const row = await trx.raw(
            'SELECT bal FROM users WHERE email=? FOR UPDATE',
            [email],
          );

          const bal = row[0][0].bal;
          if (amount > bal) {
            throw new BadRequestException('insufficient balance');
          }

          await trx('transactions').insert([
            {
              type: 'BANK_WITHDRAW',
              email,
              direction: 'debit',
              amount,
              asset: 'NGN',
              reference,
              description: `withdrawal of ${amount} NGN`,
            },
            {
              type: 'BANK_WITHDRAW',
              email,
              direction: 'debit',
              amount,
              asset: 'NGN',
              reference,
              description: `withdrawal Fee for ${amount} NGN`,
            },
          ]);

          await trx('users').where({ email }).decrement({ bal: amount });
        }

        if (withdrawType === WITHDRAW_TYPE.CRYPTO_WITHDRAW) {
          const row = await trx.raw(
            'SELECT bal FROM assets WHERE email=? AND coin=? FOR UPDATE',
            [email, asset],
          );

          const bal = row[0][0].bal;
          if (amount > bal) {
            throw new BadRequestException('insufficient balance');
          }
          const assetDetails = this.mexcService.DepositOrWithdrawAllowed(
            'withdraw',
            asset,
            asset,
          );

          const fee = assetDetails['withdraw_fee'];
          const withdrawAmount = amount - Number(fee);

          await trx('crypto_withdrawal').insert({
            amount: withdrawAmount,
            fee,
            mexc_username: '',
            asset,
            network: asset == 'BTC' || 'ETH' ? asset : '',
            address,
            client_tx_id: HelperUtils.generateReferenceNo(),
          });

          await trx('transactions').insert([
            {
              type: 'CRYPTO_WITHDRAW',
              email,
              direction: 'debit',
              amount: withdrawAmount,
              asset,
              reference,
              description: `withdraw ${amount} ${asset} to ${address}`,
            },
            {
              type: 'CRYPTO_WITHDRAW',
              email,
              direction: 'debit',
              amount: fee,
              asset,
              reference,
              description: `withdrawal fee for ${amount} ${asset} to ${address}`,
            },
          ]);

          await trx('assets')
            .where({ email, coin: asset })
            .decrement({ bal: amount });
        }

        await trx.commit();

        // best-effort cleanup
        this.redisService.remove(`withdraw:intent:${email}`).catch(() => {});

        return { success: 'true', message: 'withdrawal successful' };
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    } catch (e) {
      console.log('ERROR: ', e);
      throw e;
    }
  }
}
