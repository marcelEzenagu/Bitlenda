import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  ValidateIf,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProfileSection {
  PHONE = 'phone',
  EMAIL = 'email',
  NOK = 'nok',
}

class NokDto {
  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email?: string;
}
export class UpdateProfileDto {
  @ApiProperty()
  @ApiProperty({
    enum: ProfileSection,
  })
  @IsEnum(ProfileSection)
  section: ProfileSection;

  /* ================= PHONE ================= */
  @ApiPropertyOptional()
  @ValidateIf((o) => o.section === ProfileSection.PHONE)
  @IsString()
  phone?: string;

  /* ================= EMAIL ================= */
  @ApiPropertyOptional()
  @ValidateIf((o) => o.section === ProfileSection.EMAIL)
  @IsEmail()
  email?: string;

  /* ================= NOK ================= */
  @ApiPropertyOptional()
  @ValidateIf((o) => o.section === ProfileSection.NOK)
  @ValidateNested()
  @Type(() => NokDto)
  nok?: NokDto;
}
