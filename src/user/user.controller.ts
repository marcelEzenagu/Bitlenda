import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BiometricDto, SetPinDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}
  // send-resendOTP
  @Post('set-pin')
  @ApiOperation({ summary: 'user sets transaction pin' })
  @ApiBody({ type: SetPinDto })
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
  async setPin(@Body() dto: SetPinDto, @Request() req) {
    const { userID, email } = req.claims;

    return await this.userService.setPin(userID, email, dto);
  }

  @Post('set-biometric')
  @ApiBearerAuth()
  async updateBiometric(@Request() req, @Body() dto: BiometricDto) {
    const { userID, email } = req.claims;

    return await this.userService.updateBiometricStatus(userID, email, dto);
  }
}
