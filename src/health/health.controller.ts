// src/health/health.controller.ts
//
// Endpoint: GET /health
// Registrado FUERA del globalPrefix 'api/v1' (ver main.ts → app.setGlobalPrefix).
// Railway healthcheckPath apunta a /health — debe responder 200 en < 5 s.
//
// Checks:
//   database → prisma.$queryRaw`SELECT 1`
//   memory   → heap < 300 MB

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
