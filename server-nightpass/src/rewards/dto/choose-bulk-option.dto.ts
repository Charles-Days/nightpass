import { IsUUID } from 'class-validator';

export class ChooseBulkOptionDto {
  @IsUUID('all')
  optionId!: string;
}
