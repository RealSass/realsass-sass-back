import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto'; // sin "s"

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  async getMyOrganization(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.getMyOrganization(user.uid);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMyOrganization(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateMyOrganization(user.uid, dto);
  }
}