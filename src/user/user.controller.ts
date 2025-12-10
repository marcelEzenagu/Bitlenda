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
import { TakeLoanDto } from 'src/loans/dto/loan.dto';
import { Loan } from 'src/loans/entity/loan.entity';
import { LoansService } from 'src/loans/loans.service';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly loansService: LoansService,
  ) {}

  @Post('verify')
  async handleVerification(@Request() req, @Body() dto: VerificationDto) {
    const userID = req.claims['userID'];

    return await this.userService.handleVerification(userID, dto);
  }

  @Post('request-loan')
  @ApiResponse({
    schema: {
      example: {
        message: 'OK',
        loan: {
          rate: 5,
          collateralRequired: '0.00032834',
          collateralPriceInNaira: 1451.6057,
          amount: 1000,
          repayment_amount: 1050,
          collateralPercent: 20,
          amountInAsset: '0.00027362',
          assetRateInNaira: 3654693.154833,
        },
      },
    },
  })
  async requestLoan(@Request() req, @Body() dto: TakeLoanDto) {
    return await this.loansService.getLoanOffer(dto);
  }

  @Post('get-loan-address')
  @ApiResponse({
    schema: {
      example: {
        message: 'address retrieved successfully.',
        addressDetails: {
          coin: 'ETH',
          network: 'Ethereum(ERC20)',
          address: '0xd99ff56799ae030945429577fae639244d586597',
          memo: null,
          chainName: 'Ethereum(ERC20)',
          chainDisplayName: 'Ethereum(ERC20)',
          netWork: 'ETH',
        },
        loanData: {
          rate: 5,
          collateralRequired: 0.00032834,
          collateralPriceInNaira: 1451.6057,
          amount: 1000,
          repayment_amount: 1050,
          collateralPercent: 20,
          amountInAsset: 0.00027362,
          assetRateInNaira: 3654693.154833,
        },
      },
    },
  })
  async getAddress(@Request() req, @Body() dto: TakeLoanDto) {
    // const userID = req.claims['userID'];
    const user = req.mexcClient;
    // console.log('REQ userID: ', req.user);
    return await this.loansService.getAddress(user, dto);
  }

  @Post('take-loan')
  async takeLoan(@Request() req, @Body() dto: TakeLoanDto) {
    const userID = req.claims['userID'];

    console.log('REQ userID: ', userID);
    // console.log('REQ USER: ', req);
    // return await this.userService.takeLoan(userID, dto);
  }
}
