import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una organización vacía para un usuario Owner.
   * Acepta un cliente Prisma de transacción (tx) o el servicio estándar.
   */
  async createForUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.organization.create({
      data: {
        userId,
        // name vacío: el usuario lo completará luego en su perfil
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.organization.findUnique({
      where: { userId },
      include: { user: true },
    });
  }
}