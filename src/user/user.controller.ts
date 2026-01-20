import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
  BadRequestException,
  Req,
  BadGatewayException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  AddBankAccountDto,
  BankWithdrawalDto,
  RemoveBankAccountDto,
  VerificationDto,
} from './dto/update-user.dto';
import { TakeLoanDto } from 'src/loans/dto/loan.dto';
import { Loan } from 'src/loans/entity/loan.entity';
import { LoansService } from 'src/loans/loans.service';
import {
  InitWithdrawDto,
  ResendWithdrawTokenDto,
  WITHDRAW_TYPE,
  WithdrawDto,
} from 'src/withdrawal/dto/withdrawal.dto';
import { WithdrawalService } from 'src/withdrawal/withdrawal.service';
import { ProfileSection, UpdateProfileDto } from './dto/profile.dto';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly loansService: LoansService,
    private readonly withdrawService: WithdrawalService,
  ) {}

  @Post('verify')
  async handleVerification(@Request() req, @Body() dto: VerificationDto) {
    const userID = req.claims['userID'];

    return await this.userService.handleVerification(userID, dto);
  }

  @Post('request-loan')
  @ApiOperation({ summary: 'Gets a loan breakdown' })
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
  @ApiOperation({ summary: 'Gets address for a loanDeposit' })
  @ApiResponse({
    schema: {
      example: {
        message: 'address retrieved successfully.',
        addressDetails: {
          coin: 'ETH',
          network: 'Ethereum(ERC20)',
          address: '0xd99ff56799ae030945429577fae639244d586597',
          memo: null,
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
    const email = req.claims['email'];
    const user = req.mexcClient;

    user.email = email;
    const asset = await this.userService.findOrCreateAssetWallet(
      email,
      dto.cryptoType,
    );
    user.asset_id = asset.id;
    user.mexc_username = user.memo;

    return await this.loansService.getAddress(user, dto);
  }

  // @Post('take-loan')
  // async takeLoan(@Request() req, @Body() dto: TakeLoanDto) {
  //   const userID = req.claims['userID'];

  //   console.log('REQ userID: ', userID);
  //   // console.log('REQ USER: ', req);
  //   // return await this.userService.takeLoan(userID, dto);
  // }
  @Get('transactions')
  @ApiOperation({ summary: "Lists user's transactions" })
  @ApiResponse({
    example: {
      data: [
        {
          id: 44,
          requested_amount: '1000.00',
          balance: '1050.00',
          amount_paid: '0.00',
          collateral_asset: 'BTC',
          collateral_amount: '0.00',
          repayment_amount: '1050.00',
          collateral_min_required: '0.00',
          rate: '5.00',
          status: 'APPROVED',
          approved_by: null,
          approved_at: null,
          created_at: '2025-12-21T10:27:04.000Z',
          updated_at: '2025-12-21T10:27:04.000Z',
          deposit_txid:
            '508a4f421860eb4ab22086d176ed09f0cfd5c595d033e1bd9a40fbed03cfd8f0:0',
          email: 'marcelezenagu92@gmail.com',
        },
      ],
      pagination: {
        page: 1,
        perPage: 20,
        total: 1,
        totalPages: 1,
      },
      success: 'true',
    },
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async transactions(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userID = req.claims['email'];

    console.log('REQ userID: ', userID);
    return await this.userService.userTransactions(
      userID,
      Number(page),
      Number(limit),
    );
  }

  @Get('loans')
  @ApiOperation({ summary: "Lists user's loans" })
  @ApiResponse({
    example: {
      data: [
        {
          id: 44,
          requested_amount: '1000.00',
          balance: '1050.00',
          amount_paid: '0.00',
          collateral_asset: 'BTC',
          collateral_amount: '0.00',
          repayment_amount: '1050.00',
          collateral_min_required: '0.00',
          rate: '5.00',
          status: 'APPROVED',
          approved_by: null,
          approved_at: null,
          created_at: '2025-12-21T10:27:04.000Z',
          updated_at: '2025-12-21T10:27:04.000Z',
          deposit_txid:
            '508a4f421860eb4ab22086d176ed09f0cfd5c595d033e1bd9a40fbed03cfd8f0:0',
          email: 'marcelezenagu92@gmail.com',
        },
      ],
      pagination: {
        page: 1,
        perPage: 20,
        total: 1,
        totalPages: 1,
      },
      success: 'true',
    },
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async loans(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userID = req.claims['email'];

    return await this.loansService.getUserLoans(
      userID,
      Number(page),
      Number(limit),
    );
  }

  // withdraw
  @Post('withdraw-init')
  @ApiResponse({
    schema: { example: { success: 'true', message: 'token sent' } },
  })
  @ApiOperation({
    summary: 'Initiates the withdrawal Process by sending a withdrawal-token',
  })
  async WithdrawInit(@Body() dto: InitWithdrawDto, @Req() req) {
    console.log(
      'dto.asset',
      dto,
      dto.withdrawType == WITHDRAW_TYPE.CRYPTO_WITHDRAW && !dto.asset,
    );
    if (dto.withdrawType == WITHDRAW_TYPE.CRYPTO_WITHDRAW && !dto.asset) {
      throw new BadRequestException('asset required but missing');
    }
    const email = req.claims['email'];

    // return 'coming soon';
    return await this.userService.initWithdraw(email, dto);
  }

  @Post('withdraw-resend-token')
  @ApiOperation({
    summary: 'Resends the withdrawal-token',
  })
  @ApiResponse({
    schema: { example: { success: 'true', message: 'token resent' } },
  })
  async WithdrawResend(@Body() dto: ResendWithdrawTokenDto, @Req() req) {
    const email = req.claims['email'];

    return await this.userService.resendWithdrawToken(email, dto.withdrawType);
  }

  @Post('withdraw-confirm')
  @ApiOperation({
    summary: 'Completes the withdrawal Process by a user',
  })
  @ApiResponse({
    schema: { example: { success: 'true', message: 'withdrawal successful' } },
  })
  async Withdraw(@Body() dto: WithdrawDto, @Req() req) {
    // console.log(
    //   'dto.asset',
    //   dto,
    //   dto.withdrawType == WITHDRAW_TYPE.CRYPTO_WITHDRAW && !dto.asset,
    // );

    // if (dto.withdrawType == WITHDRAW_TYPE.CRYPTO_WITHDRAW && !dto.asset) {
    //   throw new BadRequestException('asset required but missing');
    // }

    const email = req.claims['email'];

    const mexc_username = req.user['mexc_username'];

    return await this.withdrawService.withdraw(email, mexc_username, dto);
  }

  @Post('notifications-token')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: {
          type: 'string',
          description: 'Firebase Cloud Messaging token',
          example: 'fcm_device_token_here',
        },
      },
    },
  })
  @ApiOperation({ summary: 'adds firebase token for user-notification' })
  async saveFcmToken(@Req() req, @Body() body: { token: string }) {
    if (!body?.token) {
      throw new BadRequestException('token is required');
    }
    const email = req.claims['email'];

    return await this.userService.saveToken(email, body.token);
  }

  // setting
  // 1: // updatePhone--enterPin(forgotPin)

  // 2: add-alt-email(erify as expected)
  // 3: add NOK fullName; email, relatioship, phoneNumber
  @ApiOperation({ summary: 'updates a user profile ' })
  @Patch('profile')
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    const email = req.claims['email'];
    if (dto.section == ProfileSection.NOK && dto.nok == undefined) {
      throw new BadRequestException('nok required but empty');
    }
    return await this.userService.update(email, dto);
  }

  @Get('assets')
  @ApiResponse({
    schema: {
      example: {
        assets: [
          {
            coin: 'ETH',
            bal: 0,
          },
          {
            coin: 'BTC',
            bal: 0,
          },
        ],
        success: 'true',
      },
    },
  })
  @ApiOperation({ summary: 'lists all user assets' })
  async listAssets(@Req() req) {
    const email = req.claims['email'];
    return await this.userService.listAssetWallet(email);
  }

  @Get('banks')
  @ApiOperation({ summary: 'lists all supported banks' })
  @ApiResponse({
    schema: {
      example: {
        success: 'true',
        data: [
          {
            bankCode: 'dyy10000001',
            bankName: '3line Card management Limite',
          },
          {
            bankCode: '090270',
            bankName: 'AB MICROFINANCE BANK',
          },
        ],
      },
    },
  })
  async findAll() {
    return await this.userService.getbanks();
  }

  @Get('info')
  @ApiOperation({ summary: 'get updated userInfo' })
  @ApiResponse({
    schema: {
      example: {
        success: 'true',
        data: {},
      },
    },
  })
  async getInfo(@Req() req) {
    const email = req.claims['email'];

    return await this.userService.getInfo(email);
  }

  @Patch('add_bank')
  @ApiOperation({ summary: 'adds a supported bank account' })
  @ApiResponse({
    schema: {
      example: {
        success: 'true',
        message: 'account successfully added',
      },
    },
  })
  async addBank(@Req() req, @Body() dto: AddBankAccountDto) {
    const email = req.claims['email'];

    return await this.userService.addBankAccount(email, dto);
  }

  @Delete('remove_bank')
  @ApiResponse({
    schema: {
      example: {
        success: 'true',
        message: 'Bank account deleted',
      },
    },
  })
  @ApiOperation({ summary: 'removes/deletes a supported bank account' })
  async removeBank(@Req() req, @Body() dto: RemoveBankAccountDto) {
    const email = req.claims['email'];

    return await this.userService.deleteBankAccount(email, dto.accountId);
  }

  @Post('bank-withdraws')
  @ApiResponse({
    schema: {
      example: {
        success: 'true',
      },
    },
  })
  @ApiOperation({ summary: 'handle bank-withdraws' })
  async withdrawToBank(@Req() req, @Body() dto: BankWithdrawalDto) {
    const email = req.claims['email'];

    // return await this.userService.handleBankWithdrawal(email, dto);
    return await this.userService.initBankWithdrawal(email, dto);
  }
}
