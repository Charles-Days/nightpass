import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class SetCashRpsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  rpProfileIds!: string[];
}
