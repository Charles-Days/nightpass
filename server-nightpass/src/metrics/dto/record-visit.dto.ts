import { IsString, Length } from 'class-validator';

export class RecordVisitDto {
  @IsString()
  @Length(8, 128)
  visitorId!: string;
}
