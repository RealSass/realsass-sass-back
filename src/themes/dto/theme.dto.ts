import {
  IsString,
  IsOptional,
  IsHexColor,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Design-token config ──────────────────────────────────────────────────────

/**
 * ThemeConfigDto
 * Representa los design-tokens que se guardan en el campo JSONB `config`.
 * Todos los campos son opcionales para permitir configs parciales,
 * pero si se envían deben pasar las validaciones.
 */
export class ThemeConfigDto {
  /** Color primario en hex  ej: "#1A73E8" */
  @IsHexColor({ message: 'primaryColor debe ser un color hexadecimal válido (ej: #1A73E8)' })
  @IsOptional()
  primaryColor?: string;

  /** Color secundario en hex */
  @IsHexColor({ message: 'secondaryColor debe ser un color hexadecimal válido' })
  @IsOptional()
  secondaryColor?: string;

  /** Color de acento */
  @IsHexColor({ message: 'accentColor debe ser un color hexadecimal válido' })
  @IsOptional()
  accentColor?: string;

  /** Color de fondo */
  @IsHexColor({ message: 'backgroundColor debe ser un color hexadecimal válido' })
  @IsOptional()
  backgroundColor?: string;

  /** Color de texto principal */
  @IsHexColor({ message: 'textColor debe ser un color hexadecimal válido' })
  @IsOptional()
  textColor?: string;

  /** Border-radius en px (0–48) */
  @IsNumber({}, { message: 'borderRadius debe ser un número' })
  @Min(0, { message: 'borderRadius no puede ser negativo' })
  @Max(48, { message: 'borderRadius no puede superar 48px' })
  @IsOptional()
  borderRadius?: number;

  /**
   * Fuente principal — se valida contra la lista de Google Fonts más comunes
   * + familias seguras del sistema. El frontend es responsable de cargarla.
   */
  @IsString()
  @MaxLength(80)
  @IsOptional()
  fontMain?: string;

  /** Fuente secundaria (headings, display) */
  @IsString()
  @MaxLength(80)
  @IsOptional()
  fontHeading?: string;

  /** Modo de tema: 'light' | 'dark' | 'system' */
  @IsString()
  @Matches(/^(light|dark|system)$/, {
    message: "themeMode debe ser 'light', 'dark' o 'system'",
  })
  @IsOptional()
  themeMode?: string;

  /**
   * Tokens extra arbitrarios para casos de uso avanzados.
   * Se guardan tal cual, sin validación adicional.
   * Ejemplo: { "buttonShadow": "0 2px 4px rgba(0,0,0,0.2)" }
   */
  @IsObject({ message: 'customTokens debe ser un objeto JSON' })
  @IsOptional()
  customTokens?: Record<string, string | number>;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateThemeDto {
  /**
   * Clave única del proyecto.
   * Solo letras minúsculas, números y guiones. Ej: 'nodo-catamarca'.
   */
  @IsString()
  @IsNotEmpty({ message: 'projectKey es requerido' })
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "projectKey solo puede contener letras minúsculas, números y guiones (ej: 'nodo-catamarca')",
  })
  projectKey: string;

  /** Nombre legible del proyecto */
  @IsString()
  @IsNotEmpty({ message: 'name es requerido' })
  @MinLength(2)
  @MaxLength(100)
  name: string;

  /** Design tokens del tema */
  @ValidateNested()
  @Type(() => ThemeConfigDto)
  @IsOptional()
  config?: ThemeConfigDto;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdateThemeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => ThemeConfigDto)
  @IsOptional()
  config?: ThemeConfigDto;
}