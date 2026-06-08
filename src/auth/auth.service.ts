import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AffiliatesService } from '../affiliate/affiliate.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  /**
   * POST /auth/sync
   * Crea o actualiza el usuario. Devuelve el perfil completo.
   */
  async syncUser(firebaseUser: CurrentUserPayload, affiliateCode?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    if (existing) {
      this.logger.log(`Usuario existente sincronizado: ${existing.email}`);
      const profile = await this.usersService.buildProfile(firebaseUser.uid);
      return { user: profile, isNew: false };
    }

    // Crear nuevo usuario
    const newUser = await this.prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        email:       firebaseUser.email,
        isOwner:     false,
        isAffiliate: false,
      },
    });

    this.logger.log(`Nuevo usuario creado: ${newUser.email}`);

    // Registrar referido si vino código de afiliado
    if (affiliateCode) {
      try {
        await this.affiliatesService.registerReferral(newUser.id, affiliateCode);
      } catch (err: any) {
        this.logger.warn(`Error al registrar referido con código ${affiliateCode}: ${err.message}`);
      }
    }

    const profile = await this.usersService.buildProfile(firebaseUser.uid);
    return { user: profile, isNew: true };
  }
}
