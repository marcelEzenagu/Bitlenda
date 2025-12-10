import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsIn,
  isString,
  IsOptional,
} from 'class-validator';

export class TakeLoanDto {
  @ApiProperty({ example: 1000, description: 'The amount of loan to take' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    example: 'aex84774..',
    description: 'The address the user will deposit to',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'ETH',
    description: 'The type of cryptocurrency for collateral',
    enum: ['ETH', 'BTC'],
  })
  @IsString()
  @IsIn(['ETH', 'BTC'])
  cryptoType: string;
}
