import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AssignOwnerDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Solo se usa cuando el email NO existe todavía (creamos cuenta). */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
}
