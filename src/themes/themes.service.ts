import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThemeDto, UpdateThemeDto, ThemeConfigDto } from './dto/theme.dto';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CACHE_TTL_MS  = 5 * 60 * 1000;
const CACHE_PREFIX  = 'theme:';

/**
 * Claves de los temas insertados por el seed.
 * Los owners NO pueden modificar ni eliminar estos temas.
 */
const GLOBAL_KEYS = new Set([
  'saas-inmobiliario',
  'gestion-qr',
  'nodo-catamarca',
  'admin-panel',
]);

const DEFAULT_THEME_CONFIG: ThemeConfigDto = {
  primaryColor:     '#1A73E8',
  secondaryColor:   '#34A853',
  accentColor:      '#FBBC04',
  backgroundColor:  '#FFFFFF',
  textColor:        '#202124',
  borderRadius:     8,
  fontMain:         'Inter',
  fontHeading:      'Inter',
  themeMode:        'light',
  customTokens:     {},
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ── Helpers privados ────────────────────────────────────────────────────────

  private cacheKey(projectKey: string) {
    return `${CACHE_PREFIX}${projectKey}`;
  }

  private async invalidate(projectKey: string) {
    await this.cache.del(this.cacheKey(projectKey));
  }

  /**
   * Resuelve el owner y su organización a partir del firebaseUid.
   * Lanza NotFoundException / ForbiddenException si no corresponde.
   */
  private async resolveOwner(firebaseUid: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: { organization: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.isOwner || !user.organization) {
      throw new ForbiddenException('Solo los owners pueden gestionar temas');
    }

    return { user, org: user.organization };
  }

  // ── GET público ─────────────────────────────────────────────────────────────

  /**
   * Busca el tema por key con cache-aside.
   * Si no existe devuelve el DEFAULT_THEME_CONFIG con isDefault: true.
   */
  async getThemeByKey(projectKey: string): Promise<{
    projectKey: string;
    config: ThemeConfigDto;
    isDefault: boolean;
    cachedAt?: string;
  }> {
    const key = this.cacheKey(projectKey);

    const cached = await this.cache.get<{
      projectKey: string;
      config: ThemeConfigDto;
      isDefault: boolean;
      cachedAt: string;
    }>(key);

    if (cached) {
      this.logger.debug(`Cache HIT → ${projectKey}`);
      return cached;
    }

    this.logger.debug(`Cache MISS → ${projectKey}`);

    const theme = await this.prisma.projectTheme.findUnique({
      where: { projectKey },
    });

    const payload = theme
      ? {
          projectKey: theme.projectKey,
          config:     theme.config as unknown as ThemeConfigDto,
          isDefault:  false,
          cachedAt:   new Date().toISOString(),
        }
      : {
          projectKey,
          config:    DEFAULT_THEME_CONFIG,
          isDefault: true,
          cachedAt:  new Date().toISOString(),
        };

    if (!theme) {
      this.logger.warn(`"${projectKey}" no encontrado. Devolviendo tema por defecto.`);
    }

    await this.cache.set(key, payload, CACHE_TTL_MS);
    return payload;
  }

  // ── Listado ─────────────────────────────────────────────────────────────────

  /**
   * GET /themes
   * Devuelve los temas globales (seed) + los propios de la organización del owner.
   * Los temas globales se marcan con `isGlobal: true` para que el frontend
   * pueda mostrarlos como "plantillas del sistema" sin opción de editar/borrar.
   */
  async findAll(firebaseUid: string) {
    const { org } = await this.resolveOwner(firebaseUid);

    const all = await this.prisma.projectTheme.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const data = all.map((t) => ({
      ...t,
      isGlobal: GLOBAL_KEYS.has(t.projectKey),
      isOwn:    t.organizationId === org.id,
    }));

    return { success: true, data };
  }

  // ── CRUD para owners ────────────────────────────────────────────────────────

  /**
   * POST /themes
   * El owner crea un tema nuevo asociado a su organización.
   * No puede reusar una projectKey global ni una ya existente.
   */
  async createForOwner(firebaseUid: string, dto: CreateThemeDto) {
    const { org } = await this.resolveOwner(firebaseUid);

    if (GLOBAL_KEYS.has(dto.projectKey)) {
      throw new ForbiddenException(
        `"${dto.projectKey}" es una clave reservada del sistema`,
      );
    }

    const existing = await this.prisma.projectTheme.findUnique({
      where: { projectKey: dto.projectKey },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un tema con la clave "${dto.projectKey}"`,
      );
    }

    const theme = await this.prisma.projectTheme.create({
      data: {
        projectKey:     dto.projectKey,
        name:           dto.name,
        config:         (dto.config ?? {}) as object,
        organizationId: org.id,
      },
    });

    this.logger.log(`Tema creado: ${theme.projectKey} (org: ${org.id})`);
    return { success: true, data: theme };
  }

  /**
   * PATCH /themes/:projectKey
   * El owner actualiza un tema propio (merge superficial del config).
   * No puede editar temas globales.
   */
  async updateForOwner(
    firebaseUid: string,
    projectKey: string,
    dto: UpdateThemeDto,
  ) {
    const { org } = await this.resolveOwner(firebaseUid);

    if (GLOBAL_KEYS.has(projectKey)) {
      throw new ForbiddenException(
        'Los temas globales del sistema no pueden editarse',
      );
    }

    const theme = await this.prisma.projectTheme.findUnique({
      where: { projectKey },
    });

    if (!theme) {
      throw new NotFoundException(`No existe un tema con la clave "${projectKey}"`);
    }

    if (theme.organizationId !== org.id) {
      throw new ForbiddenException('No tenés permisos para editar este tema');
    }

    const mergedConfig = {
      ...(theme.config as object),
      ...(dto.config ?? {}),
    };

    const updated = await this.prisma.projectTheme.update({
      where: { projectKey },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        config: mergedConfig,
      },
    });

    await this.invalidate(projectKey);

    this.logger.log(`Tema actualizado: ${projectKey} (org: ${org.id})`);
    return { success: true, data: updated };
  }

  /**
   * DELETE /themes/:projectKey
   * El owner elimina un tema propio.
   * No puede borrar temas globales.
   */
  async removeForOwner(firebaseUid: string, projectKey: string) {
    const { org } = await this.resolveOwner(firebaseUid);

    if (GLOBAL_KEYS.has(projectKey)) {
      throw new ForbiddenException(
        'Los temas globales del sistema no pueden eliminarse',
      );
    }

    const theme = await this.prisma.projectTheme.findUnique({
      where: { projectKey },
    });

    if (!theme) {
      throw new NotFoundException(`No existe un tema con la clave "${projectKey}"`);
    }

    if (theme.organizationId !== org.id) {
      throw new ForbiddenException('No tenés permisos para eliminar este tema');
    }

    await this.prisma.projectTheme.delete({ where: { projectKey } });
    await this.invalidate(projectKey);

    this.logger.log(`Tema eliminado: ${projectKey} (org: ${org.id})`);
    return { success: true, message: `Tema "${projectKey}" eliminado` };
  }
}