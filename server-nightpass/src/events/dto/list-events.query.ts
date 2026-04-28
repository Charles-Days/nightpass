import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListEventsQuery {
  @IsOptional() @IsUUID('all') venueId?: string;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit: number = 20;
}
