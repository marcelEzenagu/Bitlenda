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
import * as crypto from 'crypto';
import axios from 'axios';
import { HelperUtils } from 'src/common/helpers/helpers';
import { PalmPayService } from 'src/common/helpers/palmpay';

@Injectable()
export class DepositsService {
  private readonly palmPayPub: string;
  private readonly palmPayPriv: string;
  private readonly appId: string;
  private readonly timestamp: number;

  constructor(
    private readonly mexcService: MexcService,
    private readonly palmpay: PalmPayService,
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  ) {
    this.palmPayPub =
      'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAitTFUh/9W0dYIVn85V5dr/8FZC4cGU/Qn88BVROVcIn3SgUc0ouRo3majPb3Lgu22a6ZCNiCoVx/UG8z1h4D9XnggsEw6enrCrsei1qU+tAyr2BiKwBgRQjPFjEtuHdpbjmgegUxCUu1gTdI/NXCRszanbHwdZ556/CeE/3rlwIDAQAB';
    this.palmPayPriv =
      'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAICK1MVSH/1bR1ghWfzlXl2v/wVkLhwZT9CfzwFVE5VwifdKBRzSi5GjeZqM9vcuC7bZrpkI2IKhXH9QbzPWHgP1eeCCwTDp6esKux6LWpT60DKvYGIrAGBFCM8WMS24d2luOaB6BTEJS7WBN0j81cJGzNqdsfB1nnnr8J4T/euXAgMBAAECgYB7X0RqArGrZNFr98672JWizAmzbfyHgY/Gh6uR9sruEm6IxyVzDW1hogpT2NosUahynilivke30RHLLDMfCHITNFkTmxIMH0uaBfWPM8xRCL4Jq4hJKsvMZhVxvVK8SxKjElawhlswBt5xBcuT/i5GasBvIiNw6Gr7gV7OIJN2CQJBALl/s8FvKkmgQ2AwQzfbx0Q5M89Yx/qfY2vgMJkpVnNrgmcRKhXZFFoQwqPCvRcW4Ij2QTwiqZuF09QDFTXPIWUCQQCxZXxZbxJnKfUV2tZnefLpag7sp5hJuvbGx5oRx22oKzxl5NA3tLVH10xFeZ5Qjf72luKxl3ghdlNiPy/QKedLAkEAknEIXdr+zWUiC5vOVRjCdU+bYUO7jFWsTYuNkjyaLUBgkDFywhDACmJU5qdkVAgRds7BrVHICClck3FjmzlMKQJAMaX7pXQmrGTbySAUPaWtzJH4V1eYkZoYEw4uGqe8EwL2xnXBqLWUvuSM3izpmBYFs7ILBDUmVAcv0yFoGlR//QJACMBGCaNr6e3JmGTo8HJRmPpdOJlJPISLYxHlXhDtUs+UuYzZrnU4SEQUnflmUijTDX4FXxm2TX4gm+6OTUkkHg==';
    this.appId = 'L39255713352';
    this.timestamp = new Date().getTime();
  }

  // sign() {
  //   const timestamp = new Date().getTime().toString();

  //   const nonce = HelperUtils.generateReferenceNo();
  //   const timeParams = `requestTime=${timestamp}`;

  //   const signData = `nonceStr=${nonce}&${timeParams}&businessType=0`;
  //   // const sign = crypto
  //   //   .createHmac('sha256', secret)
  //   //   .update(timeParams)
  //   //   .digest('hex')
  //   //   .toLowerCase();
  //   const md5Str = crypto.createHash('md5').update(signData).digest('hex');
  //   const sign = crypto.sign('RSA-SHA1', md5Str, {
  //     key: this.palmPayPriv,
  //     // padding: crypto.constants.RSA_PKCS1_PADDING,
  //   });

  //   console.log('SIGN:: ', sign);
  //   return sign.toString();
  // }

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
      let { amount, coin, time, sourceAddress, txId, address } = deposit;
      amount = Number(Number(amount).toFixed(8)).toString();

      console.log('AMOUNT: ', amount);
      let description = `You received ${amount} ${coin} from  ${sourceAddress}`;
      const email = user.email;

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
        .increment('bal', 0.003)
        .increment('total_deposited', amount)
        .where({ email, coin });

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

  async getbanks() {
    try {
      const requestBody = {
        businessType: '0',
        requestTime: this.timestamp,
        version: '1.1',
        nonceStr: HelperUtils.generateReferenceNo(),
      };
      // Wrap it in PEM format
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${this.palmPayPriv}\n-----END PRIVATE KEY-----`;
      const signature = this.palmpay.generateSignature(
        requestBody,
        privateKeyPEM,
      );

      console.log(
        'process.env.PALMPAY_BASE_URL:: ',
        process.env.PALMPAY_BASE_URL,
      );
      const res = await axios.post(
        `${process.env.PALMPAY_BASE_URL}/api/v2/general/merchant/queryBankList
 `,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.appId}`,
            CountryCode: 'NG',
            'Accept-Encoding': 'gzip',
            Signature: signature,
          },
        },
      );
      const { data } = res.data;
      return { data, success: 'true' };
    } catch (e) {
      console.log('ERROR', e);
    }
  }
}
