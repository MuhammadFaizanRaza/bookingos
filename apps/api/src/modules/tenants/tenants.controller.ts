import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@bookingos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current salon settings & subscription' })
  current(@CurrentTenant() tenantId: string) {
    return this.tenants.getCurrent(tenantId);
  }

  @Patch()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update salon branding, locale, currency, timezone' })
  update(@CurrentTenant() tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(tenantId, dto);
  }
}
