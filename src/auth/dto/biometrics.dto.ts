// src/auth/dto/enable-biometrics.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EnableBiometricsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  publicKey: string; // PEM or base64
}

export class BiometricsLoginDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  challenge: string;

  // @ApiProperty()
  // @IsNotEmpty()
  // @IsString()
  // signature: string; // base64
}

export class RotateKeyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  newPublicKey: string;
}
