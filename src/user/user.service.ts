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
import { SetPinDto } from './dto/update-user.dto';
import { AuthService } from 'src/auth/auth.service';

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
        success: 'OK',
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
      const user = await this.findOne({ email });
      if (!user) throw new BadRequestException('Invalid email');

      await this.knex<User>('users')
        .where({ email })
        .update({ password_hash: newPassword, pin_hash: null });

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
}
