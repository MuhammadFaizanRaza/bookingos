import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@bookingos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a service' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateServiceDto) {
    return this.services.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List services' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.services.findAll(tenantId, categoryId, activeOnly === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.services.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a service' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a service' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.services.remove(tenantId, id);
  }
}
