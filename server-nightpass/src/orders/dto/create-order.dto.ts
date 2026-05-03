import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('all')
  tierId!: string;
}
