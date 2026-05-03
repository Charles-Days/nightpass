import { IsString, MaxLength, MinLength } from 'class-validator';

export class ScanPassDto {
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  qrCode!: string;
}
