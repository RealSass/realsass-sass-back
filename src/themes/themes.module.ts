import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

@Module({
  imports: [
    /**
     * CacheModule en memoria (store por defecto).
     * TTL base de 5 min; el servicio puede sobrescribirlo por llamada.
     *
     * Para producción con alta carga podés reemplazar el store por Redis:
     *   pnpm add cache-manager-redis-yet ioredis
     *   store: await redisStore({ socket: { host, port }, ttl: 300 })
     */
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutos en ms
      max: 200,            // máximo de entradas en memoria
    }),
  ],
  controllers: [ThemesController],
  providers: [ThemesService],
  exports: [ThemesService],
})
export class ThemesModule {}