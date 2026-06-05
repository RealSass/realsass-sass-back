// src/health/health.controller.ts
//
// Endpoint: GET /health
// Retorna HTTP 200 indicando que el proceso está vivo.
// No chequea la DB — si la DB está sleeping Railway no debe matar el deploy.
// El endpoint está excluido del globalPrefix 'api/v1' (ver main.ts).

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
