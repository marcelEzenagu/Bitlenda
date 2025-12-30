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
  CRYPTO = 'CRYPTO',
  CASH = 'CASH',
}
export class WithdrawDto {
  @ApiProperty({ example: 1000, description: 'The amount of loan to take' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: WITHDRAW_TYPE.CASH,
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
}
