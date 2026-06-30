import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import type { RequestWithTenant } from '../../common/types';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Public()
  @Post('stripe')
  @ApiExcludeEndpoint()
  async stripe(
    @Req() req: RequestWithTenant,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const raw = req.rawBody;
    if (!raw) {
      throw new BadRequestException('Missing raw request body');
    }
    try {
      return await this.webhooks.handle(raw, signature);
    } catch (err) {
      throw new BadRequestException(
        `Webhook error: ${(err as Error).message}`,
      );
    }
  }
}
