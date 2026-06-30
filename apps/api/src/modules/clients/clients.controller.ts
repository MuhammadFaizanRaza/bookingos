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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@bookingos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateClientDto) {
    return this.clients.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List/search clients (by name, email, phone)' })
  findAll(@CurrentTenant() tenantId: string, @Query() pagination: PaginationDto) {
    return this.clients.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client with history' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.clients.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a client' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.clients.remove(tenantId, id);
  }
}
