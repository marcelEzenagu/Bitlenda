import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export enum ProfileSection {
  PHONE = 'phone',
  EMAIL = 'email',
  NOK = 'nok',
}

export class UpdateProfileDto {
  @IsEnum(ProfileSection)
  section: ProfileSection;

  /* ================= PHONE ================= */
  @ValidateIf((o) => o.section === ProfileSection.PHONE)
  @IsString()
  phone?: string;

  /* ================= EMAIL ================= */
  @ValidateIf((o) => o.section === ProfileSection.EMAIL)
  @IsEmail()
  email?: string;

  /* ================= NOK ================= */
  @ValidateIf((o) => o.section === ProfileSection.NOK)
  nok?: {
    full_name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}
