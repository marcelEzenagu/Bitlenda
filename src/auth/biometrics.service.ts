// src/auth/biometrics.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { RedisService } from 'src/common/redis.service';
import { AuthService } from './auth.service';

@Injectable()
export class BiometricsService extends AuthService {
  private readonly CHALLENGE_TTL_SECONDS = 120;

  //   constructor(
  //     // @Inject(KNEX_CONNECTION) private readonly knex: Knex,
  //     // private readonly jwtService: JwtService,
  //   ) {}

  async enableBiometrics(userId: string, deviceId: string, publicKey: string) {
    try {
      const user = await this.knex('users').where({ id: userId }).first();
      if (!user) throw new NotFoundException('User not found');

      if (!user.pin_hash) {
        throw new BadRequestException('Set a PIN before enabling biometrics');
      }

      const existing = await this.knex('user_devices')
        .where({ device_id: deviceId, user_id: userId })
        .first();

      if (existing) {
        await this.knex('user_devices').where({ id: existing.id }).update({
          public_key: publicKey,
          biometrics_enabled: true,
          updated_at: this.knex.fn.now(),
        });
      } else {
        await this.knex('user_devices').insert({
          device_id: deviceId,
          user_id: userId,
          public_key: publicKey,
          biometrics_enabled: true,
          created_at: this.knex.fn.now(),
        });
      }

      await this.knex('users')
        .where({ id: userId })
        .update({ has_biometrics: true, updated_at: this.knex.fn.now() });

      return { message: 'Biometrics enabled' };
    } catch (e) {
      console.log('ERROR:: ', e);
    }
  }

  async createChallenge(deviceId: string) {
    if (!deviceId) throw new BadRequestException('deviceId required');

    const device = await this.knex('user_devices')
      .where({ device_id: deviceId, biometrics_enabled: true })
      .first();
    if (!device)
      throw new NotFoundException('Device not registered for biometrics');

    const challenge = crypto.randomBytes(32).toString('hex');
    const key = `bio:challenge:${deviceId}`;

    await this.redis.setTimedValue(
      key,
      JSON.stringify({ challenge, userId: device.user_id }),
      this.CHALLENGE_TTL_SECONDS,
    );

    return { challenge };
  }

  async loginWithBiometrics(
    deviceId: string,
    challenge: string,
    // signatureBase64: string,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      if (!deviceId || !challenge)
        //   if (!deviceId || !challenge || !signatureBase64)
        throw new BadRequestException('Missing fields');

      const key = `bio:challenge:${deviceId}`;
      const raw = await this.redis.getValue(key);
      if (!raw) {
        throw new UnauthorizedException({
          message: 'Invalid or expired challenge',
          next_step: 'email-password',
        });
      }

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (e) {
        await this.redis.remove(key);
        throw new UnauthorizedException({
          message: 'Invalid challenge state',
          next_step: 'email-password',
        });
      }

      if (payload.challenge !== challenge) {
        await this.redis.remove(key);
        throw new UnauthorizedException({
          message: 'Challenge mismatch',
          next_step: 'email-password',
        });
      }

      const device = await this.knex('user_devices')
        .where({ device_id: deviceId, biometrics_enabled: true })
        .first();
      if (!device) {
        await this.redis.remove(key);
        throw new UnauthorizedException({
          message: 'Device not registered',
          next_step: 'email-password',
        });
      }

      //   // verify signature
      //   const verified = this.verifySignature(
      //     challenge,
      //     signatureBase64,
      //     device.public_key,
      //   );
      await this.redis.remove(key);

      //   if (!verified) {
      //     throw new UnauthorizedException({
      //       message: 'Invalid biometric signature',
      //       next_step: 'email-password',
      //     });
      //   }

      const user = await this.knex('users')
        .where({ id: device.user_id })
        .first();
      if (!user) {
        throw new UnauthorizedException({
          message: 'User not found',
          next_step: 'email-password',
        });
      }

      if (user.status && user.status !== 'ACTIVE') {
        throw new ForbiddenException({
          message: 'Account not active',
          next_step: 'support',
        });
      }

      const tokenPayload = {
        userID: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified,
        version: user.token_version,
      };
      // generate tokens
      const accessToken = this.jwtService.sign(tokenPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: Number(process.env.JWT_EXPIRES_IN) || '24h',
      });

      const refreshToken = this.jwtService.sign(tokenPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN) || '30d',
      });

      // update last used
      await this.knex('user_devices')
        .where({ id: device.id })
        .update({ last_used_at: this.knex.fn.now() });

      await this.knex('users')
        .where({ id: user.id })
        .update({ last_login: this.knex.fn.now() });

      // INSERT LOGIN HISTORY ONLY AFTER ALL SUCCESS
      await this.insertLoginHistory(
        user.id,
        'BIOMETRICS',
        deviceId,
        ip,
        userAgent,
        true,
      );

      user.bvn = undefined;
      user.password_hash = undefined;

      return { success: 'OK', accessToken, refreshToken, user };
    } catch (e) {
      console.log('ERROR: ', e);
      throw e;
    }
  }

  async disableBiometrics(userId: string, deviceId?: string) {
    if (deviceId) {
      await this.knex('user_devices')
        .where({ user_id: userId, device_id: deviceId })
        .update({ biometrics_enabled: false, updated_at: this.knex.fn.now() });
    } else {
      await this.knex('user_devices')
        .where({ user_id: userId })
        .update({ biometrics_enabled: false, updated_at: this.knex.fn.now() });
    }

    const any = await this.knex('user_devices')
      .where({ user_id: userId, biometrics_enabled: true })
      .first();
    if (!any) {
      await this.knex('users')
        .where({ id: userId })
        .update({ has_biometrics: false, updated_at: this.knex.fn.now() });
    }

    return { message: 'Biometrics disabled' };
  }

  async rotateKey(userId: string, deviceId: string, newPublicKey: string) {
    const device = await this.knex('user_devices')
      .where({ user_id: userId, device_id: deviceId })
      .first();
    if (!device) throw new NotFoundException('Device not registered');
    await this.knex('user_devices')
      .where({ id: device.id })
      .update({ public_key: newPublicKey, updated_at: this.knex.fn.now() });
    return { message: 'Public key rotated' };
  }

  async status(userId: string) {
    const devices = await this.knex('user_devices')
      .where({ user_id: userId })
      .select('device_id', 'biometrics_enabled', 'last_used_at');
    const hasBiometrics = devices.some((d) => d.biometrics_enabled);
    return { hasBiometrics, devices };
  }

  verifySignature(
    message: string,
    signatureBase64: string,
    publicKey: string,
  ): boolean {
    const signature = Buffer.from(signatureBase64, 'base64');
    const verifier = crypto.createVerify('sha256');
    verifier.update(message);
    verifier.end();
    try {
      return verifier.verify(publicKey, signature);
    } catch (e) {
      return false;
    }
  }
}
