import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/common/email.service';
import { randomBytes } from 'crypto';
import { RedisService } from 'src/common/redis.service';
import {
  CreateAccountDto,
  ForgotPasswordDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyDto,
} from './dto/create-auth.dto';
import { User, UserStatus } from 'src/user/entities/user.entity';
import { RoleName } from 'src/user/entities/role.entity';
import { AdminMark, VerifyLogin } from './dto/update-auth.dto';
import { ErrorFormat } from 'src/common/helpers/errorFormat';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private redisService: RedisService,
    private errorFormat: ErrorFormat,

    // private notificationService: NotificationService,
  ) {}
  async validateUser(email: string, password: string) {
    try {
      const user = await this.usersService.findOne({
        email,
      });
      if (!user)
        throw new UnauthorizedException(
          'A user with this email does not exist',
        );
      if (!user.is_email_verified)
        throw new UnauthorizedException('Complete email verification');

      if (!user.password_hash)
        throw new UnauthorizedException('Complete forgot-password');

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) throw new UnauthorizedException('Incorrect password');

      user.token_version += 1;
      // await user.save();
      user.password_hash = undefined;

      return user;
    } catch (e) {
      console.log('ERR== ', e.message);
      throw new BadRequestException(this.errorFormat.formatErrors(e));
    }
  }

  async createUserAccount(createUserDto: CreateAccountDto) {
    let user;
    let newUserCreated = false;
    createUserDto.role = RoleName.USER;

    try {
      user = await this.usersService.createUser(createUserDto);

      const { OTP } = await this.getTokenAndOTP(user.email, createUserDto.role);

      // await this.emailService.sendVerificationEmail(user.email, OTP);

      return {
        success: 'OK',
        message: 'Registered successfully',
        next: 'verify-email',
        OTP,
      };
    } catch (e) {
      console.log('ERROR:  ', e);

      throw new BadRequestException(this.errorFormat.formatErrors(e));
    }
  }
  async login(user: User) {
    try {
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        version: user.token_version,
      };

      if (user.role == RoleName.ADMIN || user.role == RoleName.SUPER_ADMIN) {
        const OTP = this.generateOtp();

        const key = `login-${OTP}`;
        await this.redisService.setTimedValue(key, user.email, 200); // store code against user ID

        await this.emailService.sendVerificationEmail(user.email, OTP);

        return {
          success: 'PENDING',
          OTP,
          message: `Verification code sent to ${user.email}. Please verify to login.`,
        };
      }

      const access_token = await this.generateToken(payload);
      return {
        access_token,
        user,
        success: 'OK',
      };
    } catch (e) {
      console.log('ERR:: ', e);
    }
  }

  // async verifyLogin(dto: VerifyLogin): Promise<{}> {
  //   try {
  //     const key = `login-${dto.otp}`;
  //     const storedCode = await this.redisService.getValue(key);
  //     dto.email = dto.email.toLowerCase();
  //     if (!storedCode || storedCode !== dto.email) {
  //       await this.redisService.remove(key);
  //       throw new UnauthorizedException('Invalid or expired verification code');
  //     }

  //     const user = await this.usersService.findOne({
  //       email: dto.email,
  //       status: UserStatus.ACTIVE,
  //       // role: RoleName.ADMIN,
  //     });
  //     if (!user) {
  //       await this.redisService.remove(key);
  //       throw new NotFoundException('admin not found');
  //     }

  //     user.last_login = new Date();
  //     user.token_version += 1;

  //     await user.save();

  //     // Issue JWT or session here
  //     const token = await this.generateToken({
  //       sub: user.id,
  //       email: user.email,
  //       role: user.role,
  //       version: user.token_version,
  //     });

  //     await this.redisService.remove(key);

  //     return {
  //       success: 'OK',
  //       token,
  //       user: user.toJSON(),
  //     };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  isEmailCheck(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  async verifyEmail(dto: VerifyDto): Promise<{}> {
    try {
      dto.email = dto.email.toLowerCase();

      const isEmail = this.isEmailCheck(dto.email);
      if (!isEmail) {
        throw new UnprocessableEntityException('Invalid email address');
      }

      // Step 1: Get verification context from Redis
      const redisKey = `email-verification-${dto.email}`;

      const verificationContext = await this.redisService.getValue(redisKey);

      if (!verificationContext) {
        throw new BadRequestException({
          message: 'Verification context expired or invalid',
        });
      }
      const parsedContext = verificationContext.split('-');

      const storedOtp = parsedContext[0];
      if (storedOtp !== dto.otp) {
        throw new UnprocessableEntityException('Invalid OTP');
      }

      // Step 2: Query correct service based on role
      let user = await this.usersService.findOne({
        email: dto.email,
      });

      // if (!user) throw new NotFoundException(`${role} not found`);
      if (user.is_email_verified) {
        await this.redisService.remove(redisKey);

        throw new BadRequestException('Email already verified');
      }

      // Step 3: Mark verified
      const verifiedUser = await this.usersService.markVerified(
        user.id,
        'email',
      );

      await this.redisService.remove(redisKey);
      if (verifiedUser.role == RoleName.ADMIN) {
        return {
          success: true,
          message: 'Email verified successfully',
        };
      }

      // // Step 4: Generate token
      const payload = {
        userID: verifiedUser.id,
        email: verifiedUser.email,
        type: 'onboarding',
      };

      const access_token = await this.generateToken(payload);

      return {
        token: access_token,
        success: true,
        message: 'Email verified successfully',
      };
    } catch (err) {
      if (err.name === 'CodeExpiredError') {
        throw new BadRequestException('Verification code has expired');
      }
      throw new BadRequestException(err.message || 'Verification failed');
    }
  }

  async resendOTP(dto: ResendOtpDto): Promise<{}> {
    dto.email = dto.email.toLowerCase();
    const createData: Partial<User> = {};

    // check isEmail

    createData.email = dto.email;

    const user = await this.usersService.findOne(createData);

    try {
      const OTP = this.generateOtp();

      let verificationType;

      const otpType =
        dto.otpType == 'verification'
          ? 'verification'
          : dto.otpType == 'reset'
            ? 'reset-password'
            : 'invalid';

      if (otpType == 'invalid') {
        throw new BadRequestException('invalid otpType');
      }
      if (otpType != 'reset-password') {
        verificationType = `email-${otpType}`;
      } else {
        verificationType = otpType;
      }
      const requestID = await this.generateTemporaryAccessCode(
        verificationType,
        OTP,
        dto.email,
      );

      // await this.emailService.sendVerificationEmail(user.email, OTP);

      return {
        success: 'OK',
        OTP,
        next: `verify-email`,

        message: 'OTP sent successful',
      };
    } catch (error) {
      console.log('HERE', error.response);
      if ((error.response.message = 'invalid otpType')) {
        throw new BadRequestException(error.response.message);
      } else {
        throw new BadRequestException('resendOTP was canceled.');
      }
    }
  }

  async resendOTPForRole(dto: ResendOtpDto, role: RoleName): Promise<{}> {
    dto.email = dto.email.trim().toLowerCase();

    // Check email or phone
    const isEmail = this.isEmailCheck(dto.email);
    const emailType = isEmail ? 'email' : 'phone';

    // Determine otpType (verification | reset-password)
    const otpType =
      dto.otpType === 'verification'
        ? 'verification'
        : dto.otpType === 'reset'
          ? 'reset-password'
          : 'invalid';

    if (otpType === 'invalid') {
      throw new BadRequestException('Invalid otpType');
    }

    // For verification, include email/phone type in key
    let verificationType;
    if (otpType !== 'reset-password') {
      verificationType = `${emailType}-${otpType}`;
    } else {
      verificationType = otpType;
    }

    // Ensure the user exists in the given role context
    const user = await this.usersService.findOne({
      [isEmail ? 'email' : 'phone']: dto.email,
      role,
    });

    if (!user) {
      throw new NotFoundException(`${role} account not found`);
    }

    // Generate OTP
    const OTP = this.generateOtp();

    const value = `${OTP}-${role}`;
    await this.generateTemporaryAccessCode(verificationType, value, dto.email);

    //   await this.emailService.sendVerificationEmail(user.email, OTP);

    return {
      success: true,
      OTP,
      next: `verify-${emailType}`,
      message: `OTP sent successfully to ${dto.email}`,
    };
  }

  generateOtp(): string {
    let text = '';
    const possible = '0123456789';

    for (let i = 0; i < 6; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  async generateTemporaryAccessCode(
    tokenType: 'reset-password' | 'email-verification' | 'phone-verification',
    value: string,
    email: string,
  ): Promise<string> {
    const key = `${tokenType}-${email}`;

    try {
      console.log('key', key);
      console.log('value', value);
      const result = await this.redisService.setValue(key, value);

      return value;
    } catch (error) {
      // You can log it or wrap it in a custom exception
      throw new Error(`Redis operation failed: ${error.message}`);
    }
  }

  async generateAccessCode(
    tokenType: 'reset-password' | 'email-verification',
    value: string,
  ): Promise<string> {
    const characters = this.generateRandomCharacters(86);

    const key = `${tokenType}-${characters}`;

    // save to redis
    await this.redisService.setValue(key, value);

    return characters;
  }

  async generateToken(payload) {
    try {
      return await this.jwtService.signAsync(payload);
    } catch (e) {
      console.log('ERROR', e);
    }
  }

  async verifyAccessToken(token: string): Promise<any> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);

      if (decoded.role === RoleName.USER) {
        // const role = decoded['role'].split('-')[0];
        const user = await this.usersService.findById(decoded.sub);
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        const userId = new Types.ObjectId(decoded.sub);
        if (user.token_version !== decoded.version) {
          throw new UnauthorizedException(
            'Token has been invalidated (logged out)',
          );
        }
      } else if (
        [RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.MAINTAINER].includes(
          decoded.role,
        )
      ) {
      }

      return decoded;
    } catch (err) {
      console.log('err:: ', err);
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async logout(userId: string, isAdmin?: boolean) {
    // if (isAdmin) {
    //   // user = await this.adminModel.findOne({ email: decoded['email'] }).exec();
    //   await this.adminModel.updateOne(
    //     { _id: userId },
    //     { $inc: { token_version: 1 } },
    //   );
    //   return { success: true, message: 'Logged out successfully' };
    // }
    return await this.usersService.logout(userId);
  }

  private generateRandomCharacters(length: number) {
    const characters = randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
    return characters;
  }

  async getTokenAndOTP(email: string, role: RoleName) {
    const OTP = this.generateOtp();

    const value = `${OTP}-${role}`;
    const token = await this.generateTemporaryAccessCode(
      'email-verification',
      value,
      email,
    );

    return { token, OTP };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{}> {
    try {
      dto.email = dto.email.toLowerCase();
      const user = await this.usersService.findOne({ email: dto.email });

      if (!user) {
        throw new NotFoundException('no user with this email');
      }

      const OTP = this.generateOtp();
      const requestID = await this.generateTemporaryAccessCode(
        'reset-password',
        OTP,
        dto.email,
      );

      // await this.emailService.sendVerificationEmail(user.email, OTP);

      return {
        message: 'A Password Reset OTP sent',
        success: 'OK',
        OTP,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Invalid email');
      }
      throw error;
    }
  }

  async verifyResetPassword(dto: VerifyDto): Promise<{}> {
    try {
      dto.email = dto.email.toLowerCase();
      const createData: Partial<User> = {};

      const isEmail = this.isEmailCheck(dto.email);
      if (!isEmail) {
        throw new NotFoundException('invalid email');
      } else {
        createData.email = dto.email;
      }
      const key = `reset-password-${createData.email}`;

      const foundOTP = await this.redisService.getValue(key);

      if (foundOTP != dto.otp) {
        throw new UnprocessableEntityException();
      }

      const user = await this.usersService.findOne(createData);

      if (!user) {
        throw new NotFoundException('no user with this email');
      }

      const token = await this.generateAccessCode(
        'reset-password',
        createData.email,
      );
      await this.redisService.remove(key);

      return {
        token,
        success: 'OK',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(error);
      }
      throw error;
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{}> {
    try {
      if (dto.password != dto.confirmPassword) {
        throw new BadRequestException(
          "password and confirmPassword don't match",
        );
      }

      const key = `reset-password-${dto.token}`;

      const email = await this.redisService.getAndDelete(key);
      if (!email) {
        throw new UnprocessableEntityException('invalid token');
      }
      const res = await this.usersService.resetPassword(email, dto.password);
      const { user, message } = res;
      if (!user) {
        throw new NotFoundException('invalid requestID credential');
      }

      if (!user.is_email_verified)
        throw new UnauthorizedException(
          'password reset successfully, complete email verification',
        );

      return {
        success: 'OK',
        message,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(error);
      }
      throw error;
    }
  }
}
