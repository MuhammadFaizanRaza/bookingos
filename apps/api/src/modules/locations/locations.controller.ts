import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@bookingos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a location' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateLocationDto) {
    return this.locations.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List locations' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.locations.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a location' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.locations.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a location' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locations.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a location' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.locations.remove(tenantId, id);
  }
}
