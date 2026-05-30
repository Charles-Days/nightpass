import { IsUUID } from 'class-validator';

export class IssuePassDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  tierId!: string;
}
