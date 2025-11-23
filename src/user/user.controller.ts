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
import { UserService } from './user.service';
import { VerificationDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('verify')
  async handleVerification(@Request() req, @Body() dto: VerificationDto) {
    const userID = req.claims['userID'];

    return await this.userService.handleVerification(userID, dto);
  }
}
