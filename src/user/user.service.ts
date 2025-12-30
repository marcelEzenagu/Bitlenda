import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { User, UserStatus } from './entities/user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { CreateAccountDto } from 'src/auth/dto/create-auth.dto';
import { HelperUtils } from 'src/common/helpers/helpers';
import {
  SetPinDto,
  VerificationDto,
  VerificationSection,
} from './dto/update-user.dto';
import { AuthService } from 'src/auth/auth.service';
import { first } from 'rxjs';
import { WITHDRAW_TYPE, WithdrawDto } from './dto/withdrawal.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

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

    return { success: true, message: 'Logged out successfully' };
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

  async Withdraw(email, dto: WithdrawDto) {
    const { amount, withdrawType, asset } = dto;
    if (withdrawType == WITHDRAW_TYPE.CASH) {
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
    }
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
}
