import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@salonos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  CreateTimeOffDto,
  SetWorkingHoursDto,
  UpdateStaffDto,
} from './dto/staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a staff member (user + profile)' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateStaffDto) {
    return this.staff.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List staff' })
  @ApiQuery({ name: 'bookableOnly', required: false, type: Boolean })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('bookableOnly') bookableOnly?: string,
  ) {
    return this.staff.findAll(tenantId, bookableOnly === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member with hours & time off' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.staff.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a staff member' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Remove a staff member' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.staff.remove(tenantId, id);
  }

  @Put(':id/working-hours')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Replace a staff member weekly working hours' })
  setWorkingHours(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetWorkingHoursDto,
  ) {
    return this.staff.setWorkingHours(tenantId, id, dto);
  }

  @Post(':id/time-off')
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Add a time-off entry' })
  addTimeOff(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateTimeOffDto,
  ) {
    return this.staff.addTimeOff(tenantId, id, dto);
  }

  @Delete(':id/time-off/:timeOffId')
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Delete a time-off entry' })
  removeTimeOff(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('timeOffId') timeOffId: string,
  ) {
    return this.staff.removeTimeOff(tenantId, id, timeOffId);
  }
}
