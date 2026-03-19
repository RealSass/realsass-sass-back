import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { User } from 'generated/prisma/client';
import { AffiliatesService } from 'src/affiliate/affiliate.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  /**
   * POST /auth/sync?ref=RE-XXXXXXXX (ref es opcional)
   * Sincroniza el usuario de Firebase con PostgreSQL.
   * Si viene un código de afiliado válido y el usuario es nuevo, registra el referido.
   */
  async syncUser(
    firebaseUser: CurrentUserPayload,
    affiliateCode?: string,
  ): Promise<{
    user: User & { organization: any; affiliateData: any };
    isNew: boolean;
  }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
      include: {
        organization: true,
        affiliateData: true,
      },
    });

    if (existingUser) {
      this.logger.log(`Usuario existente sincronizado: ${existingUser.email}`);
      return { user: existingUser, isNew: false };
    }

    // Crear nuevo usuario
    const newUser = await this.prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        isOwner: false,
        isAffiliate: false,
      },
      include: {
        organization: true,
        affiliateData: true,
      },
    });

    this.logger.log(`Nuevo usuario creado: ${newUser.email}`);

    // Si vino un código de afiliado, registrar el referido (no bloquea si falla)
    if (affiliateCode) {
      try {
        await this.affiliatesService.registerReferral(newUser.id, affiliateCode);
      } catch (err) {
        this.logger.warn(
          `Error al registrar referido con código ${affiliateCode}: ${err.message}`,
        );
      }
    }

    // Refrescar usuario por si registerReferral escribió referredByCode
    const freshUser = await this.prisma.user.findUnique({
      where: { id: newUser.id },
      include: { organization: true, affiliateData: true },
    });

    return { user: freshUser!, isNew: true };
  }
}