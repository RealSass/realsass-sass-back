import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { User } from 'generated/prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /auth/sync
   * Sincroniza el usuario de Firebase con PostgreSQL.
   * Crea el usuario si no existe, o retorna el perfil existente.
   */
  async syncUser(firebaseUser: CurrentUserPayload): Promise<{
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
    return { user: newUser, isNew: true };
  }
}