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
import { Role } from '@salonos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List reviews' })
  @ApiQuery({ name: 'staffId', required: false })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.reviews.findAll(tenantId, staffId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a review (e.g. publish/unpublish)' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a review' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reviews.remove(tenantId, id);
  }
}
