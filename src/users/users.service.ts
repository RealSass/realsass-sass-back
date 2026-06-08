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
   * Construye el perfil completo del usuario — shape canónico para el front.
   * Incluye:
   *   - datos del usuario
   *   - organización propia (si es Owner)
   *   - colaboraciones activas en otras orgs (multitenancy)
   *   - affiliateData (si es Afiliado)
   */
  async buildProfile(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        organization: true,
        affiliateData: true,
        // orgs donde es colaborador activo (multitenancy)
        collaborations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: {
              select: {
                id:          true,
                name:        true,
                logoUrl:     true,
                description: true,
                website:     true,
                phone:       true,
                address:     true,
                userId:      true,
                createdAt:   true,
                updatedAt:   true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    // Construir lista de tenants:
    // 1. Su propia org (si es Owner)
    // 2. Orgs donde es colaborador activo
    const tenants = [];

    if (user.isOwner && user.organization) {
      tenants.push({
        organizationId: user.organization.id,
        organization:   user.organization,
        role:           'OWNER' as const,
        permissions:    {
          canViewListings:        true,
          canCreateListings:      true,
          canEditListings:        true,
          canDeleteListings:      true,
          canViewStats:           true,
          canManageLeads:         true,
          canManageCollaborators: true,
        },
      });
    }

    for (const collab of user.collaborations) {
      tenants.push({
        organizationId: collab.organizationId,
        organization:   collab.organization,
        role:           'COLLABORATOR' as const,
        permissions: {
          canViewListings:        collab.canViewListings,
          canCreateListings:      collab.canCreateListings,
          canEditListings:        collab.canEditListings,
          canDeleteListings:      collab.canDeleteListings,
          canViewStats:           collab.canViewStats,
          canManageLeads:         collab.canManageLeads,
          canManageCollaborators: collab.canManageCollaborators,
        },
      });
    }

    return {
      id:             user.id,
      firebaseUid:    user.firebaseUid,
      email:          user.email,
      displayName:    user.displayName,
      avatarUrl:      user.avatarUrl,
      isOwner:        user.isOwner,
      isAffiliate:    user.isAffiliate,
      affiliateCode:  user.affiliateCode,
      referredByCode: user.referredByCode,
      createdAt:      user.createdAt,
      updatedAt:      user.updatedAt,
      // Org propia (acceso rápido sin tener que buscar en tenants)
      organization:   user.organization,
      // Todos los tenants (propia + colaboraciones)
      tenants,
      // Datos de afiliado
      affiliateData:  user.affiliateData
        ? {
            id:            user.affiliateData.id,
            balance:       user.affiliateData.balance.toString(),
            referralCount: user.affiliateData.referralCount,
            createdAt:     user.affiliateData.createdAt,
          }
        : null,
    };
  }

  /**
   * GET /users/me — perfil completo
   */
  async getMyProfile(firebaseUid: string) {
    const profile = await this.buildProfile(firebaseUid);
    if (!profile) throw new NotFoundException('Usuario no encontrado. Llamá a /auth/sync primero.');
    return profile;
  }

  /**
   * PATCH /users/select-role
   */
  async selectRole(firebaseUid: string, dto: SelectRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: { organization: true, affiliateData: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado. Llamá a /auth/sync primero.');
    }

    if (dto.role === UserRole.OWNER) {
      if (user.isOwner) throw new BadRequestException('El usuario ya es Owner');

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { isOwner: true } });
        await this.organizationsService.createForUser(user.id, tx);
      });

      this.logger.log(`Usuario ${user.email} activado como Owner`);
    }

    if (dto.role === UserRole.AFFILIATE) {
      if (user.isAffiliate) throw new BadRequestException('El usuario ya es Afiliado');

      const affiliateCode = await this.generateUniqueAffiliateCode();

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { isAffiliate: true, affiliateCode },
        });
        await tx.affiliateData.create({
          data: { userId: user.id, balance: 0, referralCount: 0 },
        });
      });

      this.logger.log(`Usuario ${user.email} activado como Affiliate con código: ${affiliateCode}`);
    }

    // Siempre devolver el perfil completo actualizado
    const profile = await this.buildProfile(firebaseUid);
    return {
      success: true,
      message: dto.role === UserRole.OWNER
        ? 'Rol Owner activado. Organización creada exitosamente.'
        : 'Rol Afiliado activado. Código de referido generado.',
      data: profile,
    };
  }

  private async generateUniqueAffiliateCode(): Promise<string> {
    let code = '';
    let exists = true;
    while (exists) {
      const raw = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
      code = `RE-${raw}`;
      const found = await this.prisma.user.findUnique({ where: { affiliateCode: code } });
      exists = !!found;
    }
    return code;
  }
}
