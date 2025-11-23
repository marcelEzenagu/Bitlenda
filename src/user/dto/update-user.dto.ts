import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class SetPinDto {
  @ApiProperty({ example: '1234' })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;
}

export enum VerificationSection {
  BASIC_INFO = 'BASIC_INFO',
  REGULATORY_INFO = 'REGULATORY_INFO',
}

export class VerificationDto {
  @ApiProperty({
    required: false,
    description: 'User first name, used in PERSONAL_INFO step',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    required: false,
    description: 'User last name, used in PERSONAL_INFO step',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    required: false,
    description: 'Date of birth (YYYY-MM-DD), used in PERSONAL_INFO step',
  })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiProperty({
    required: false,
    description: 'User country of residence, used in COUNTRY_RESIDENCE step',
  })
  @IsOptional()
  @IsString()
  countryOfResidence?: string;

  @ApiProperty({
    required: false,
    description: 'Phone number, used in CONTACT_INFO step',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    description: 'BVN number, used in REGULATORY_INFO step',
  })
  @IsOptional()
  @IsString()
  bvn?: string;

  @ApiProperty({
    enum: VerificationSection,
    description:
      'Indicates which section the user is currently submitting data for',
    example: VerificationSection.BASIC_INFO,
  })
  @IsEnum(VerificationSection)
  section: VerificationSection;
}
