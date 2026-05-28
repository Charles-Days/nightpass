import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ExportCsvQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsUUID('all')
  eventId?: string;
}
