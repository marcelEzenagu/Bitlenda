import { Controller, Get, Post, Body, Request, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateAccountDto,
  CreateAuthDto,
  ForgotPasswordDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyDto,
} from './dto/create-auth.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VerifyLogin } from './dto/update-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiBearerAuth('')
  @ApiResponse({
    status: 200,
    description: 'loggedOut successfully',
  })
  async logOut(@Request() req) {
    let isAdmin = false;
    const userID = req.claims['sub'];

    return await this.authService.logout(userID, isAdmin);
  }

  @Post('register-user')
  @ApiOperation({ summary: 'registers a user using email' })
  @ApiResponse({
    schema: {
      example: {
        success: 'OK',
        message: 'Registered successfully',
        next: 'verify-email',
      },
    },
  })
  async registerUser(@Body() body: CreateAccountDto) {
    return await this.authService.createUserAccount(body);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiBody({ type: VerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',

    schema: {
      example: {
        access_token: 'user_access_token',
        user: {
          fullName: 'john brow',
          role: 'USER',
          email: 'useremail@provider.com',
          isEmailVerified: false,
          status: 'active',
          deletedAt: null,
          lastActive: null,
          tokenVersion: 2,
        },
        success: 'OK',
        message: 'Email verified successfully',
      },
    },
  })
  async verifyEmail(@Body() dto: VerifyDto) {
    return await this.authService.verifyEmail(dto);
  }

  // send-resendOTP
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP for email verification' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP resent successfully',
    schema: {
      example: {
        success: 'OK',
        next: 'verify-email',
        message: 'OTP sent successful',
      },
    },
  })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return await this.authService.resendOTP(dto);
  }

  // @Post('login')
  // @ApiOperation({ summary: 'logs in a user using email' })
  // @ApiResponse({
  //   schema: {
  //     example: {
  //       access_token: 'user-access-token',
  //       user: {
  //         fullName: 'john brow',
  //         role: 'USER',
  //         email: 'marcelagu92@gmail.com',
  //         isEmailVerified: true,
  //         status: 'active',
  //         deletedAt: null,
  //         lastActive: null,
  //         tokenVersion: 3,
  //         createdAt: '2025-10-22T03:29:49.592Z',
  //         updatedAt: '2025-10-22T16:45:50.754Z',
  //         __v: 0,
  //       },
  //       success: 'OK',
  //     },
  //   },
  // })
  // async login(@Body() body: CreateAuthDto) {
  //   const user = await this.authService.validateUser(body.email, body.password);

  //   return await this.authService.login(user);
  // }

  // @Post('verify-login')
  // @ApiOperation({ summary: 'Verify OTP for admin login' })
  // @ApiBody({ type: VerifyLogin })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Login successful',
  // })
  // async verifyLogin(@Body() dto: VerifyLogin) {
  //   return await this.authService.verifyLogin(dto);
  // }

  @Post('init-forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'OTP sent for password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  @Post('verify-forgot-password')
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiBody({ type: VerifyDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified, allow password reset',
    schema: {
      example: {
        token: 'token for reset-password',
        success: 'OK',
      },
    },
  })
  async verifyResetPassword(@Body() dto: VerifyDto) {
    return await this.authService.verifyResetPassword(dto);
  }

  @Patch('reset-password')
  @ApiOperation({ summary: 'Reset user password after verification' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: 'OK',
        message: '',
        user: {},
        access_token: "user's accessToken",
      },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }
}
