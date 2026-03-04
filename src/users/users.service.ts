import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SelectRoleDto, UserRole } from './dto/select-role.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  /**
   * PATCH /users/select-role
   * Permite al usuario seleccionar su rol: 'owner' o 'affiliate'.
   * - Owner → crea entrada en Organization
   * - Affiliate → genera affiliateCode único y crea AffiliateData
   */
  async selectRole(firebaseUid: string, dto: SelectRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: { organization: true, affiliateData: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado. Por favor sincroniza tu cuenta primero en /auth/sync',
      );
    }

    if (dto.role === UserRole.OWNER) {
      if (user.isOwner) {
        throw new BadRequestException('El usuario ya es Owner');
      }

      // Transacción: activar isOwner + crear Organization vacía
      const updatedUser = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { isOwner: true },
        });

        await this.organizationsService.createForUser(user.id, tx);

        return updated;
      });

      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true, affiliateData: true },
      });

      this.logger.log(`Usuario ${user.email} activado como Owner`);
      return {
        success: true,
        message: 'Rol Owner activado. Organización creada exitosamente.',
        data: fullUser,
      };
    }

    if (dto.role === UserRole.AFFILIATE) {
      if (user.isAffiliate) {
        throw new BadRequestException('El usuario ya es Afiliado');
      }

      // Generar código único de afiliado: RE-XXXXXXXX
      const affiliateCode = await this.generateUniqueAffiliateCode();

      // Transacción: activar isAffiliate + crear AffiliateData
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            isAffiliate: true,
            affiliateCode,
          },
        });

        await tx.affiliateData.create({
          data: {
            userId: user.id,
            balance: 0,
            referralCount: 0,
          },
        });
      });

      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true, affiliateData: true },
      });

      this.logger.log(
        `Usuario ${user.email} activado como Affiliate con código: ${affiliateCode}`,
      );
      return {
        success: true,
        message: 'Rol Affiliate activado. Código de afiliado generado.',
        data: fullUser,
      };
    }
  }

  async findByFirebaseUid(firebaseUid: string) {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
      include: { organization: true, affiliateData: true },
    });
  }

  private async generateUniqueAffiliateCode(): Promise<string> {
  let code = '';  // ✅ inicializar con valor por defecto
  let exists = true;

  while (exists) {
    const raw = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    code = `RE-${raw}`;
    const found = await this.prisma.user.findUnique({
      where: { affiliateCode: code },
    });
    exists = !!found;
  }

  return code;
}
}