import { IsString, Length } from 'class-validator';

export class UseRedemptionDto {
  @IsString()
  @Length(6, 16)
  code!: string;
}
