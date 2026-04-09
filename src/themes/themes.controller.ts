import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThemesService } from './themes.service';
import { CreateThemeDto, UpdateThemeDto } from './dto/theme.dto';
import { Public } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  // ── Ruta pública ────────────────────────────────────────────────────────────

  /**
   * GET /themes/:projectKey  — PÚBLICO (sin token)
   *
   * El frontend llama este endpoint al iniciar para obtener los
   * design-tokens y pintar la UI. Si la key no existe devuelve
   * el tema por defecto con `isDefault: true`.
   */
  @Public()
  @Get(':projectKey')
  async getTheme(@Param('projectKey') projectKey: string) {
    const result = await this.themesService.getThemeByKey(projectKey);
    return {
      projectKey: result.projectKey,
      isDefault: result.isDefault,
      ...result.config,
    };
  }

  // ── Rutas para owners (requieren Firebase Auth) ─────────────────────────────

  /**
   * GET /themes
   * Lista los temas globales (del seed) + los propios del owner autenticado.
   */
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.themesService.findAll(user.uid);
  }

  /**
   * POST /themes
   * El owner crea un tema personalizado para su organización.
   *
   * @example
   * {
   *   "projectKey": "mi-inmobiliaria",
   *   "name": "Mi Inmobiliaria",
   *   "config": {
   *     "primaryColor": "#2563EB",
   *     "fontMain": "Inter",
   *     "borderRadius": 8,
   *     "themeMode": "light"
   *   }
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateThemeDto,
  ) {
    return this.themesService.createForOwner(user.uid, dto);
  }

  /**
   * PATCH /themes/:projectKey
   * El owner actualiza parcialmente un tema propio.
   * No puede editar temas globales (los del seed).
   */
  @Patch(':projectKey')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectKey') projectKey: string,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.themesService.updateForOwner(user.uid, projectKey, dto);
  }

  /**
   * DELETE /themes/:projectKey
   * El owner elimina un tema propio (no puede borrar temas globales).
   */
  @Delete(':projectKey')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('projectKey') projectKey: string,
  ) {
    return this.themesService.removeForOwner(user.uid, projectKey);
  }
}