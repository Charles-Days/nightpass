import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class AdminAdjustDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(-100_000)
  @Max(100_000)
  points!: number;

  @IsString()
  @Length(5, 500)
  reason!: string;
}
