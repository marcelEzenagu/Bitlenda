import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsIn,
  isString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum WITHDRAW_TYPE {
  CRYPTO_WITHDRAW = 'CRYPTO_WITHDRAW',
  CASH_WITHDRAW = 'CASH_WITHDRAW',
}

export class InitWithdrawDto {
  @ApiProperty({ example: 1000, description: 'The amount to withdraw' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: WITHDRAW_TYPE.CRYPTO_WITHDRAW,
    description: 'The type of withdrawal',
    enum: WITHDRAW_TYPE,
  })

  //   @IsString()
  @IsEnum(WITHDRAW_TYPE)
  withdrawType: WITHDRAW_TYPE;

  @ApiPropertyOptional({
    example: 'ETH',
    description: 'The type of cryptocurrency to withdraw',
    enum: ['ETH', 'BTC'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ETH', 'BTC'])
  asset?: string;

  @ApiPropertyOptional({
    example: '0xe..',
    description: 'The crypto address to receive the coin',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '058' })
  @IsString()
  @IsOptional()
  accountId?: string;
}

export class WithdrawDto extends InitWithdrawDto {
  @ApiProperty({
    example: '0544..',
    description: 'The token sent to verify withdrawal',
  })
  @IsString()
  token: string;
}
export class ResendWithdrawTokenDto {
  @ApiProperty({
    example: WITHDRAW_TYPE.CRYPTO_WITHDRAW,
    description: 'The type of withdrawal',
    enum: WITHDRAW_TYPE,
  })
  @IsEnum(WITHDRAW_TYPE)
  withdrawType: WITHDRAW_TYPE;
}
