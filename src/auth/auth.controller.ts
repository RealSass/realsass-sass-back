import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/sync?ref=RE-XXXXXXXX  (ref opcional)
   * Verifica el token de Firebase y sincroniza el usuario con PostgreSQL.
   *
   * Query params:
   *   ref (opcional): código de afiliado para registrar el referido
   *
   * Headers: Authorization: Bearer <firebase_id_token>
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(
    @CurrentUser() user: CurrentUserPayload,
    @Query('ref') affiliateCode?: string,
  ) {
    const result = await this.authService.syncUser(user, affiliateCode);

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