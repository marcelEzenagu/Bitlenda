import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  HttpCode,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { User, UserStatus } from './entities/user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { HelperUtils } from 'src/common/helpers/helpers';

import { CreateAccountDto } from 'src/auth/dto/create-auth.dto';
import {
  AddBankAccountDto,
  BankWithdrawalDto,
  SetPinDto,
  VerificationDto,
  VerificationSection,
} from './dto/update-user.dto';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from 'src/common/redis.service';
import {
  InitWithdrawDto,
  WITHDRAW_TYPE,
  WithdrawDto,
} from 'src/withdrawal/dto/withdrawal.dto';
import { EmailService } from 'src/common/email.service';
import { MexcService } from 'src/common/mexc/mexc.service';
import { ProfileSection, UpdateProfileDto } from './dto/profile.dto';
import { PalmPayService } from 'src/common/helpers/palmpay';
import axios from 'axios';
import { error } from 'console';

export interface AssetWallet {
  bal: number;
  coin: string;
}
@Injectable()
export class UserService {
  private readonly palmPayPub: string;
  private readonly palmPayPriv: string;
  private readonly appId: string;
  private readonly timestamp: number;

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private redisService: RedisService,
    private readonly mexcService: MexcService,
    private readonly palmpay: PalmPayService,
  ) {
    this.palmPayPub =
      'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAitTFUh/9W0dYIVn85V5dr/8FZC4cGU/Qn88BVROVcIn3SgUc0ouRo3majPb3Lgu22a6ZCNiCoVx/UG8z1h4D9XnggsEw6enrCrsei1qU+tAyr2BiKwBgRQjPFjEtuHdpbjmgegUxCUu1gTdI/NXCRszanbHwdZ556/CeE/3rlwIDAQAB';
    this.palmPayPriv =
      'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAICK1MVSH/1bR1ghWfzlXl2v/wVkLhwZT9CfzwFVE5VwifdKBRzSi5GjeZqM9vcuC7bZrpkI2IKhXH9QbzPWHgP1eeCCwTDp6esKux6LWpT60DKvYGIrAGBFCM8WMS24d2luOaB6BTEJS7WBN0j81cJGzNqdsfB1nnnr8J4T/euXAgMBAAECgYB7X0RqArGrZNFr98672JWizAmzbfyHgY/Gh6uR9sruEm6IxyVzDW1hogpT2NosUahynilivke30RHLLDMfCHITNFkTmxIMH0uaBfWPM8xRCL4Jq4hJKsvMZhVxvVK8SxKjElawhlswBt5xBcuT/i5GasBvIiNw6Gr7gV7OIJN2CQJBALl/s8FvKkmgQ2AwQzfbx0Q5M89Yx/qfY2vgMJkpVnNrgmcRKhXZFFoQwqPCvRcW4Ij2QTwiqZuF09QDFTXPIWUCQQCxZXxZbxJnKfUV2tZnefLpag7sp5hJuvbGx5oRx22oKzxl5NA3tLVH10xFeZ5Qjf72luKxl3ghdlNiPy/QKedLAkEAknEIXdr+zWUiC5vOVRjCdU+bYUO7jFWsTYuNkjyaLUBgkDFywhDACmJU5qdkVAgRds7BrVHICClck3FjmzlMKQJAMaX7pXQmrGTbySAUPaWtzJH4V1eYkZoYEw4uGqe8EwL2xnXBqLWUvuSM3izpmBYFs7ILBDUmVAcv0yFoGlR//QJACMBGCaNr6e3JmGTo8HJRmPpdOJlJPISLYxHlXhDtUs+UuYzZrnU4SEQUnflmUijTDX4FXxm2TX4gm+6OTUkkHg==';
    this.appId = 'L39255713352';
    this.timestamp = new Date().getTime();
  }

  // Hash helper
  private async hashValue(value: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(value, saltRounds);
  }

  // SET PIN
  async setPin(userId: string, email: string, dto: SetPinDto) {
    try {
      const user = await this.knex('users').where({ id: userId }).first();

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.email.toLowerCase() != email.toLowerCase()) {
        throw new BadRequestException('Invalid or expired token');
      }

      const pinHash = await this.hashValue(dto.pin);

      await this.knex('users')
        .update({
          pin_hash: pinHash,
          updated_at: this.knex.fn.now(),
        })
        .where({ id: userId });

      return {
        message: 'PIN set successfully',
        success: 'true',
      };
    } catch (e) {
      console.log('ERROR: ', e);
      throw e;
    }
  }

  async createUser(data: CreateAccountDto): Promise<User> {
    const password_hash = await this.hashPassword(data.password);
    const existing = await this.knex('users')
      .where({ email: data.email })
      .first();

    if (existing) {
      throw new BadRequestException('Email is already registered');
    }
    const id = this.generateShortId();
    await this.knex('users').insert({ id, password_hash, email: data.email });
    return await this.knex('users').where({ id }).first();
  }

  async findOne(where: Partial<User>): Promise<User | null> {
    const user = await this.knex<User>('users').where(where).first();
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.knex<User>('users').where({ id }).first();
    return user || null;
  }

  async logout(userId: string) {
    await this.knex<User>('users')
      .where({ id: userId })
      .increment('token_version', 1);

    return { success: 'true', message: 'Logged out successfully' };
  }

  async markVerified(id: string, type: 'email' | 'phone'): Promise<User> {
    const field =
      type === 'email'
        ? {
            is_email_verified: true,
            status: UserStatus.ACTIVE,
            email_verified_at: new Date(),
          }
        : {
            is_phone_verified: true,
            status: UserStatus.ACTIVE,

            phone_verified_at: new Date(),
          };

    await this.knex<User>('users').where({ id }).update(field);

    // Return updated user
    const updatedUser = await this.findById(id);
    if (!updatedUser) throw new NotFoundException('User not found');

    updatedUser.password_hash = undefined;
    return updatedUser;
  }

  async resetPassword(email: string, newPassword: string) {
    try {
      const password_hash = await this.hashPassword(newPassword);

      const user = await this.findOne({ email });
      if (!user) throw new BadRequestException('Invalid email');

      await this.knex<User>('users')
        .where({ email })
        .update({ password_hash, pin_hash: null });

      const updated = await this.findOne({ email });
      return {
        user: updated,
        message: 'Password reset successful',
      };
    } catch (e) {
      console.log('ERROR: ', e);
      throw e;
    }
  }

  generateShortId(): string {
    const length = 10;
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(password, hashed);
  }

  async hashPin(pin: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(pin, saltRounds);
  }

  async verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pin, hash);
  }

  async handleVerification(userID: string, dto: VerificationDto) {
    try {
      const foundUser = await this.findById(userID);

      let field;
      // do non bvn verify
      if (dto.section == VerificationSection.BASIC_INFO) {
        dto.bvn = undefined;
        field = {
          first_name: dto.firstName,
          last_name: dto.lastName,
          dob: dto.dob,
          country: dto.countryOfResidence,
        };
      } else {
        if (foundUser.bal <= 0) {
          throw new Error('complete an active loan to set your bvn');
        }

        // introduce bvn verification by verify-me and others

        field = {
          bvn: dto.bvn,
        };
      }

      await this.knex<User>('users').where({ id: userID }).update(field);

      // Return updated user
      const updatedUser = await this.findById(userID);
      if (!updatedUser) throw new NotFoundException('User not found');

      updatedUser.password_hash = undefined;
      return { user: updatedUser, success: 'true' };
    } catch (e) {
      console.log('ERROR== ', e);
    }
  }

  async assignOrReturnMexcDetails(user: any) {
    let username = user.mexc_username;

    // If user already has a mexc_username → fetch keys and return
    if (username) {
      const creds = await this.knex('mexc_sub_accounts')
        .select('api_key', 'secret_key', 'note')
        .where('sub_account', username)
        .first();

      return {
        mexc_username: username,
        apiKey: creds.api_key,
        secretKey: creds.secret_key,
        memo: creds.note,
        user: user,
      };
    }

    // Otherwise assign new one
    const trx = await this.knex.transaction();

    try {
      const subAccount = await trx('mexc_sub_accounts')
        .where('assigned', 0)
        .forUpdate()
        .first();

      if (!subAccount) {
        await trx.rollback();
        throw new Error('No available MEXC sub-accounts');
      }

      await trx('mexc_sub_accounts')
        .where('sub_account', subAccount.sub_account)
        .update({ assigned: 1 });

      await trx('users')
        .where('email', user.email)
        .update({ mexc_username: subAccount.sub_account });

      await trx.commit();

      username = subAccount.sub_account;

      const updatedUser = await this.knex('users')
        .where('email', user.email)
        .first();

      return {
        mexc_username: username,
        apiKey: subAccount.api_key,
        secretKey: subAccount.secret_key,
        memo: subAccount.note,
        user: updatedUser,
      };
    } catch (error) {
      await trx.rollback();
      console.error('assignOrReturnMexcDetails failed for', user.email, error);
      throw error;
    }
  }

  async findOrCreateAssetWallet(email: string, coin: string) {
    try {
      let wallet = await this.knex('assets').where({ email, coin }).first();

      if (!wallet) {
        await this.knex('assets').insert({ email, coin });
        wallet = await this.knex('assets').where({ email, coin }).first();
      }
      return wallet;
    } catch (e) {
      console.log('ERROR creating asset wallet: ', e);
    }
  }

  async listAssetWallet(email: string) {
    try {
      let wallets = await this.knex('assets')
        .where({ email })
        .select('bal', 'coin');

      if (!wallets) {
        return { assets: [], success: 'true' };
      }

      return { assets: wallets.map(this.normalizeWallet), success: 'true' };
    } catch (e) {
      console.log('ERROR creating asset wallet: ', e);
    }
  }

  async userTransactions(email: string, page = 1, perPage = 20) {
    const offset = (page - 1) * perPage;

    const data = await this.knex('transactions')
      .where({ email })
      .orderBy('created_at', 'desc')
      .limit(perPage)
      .offset(offset);

    const [{ total }] = await this.knex('transactions')
      .where({ email })
      .count('* as total');

    return {
      data,
      pagination: {
        page,
        perPage,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / perPage),
      },
      success: 'true',
    };
  }

  async saveToken(email: string, token: string) {
    try {
      const now = new Date();

      const exists = await this.knex('fcm_tokens').where({ email }).first();

      if (exists) {
        // User already has a token → replace it
        await this.knex('fcm_tokens').where({ email }).update({
          token,
          updated_at: now,
        });
      } else {
        // First-time token
        await this.knex('fcm_tokens').insert({
          email,
          token,
        });
      }

      return {
        success: 'true',
        message: 'token added successfully',
      };
    } catch (e) {
      console.log('ERROR:: ', e);
    }
  }

  async initWithdraw(email: string, dto: InitWithdrawDto) {
    const { amount, withdrawType, asset, address } = dto;

    // soft balance check (UX only)
    if (withdrawType === WITHDRAW_TYPE.CASH_WITHDRAW) {
      const row = await this.knex('users')
        .select('bal')
        .where({ email })
        .first();

      console.log('row.bal:: ', row.bal);
      if (!row || amount > row.bal) {
        throw new BadRequestException('insufficient balance');
      }

      dto.asset = undefined;
      dto.address = undefined;
    }

    if (withdrawType === WITHDRAW_TYPE.CRYPTO_WITHDRAW) {
      const row = await this.knex('assets')
        .where({ email, coin: asset })
        .first();
      console.log('row.bal==:: ', row);

      if (!row || amount > row.bal) {
        throw new BadRequestException('insufficient balance');
      }

      // if (row.withdraw_coin != 0) {
      //   throw new BadRequestException(
      //     'you cannot make a withdraw, as you have uncleared loan',
      //   );
      // }
    }

    const token = this.authService.generateOtp();
    const tokenHash = HelperUtils.hashToken(token);

    const intent = HelperUtils.buildWithdrawIntent(dto);

    const intentString = JSON.stringify(intent);

    console.log('INIT intentString:', intentString);
    console.log('INIT token:', token);

    const intentHash = HelperUtils.hashToken(JSON.stringify(intent));

    await this.redisService.setTimedValue(
      `withdraw:intent:${email}:${withdrawType}`,
      JSON.stringify({ tokenHash, intentHash, attempts: 0 }),
      300,
    );

    await this.emailService.sendWithdrawalEmail(email, token, withdrawType);

    return { success: 'true', message: 'token sent' };
  }

  async resendWithdrawToken(email: string, withdrawType) {
    const cached = await this.redisService.getValue(
      `withdraw:intent:${email}:${withdrawType}`,
    );
    if (!cached) {
      throw new BadRequestException(`no active ${withdrawType} intent`);
    }

    const data = JSON.parse(cached);

    const token = this.authService.generateOtp();
    data.tokenHash = HelperUtils.hashToken(token);
    data.attempts = 0;

    await this.redisService.setTimedValue(
      `withdraw:intent:${email}:${withdrawType}`,
      JSON.stringify(data),
      300,
    );

    await this.emailService.sendWithdrawalEmail(email, token, withdrawType);

    return { success: 'true', message: 'token resent' };
  }

  async update(email, dto: UpdateProfileDto) {
    switch (dto.section) {
      case ProfileSection.PHONE:
        return await this.updatePhone(email, dto.phone!);

      case ProfileSection.EMAIL:
        return await this.updateEmail(email, dto.email!);

      case ProfileSection.NOK:
        return await this.addOrUpdateNok(email, dto.nok!);

      default:
        throw new BadRequestException('Invalid profile section');
    }
  }

  async updateEmail(oldEmail: string, newEmail: string) {
    await this.knex('users')
      .where({ email: oldEmail })
      .update({ alt_email: newEmail });

    return {
      message: 'email updated successfully',
      success: 'true',
    };
  }

  async addOrUpdateNok(email: string, nok) {
    try {
      const existing = await this.knex('next_of_kins')
        .where({ user_email: email })
        .first();

      if (existing) {
        await this.knex('next_of_kins')
          .where({ user_email: email })
          .update(nok);
        return { message: 'next of kin updated successfully', success: 'true' };
      }

      await this.knex('next_of_kins').insert({
        user_email: email,
        ...nok,
      });
      return { message: 'next of kin added successfully', success: 'true' };
    } catch (e) {
      console.log('EROR: ', e);
    }
  }

  async updatePhone(email: string, phone: string) {
    await this.knex('users').where({ email }).update({ phone });
    return { message: 'phone number updated successfully', success: 'true' };
  }

  normalizeWallet(wallet: any): AssetWallet {
    return {
      coin: wallet.coin,
      bal: Number(wallet.bal),
    };
  }

  async resolveBankAccount(accountNumber, bankCode) {
    try {
      const requestBody = {
        businessType: '0',
        requestTime: this.timestamp,
        version: '1.1',
        bankCode: bankCode,
        bankAccNo: accountNumber,
        nonceStr: HelperUtils.generateReferenceNo(),
      };

      // Wrap it in PEM format
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${this.palmPayPriv}\n-----END PRIVATE KEY-----`;
      const signature = this.palmpay.generateSignature(
        requestBody,
        privateKeyPEM,
      );

      const res = await axios.post(
        `${process.env.PALMPAY_BASE_URL}/api/v2/general/merchant/payout/queryBankAccount
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

      return 'failed';
    }
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
      return {
        data: data.map(({ bankCode, bankName }) => {
          return {
            bankCode,
            bankName,
          };
        }),
        success: 'true',
      };
    } catch (e) {
      console.log('ERROR', e);
    }
  }

  async queryTransaction() {
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
      return {
        data: data.map(({ bankCode, bankName }) => {
          return {
            bankCode,
            bankName,
          };
        }),
        success: 'true',
      };
    } catch (e) {
      console.log('ERROR', e);
    }
  }

  async initPalmpayWithdrawal(dto) {
    const { accountNumber, amount, bankCode, reference } = dto;

    dto.amount = amount * 100;

    console.log('AMOUNT ', amount);
    console.log('AMOUNT ', dto.amount);
    try {
      const requestBody = {
        orderId: reference,
        payeeBankAccNo: accountNumber,
        payeeBankCode: bankCode,
        amount,
        currency: 'NGN',
        notifyUrl: 'https://webhook.site/6eaa6fb5-b0b4-452c-8d09-6ef071c3e4fc',
        businessType: '0',
        requestTime: this.timestamp,
        version: '1.1',
        nonceStr: reference,
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
        `${process.env.PALMPAY_BASE_URL}/api/v2/merchant/payment/payout`,
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
      return data;
    } catch (e) {
      console.log('ERROR', e);
    }
  }

  async addBankAccount(email, dto: AddBankAccountDto) {
    try {
      let user = await this.knex('users').where('email', email).first();
      console.log('USER:  ', user);
      if (!user.first_name || !user.last_name) {
        throw new UnprocessableEntityException(
          'missing basic-info,complete basic-info verification',
        );
      }
      const { accountNumber, bankCode } = dto;
      let fName = user.first_name.toLowerCase().trim();
      let lName = user.last_name.toLowerCase().trim();

      // check if bank is supported
      // let accountResolveResponse = await this.resolveBankAccount(
      //   accountNumber,
      //   bankCode,
      // );

      // if (accountResolveResponse === 'failed') {
      //   throw new Error('Invalid account nuumber');
      // }

      // console.log('accountResolveResponse:: ', accountResolveResponse);
      // let accountName = accountResolveResponse.name.toLowerCase().trim();
      // console.log(accountName);
      const { data: bankList } = await this.getbanks();
      // console.log('bankList:: ', bankList);

      const bank = bankList.find((b) => b.bankCode === bankCode);

      if (!bank) {
        throw new BadRequestException(
          `Bank with bankCode ${bankCode} not found`,
        );
      }
      console.log('bank:: ', bank);
      // // check name match
      // if (accountName.indexOf(lName) > -1 || accountName.indexOf(fName) > -1) {
      let _bankAccount = await this.knex('bank_accounts')
        .where('account_number', accountNumber)
        .first();

      if (_bankAccount === undefined) {
        // add bank accoount
        await this.knex('bank_accounts').insert({
          email: user.email,
          bank_name: bank.bankName,
          bank_code: bank.bankCode,
          account_number: accountNumber,
          // remove laterOns
          account_name: `${user.first_name} ${user.last_name} `,
        });

        return { success: 'true', message: 'Bank account successfully added' };
      } else if (
        _bankAccount.deleted_at !== null &&
        _bankAccount.email === user.email
      ) {
        await this.knex('bank_accounts')
          .update({
            deleted_at: null,
          })
          .where('id', _bankAccount.id);
        return {
          success: 'true',
          message: 'account successfully added',
        };
      } else
        throw new BadRequestException(
          'Bank account already exist. add new one',
        );
      // } else
      //   throw new error(
      //     'Account number you provided does not match your name.',
      //   );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async verifyBankAccount(email, dto: AddBankAccountDto) {
    try {
      let user = await this.knex('users').where('email', email).first();
      console.log('USER:  ', user);
      if (!user.first_name || !user.last_name) {
        throw new UnprocessableEntityException(
          'missing basic-info,complete basic-info verification',
        );
      }
      const { accountNumber, bankCode } = dto;
      let fName = user.first_name.toLowerCase().trim();
      let lName = user.last_name.toLowerCase().trim();

      // check if bank is supported
      // let accountResolveResponse = await this.resolveBankAccount(
      //   accountNumber,
      //   bankCode,
      // );

      // if (accountResolveResponse === 'failed') {
      //   throw new Error('Invalid account nuumber');
      // }

      // console.log('accountResolveResponse:: ', accountResolveResponse);
      // let accountName = accountResolveResponse.name.toLowerCase().trim();
      // console.log(accountName);
      const { data: bankList } = await this.getbanks();
      // console.log('bankList:: ', bankList);

      const bank = bankList.find((b) => b.bankCode === bankCode);

      if (!bank) {
        throw new BadRequestException(
          `Bank with bankCode ${bankCode} not found`,
        );
      }
      // remove laterOn;

      const res = {
        bank_name: bank.bankName,
        account_number: accountNumber,
        bank_code: bank.bankCode,
        account_name: `${user.first_name} ${user.last_name} `,
      };

      return {
        success: 'true',
        data: res,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async initBankWithdrawal(email, dto: BankWithdrawalDto) {
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
              const token = this.authService.generateOtp();
              const tokenHash = HelperUtils.hashToken(token);

              const intent = HelperUtils.buildWithdrawIntent({
                withdrawType: WITHDRAW_TYPE.CASH_WITHDRAW,
                amount,
                accountId,
              });

              // const intentString = JSON.stringify(intent);

              const intentHash = HelperUtils.hashToken(JSON.stringify(intent));

              await this.redisService.setTimedValue(
                `withdraw:intent:${email}:${WITHDRAW_TYPE.CASH_WITHDRAW}`,
                JSON.stringify({ tokenHash, intentHash, attempts: 0 }),
                300,
              );

              await this.emailService.sendWithdrawalEmail(
                email,
                token,
                WITHDRAW_TYPE.CASH_WITHDRAW,
              );

              await trx.commit();
              return { success: 'true', message: 'token sent' };
            } else throw new BadRequestException(`Insufficient balance.`);
          } else throw new BadRequestException('Invalid user account');
        } catch (error) {
          await trx.rollback();
          throw error;
        }
      } else throw new BadRequestException('Bank account not found');
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async deleteBankAccount(email, bankAccountId) {
    try {
      let bankAccount = await this.knex('bank_accounts')
        .where('id', bankAccountId)
        .where('email', email)
        .first();
      if (bankAccount !== undefined) {
        await this.knex('bank_accounts').where('id', bankAccountId).update({
          deleted_at: HelperUtils.getNow(),
        });

        return { success: 'true', message: 'Bank account deleted' };
      } else throw new error('Bank account not found');
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getInfo(email: string) {
    try {
      const user = await this.findOne({
        email,
      });

      user.password_hash = undefined;
      user.pin_hash = undefined;
      user.bvn = undefined;
      user.token_version = undefined;
      const bankAccounts = await this.knex('bank_accounts')
        .where('email', user.email)
        .select(
          'bank_name',
          'bank_code',
          'account_number',
          'account_name',
          'id',
        );

      user.bank_accounts = bankAccounts;

      return { data: user, success: 'true' };
    } catch (e) {
      console.log('ERR== ', e.message);
      throw new BadRequestException(e);
    }
  }
}
