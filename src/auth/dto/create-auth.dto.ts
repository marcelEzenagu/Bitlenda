import { IsEmail, IsIn, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from 'src/user/entities/role.entity';

export class VerifyResetDto {
  @ApiProperty()
  @IsNotEmpty()
  otp: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class VerifyResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  otp: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
export class VerifyDto {
  @ApiProperty()
  @IsNotEmpty()
  otp: string;

  @ApiProperty()
  @IsNotEmpty()
  email: string;
}
export class ResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).+$/, {
    message:
      'password must be 8–20 characters, include upper and lowercase letters, a number, and a special character (allowed: !@#$%^&*_).',
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).+$/, {
    message:
      'confirmPassword must be 8–20 characters, include upper and lowercase letters, a number, and a special character (allowed: !@#$%^&*_).',
  })
  confirmPassword: string;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'The unique identifier for the user, email or phone number',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'The type of OTP request: either for account verification or password reset',
    enum: ['verification', 'reset'],
    example: 'verification',
  })
  @IsNotEmpty()
  @IsIn(['verification', 'reset'])
  otpType: string;
}

export class CreateAccountDto {
  @ApiProperty({
    description: 'The unique email for the user ',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).+$/, {
    message:
      'password must be 8–20 characters, include upper and lowercase letters, a number, and a special character.',
  })
  password: string;

  role: RoleName;
}

export class CreateAuthDto {
  @ApiProperty({
    description: 'The unique email for the user ',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).+$/, {
    message:
      'password must be 8–20 characters, include upper and lowercase letters, a number, and a special character.',
  })
  password: string;
}

export class PasswordSettingDto {
  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).+$/, {
    message:
      'password must be 8–20 characters, include upper and lowercase letters, a number, and a special character.',
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).+$/, {
    message:
      'confirmPassword must be 8–20 characters, include upper and lowercase letters, a number, and a special character.',
  })
  confirmPassword: string;
}
