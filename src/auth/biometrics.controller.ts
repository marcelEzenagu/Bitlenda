// src/auth/biometrics.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import {
  EnableBiometricsDto,
  BiometricsLoginDto,
  RotateKeyDto,
} from './dto/biometrics.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth/biometrics')
export class BiometricsController {
  constructor(private readonly biometricsService: BiometricsService) {}

  @Post('enable')
  @ApiBearerAuth('')
  @ApiOperation({ summary: 'Enables biometrics login for a user' })
  @UseGuards(AuthGuard)
  async enable(@Req() req, @Body() dto: EnableBiometricsDto) {
    const userId = req.user.id;
    return this.biometricsService.enableBiometrics(
      userId,
      dto.deviceId,
      dto.publicKey,
    );
  }

  @Get('challenge')
  @ApiOperation({ summary: 'initiates the loginWithBioMetrics' })
  async challenge(@Query('deviceId') deviceId: string) {
    return this.biometricsService.createChallenge(deviceId);
  }

  @Post('login')
  @ApiOperation({ summary: 'handles the loginWithBioMetrics' })
  async login(@Req() req, @Body() dto: BiometricsLoginDto) {
    const ip = req.ip || (req.headers && req.headers['x-forwarded-for']);
    const userAgent = req.headers['user-agent'] || '';
    return this.biometricsService.loginWithBiometrics(
      dto.deviceId,
      dto.challenge,
      //   dto.signature,
      ip,
      userAgent,
    );
  }

  @Post('disable')
  @ApiBearerAuth('')
  @ApiOperation({ summary: 'Disables biometrics login for a user' })
  @UseGuards(AuthGuard)
  async disable(@Req() req, @Body() body: { deviceId?: string }) {
    const userId = req.user.id;
    return this.biometricsService.disableBiometrics(userId, body.deviceId);
  }

  @Post('rotate')
  @ApiBearerAuth('')
  @ApiOperation({ summary: 'rotates biometrics on a newDevice' })
  @UseGuards(AuthGuard)
  async rotate(@Req() req, @Body() dto: RotateKeyDto) {
    const userId = req.user.id;
    return this.biometricsService.rotateKey(
      userId,
      dto.deviceId,
      dto.newPublicKey,
    );
  }

  @Get('status')
  @ApiBearerAuth('')
  @ApiOperation({ summary: 'get biometrics status of a user' })
  @UseGuards(AuthGuard)
  async status(@Req() req) {
    return this.biometricsService.status(req.user.id);
  }
}
