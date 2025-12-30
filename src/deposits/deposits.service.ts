import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateDepositDto } from './dto/update-deposit.dto';
import { MexcService } from 'src/common/mexc/mexc.service';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import * as moment from 'moment';
@Injectable()
export class DepositsService {
  constructor(
    private readonly mexcService: MexcService,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {}
  create(createDepositDto: CreateDepositDto) {
    return 'This action adds a new deposit';
  }

  findAll() {
    return `This action returns all deposits`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deposit`;
  }

  update(id: number, updateDepositDto: UpdateDepositDto) {
    return `This action updates a #${id} deposit`;
  }

  remove(id: number) {
    return `This action removes a #${id} deposit`;
  }

  async handleTokenDeposit() {
    // const startTime = new Date().getMilliseconds();

    // const dateTime =
    //   startTime - Number(process.env.RECHARGE_SECONDS_TIME) * 60 * 1000;

    const deposits = await this.mexcService.getSubAccountDeposits();
    let recordsLength = 0;
    if (deposits != undefined && deposits.length > 0) {
      for (const recharge of deposits) {
        recordsLength++;
        console.log('RECORD', recordsLength, 'OUT OF ', deposits.length);
        const unlockConfirm = Number(recharge.unlockConfirm);
        const confirmTimes = Number(recharge.confirmTimes);
        console.log('RCHARGE:: ', recharge);
        let {
          coin,
          amount,
          status,
          address,
          txId,
          network,
          insertTime,
          memo = '',
          sourceAddress = '',
        } = recharge;

        if (status == '5' && confirmTimes >= unlockConfirm) {
          if (coin.split('-').length > 0) {
            coin = coin.split('-')[0];
          }

          const trx = await this.knex.transaction();

          console.log('WALLET_address:: ', address, coin, network, memo);
          const wallet = await this.knex('wallets')
            .where({
              address,
              coin,
              network,
              memo,
            })
            .first();

          // return;
          // CONFIRM WALLET EXISTS
          if (wallet !== undefined) {
            const user = await this.knex('users')
              .where('email', wallet.email)
              .first();
            if (user !== undefined) {
              const depositTrx = await this.knex('crypto_deposits')
                .where('tx_id', txId)
                .andWhere('email', wallet.email)
                .first();

              if (depositTrx === undefined) {
                const depositTime = this.timestampToUTC(insertTime);
                // get current price of the asset that want to be deposited
                const asset = await this.knex('cryptos')
                  .select('price')
                  .where('coin', coin)
                  .first();

                // add token deposit record
                await trx('crypto_deposits').insert({
                  email: user.email,
                  amount: amount,
                  price: asset.price,
                  coin: coin,
                  network: network,
                  address: address,
                  tx_id: txId,
                  source_address: sourceAddress,
                  // insert_time: depositTime,
                });

                const usdVal = amount * asset.price;

                recharge.transferIntegerMultiple =
                  asset.transferIntegerMultiple;
                const depositData = {
                  amount,
                  coin,
                  time: depositTime,
                  sourceAddress,
                  txId,
                  address,
                };
                await this.confirmTokenDeposit(trx, depositData, user, usdVal);
              } else {
                console.log('Deposit already handled');
              }
            } else {
              console.log(`User ${wallet.email} not found`);
            }
          } else {
            console.log(`${coin} Wallet: ${address} not found`);
          }
          // RECORD -IN DEPOSITS TRANSACTION
          // INCREASE ASSET BAL
          // RECORD -TRANSACTION
        }
      }
    }
  }

  timestampToUTC(timestamp) {
    const ts = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(ts);
    // return moment(date, 'YYYY-MM-DD HH:mm:ss');
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }

  async confirmTokenDeposit(trx, deposit, user, usdVal) {
    try {
      let { amount, coin, url, time, sourceAddress, txId, address } = deposit;
      console.log('GOT TO confirmTokenDeposit', deposit);
      amount = Number(Number(amount).toFixed(8)).toString();

      let description = `You received ${amount} ${coin} from  ${sourceAddress}`;
      const email = user.email;

      console.log('GOT TO confirmTokenDeposit 1');
      // start  transaction
      await trx.raw(
        'SELECT bal FROM assets WHERE email=? AND coin=? FOR UPDATE',
        [email, coin],
      );

      // add deposit transaction
      await trx('transactions').insert({
        email: email,
        type: 'COIN_DEPOSIT',
        direction: 'credit',
        asset: coin,
        amount: amount,
        to: address,
        description,
        reference: txId,
        deposit_txid: txId,
        created_at: time ? time : undefined,
      });

      // credit user asset balance
      await trx('assets')
        .increment('bal', amount)
        .increment('total_deposited', amount)
        .where({ email, coin });

      console.log('usdVal::', usdVal);
      // update user total token deposit
      await trx('users')
        .increment('total_token_deposit', usdVal)
        .update({ last_token_deposited_at: this.getNow() })
        .where('email', email);

      // complete operation
      await trx.commit();

      // send deposit notification
      // let notificationService = new NotificationService();
      // await notificationService.sendTokenDepositNotification(user, description);

      // check if account is allowed
    } catch (error) {
      await trx.rollback();
      console.info('FAILED TO CREDIT USER ASSET WALLET');
      console.error(error);
    }
  }

  getNow = () => {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  };

  async fix() {
    console.log('Cleaning knex migration state...');

    const columns = await this.knex.raw('DESCRIBE crypto_deposits');
    console.log('COLUMNS:: ', columns[0]);
    await this.knex('knex_migrations')
      .where({
        name: '20251229175243_deposits_and_notification_schema.js',
      })
      .del();

    await this.knex('knex_migrations_lock').update({ is_locked: 0 });

    console.log('Done.');
    process.exit(0);
  }
}
