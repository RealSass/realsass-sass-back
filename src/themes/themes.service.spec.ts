import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ThemesService } from './themes.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockTheme = {
  id: 'uuid-1',
  projectKey: 'nodo-catamarca',
  name: 'NODO Catamarca',
  config: {
    primaryColor: '#E63946',
    fontMain: 'Nunito',
    borderRadius: 12,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  projectTheme: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ThemesService', () => {
  let service: ThemesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemesService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: CACHE_MANAGER,  useValue: mockCache  },
      ],
    }).compile();

    service = module.get<ThemesService>(ThemesService);
    jest.clearAllMocks();
  });

  // ── getThemeByKey ──────────────────────────────────────────────────────────

  describe('getThemeByKey', () => {
    it('debería retornar el config desde caché sin tocar la DB', async () => {
      const cached = { projectKey: 'nodo-catamarca', config: mockTheme.config, isDefault: false, cachedAt: '' };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.getThemeByKey('nodo-catamarca');

      expect(result).toEqual(cached);
      expect(mockPrisma.projectTheme.findUnique).not.toHaveBeenCalled();
    });

    it('debería consultar la DB ante un cache miss y guardar en caché', async () => {
      mockCache.get.mockResolvedValue(null);
      mockPrisma.projectTheme.findUnique.mockResolvedValue(mockTheme);

      const result = await service.getThemeByKey('nodo-catamarca');

      expect(result.config).toEqual(mockTheme.config);
      expect(result.isDefault).toBe(false);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('debería retornar tema por defecto con isDefault: true cuando no existe el projectKey', async () => {
      mockCache.get.mockResolvedValue(null);
      mockPrisma.projectTheme.findUnique.mockResolvedValue(null);

      const result = await service.getThemeByKey('clave-inexistente');

      expect(result.isDefault).toBe(true);
      expect(result.config.primaryColor).toBeDefined();
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('debería crear un tema nuevo correctamente', async () => {
      mockPrisma.projectTheme.findUnique.mockResolvedValue(null);
      mockPrisma.projectTheme.create.mockResolvedValue(mockTheme);

      const result = await service.create({
        projectKey: 'nodo-catamarca',
        name: 'NODO Catamarca',
        config: { primaryColor: '#E63946' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTheme);
    });

    it('debería lanzar ConflictException si el projectKey ya existe', async () => {
      mockPrisma.projectTheme.findUnique.mockResolvedValue(mockTheme);

      await expect(
        service.create({ projectKey: 'nodo-catamarca', name: 'Duplicado' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('debería actualizar un tema y hacer merge del config', async () => {
      const updated = { ...mockTheme, config: { ...mockTheme.config, borderRadius: 24 } };
      mockPrisma.projectTheme.findUnique.mockResolvedValue(mockTheme);
      mockPrisma.projectTheme.update.mockResolvedValue(updated);

      const result = await service.update('nodo-catamarca', { config: { borderRadius: 24 } });

      expect(result.success).toBe(true);
      expect(mockCache.del).toHaveBeenCalled(); // invalidación de caché
    });

    it('debería lanzar NotFoundException si el projectKey no existe', async () => {
      mockPrisma.projectTheme.findUnique.mockResolvedValue(null);

      await expect(
        service.update('no-existe', { name: 'Nuevo nombre' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('debería eliminar el tema e invalidar caché', async () => {
      mockPrisma.projectTheme.findUnique.mockResolvedValue(mockTheme);
      mockPrisma.projectTheme.delete.mockResolvedValue(mockTheme);

      const result = await service.remove('nodo-catamarca');

      expect(result.success).toBe(true);
      expect(mockCache.del).toHaveBeenCalledWith('theme:nodo-catamarca');
    });

    it('debería lanzar NotFoundException si el projectKey no existe', async () => {
      mockPrisma.projectTheme.findUnique.mockResolvedValue(null);

      await expect(service.remove('no-existe')).rejects.toThrow(NotFoundException);
    });
  });
});