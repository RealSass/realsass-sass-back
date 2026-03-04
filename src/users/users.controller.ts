import {
  Controller,
  Patch,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SelectRoleDto } from './dto/select-role.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me
   * Retorna el perfil completo del usuario autenticado
   */
  @Get('me')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    const profile = await this.usersService.findByFirebaseUid(user.uid);
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * PATCH /api/v1/users/select-role
   * Permite al usuario activar su rol: owner | affiliate
   *
   * Body: { "role": "owner" } o { "role": "affiliate" }
   * Headers: Authorization: Bearer <firebase_id_token>
   */
  @Patch('select-role')
  @HttpCode(HttpStatus.OK)
  async selectRole(
    @CurrentUser('uid') uid: string,
    @Body() selectRoleDto: SelectRoleDto,
  ) {
    return this.usersService.selectRole(uid, selectRoleDto);
  }
}