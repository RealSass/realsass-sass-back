import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/sync
   * Verifica el token de Firebase (via guard global) y sincroniza
   * el usuario con la base de datos PostgreSQL.
   *
   * Headers: Authorization: Bearer <firebase_id_token>
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.authService.syncUser(user);

    return {
      success: true,
      isNew: result.isNew,
      message: result.isNew
        ? 'Usuario creado exitosamente'
        : 'Usuario sincronizado exitosamente',
      data: result.user,
    };
  }
}