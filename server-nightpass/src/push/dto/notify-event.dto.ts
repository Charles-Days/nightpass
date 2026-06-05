import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export type EventAudience = 'GEO' | 'CHECKIN' | 'BOTH';

export class NotifyEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  body!: string;

  /** Máximo de personas que recibirán la notificación (muestra aleatoria). */
  @IsInt()
  @Min(1)
  @Max(1000)
  max!: number;

  /** Cómo se decide quién "está en el evento". */
  @IsIn(['GEO', 'CHECKIN', 'BOTH'])
  audience!: EventAudience;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;
}
