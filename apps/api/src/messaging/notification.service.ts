import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@bookingos/database';
import { TenantService } from '../database/tenant.service';
import { MailService } from './mail.service';

export interface NotifyParams {
  tenantId: string;
  userId?: string;
  channel?: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  email?: string;
  subject?: string;
  body?: string;
}

/**
 * Queues + dispatches notifications (booking confirmations, reminders).
 * Persists a Notification row per tenant and, in dev, logs the dispatch.
 * SMS/WhatsApp (Twilio) and push can plug into the same `notify()` entry point.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly tenants: TenantService,
    private readonly mail: MailService,
  ) {}

  async notify(params: NotifyParams): Promise<void> {
    const channel = params.channel ?? NotificationChannel.EMAIL;
    const db = this.tenants.getClient(params.tenantId);

    const record = await db.notification.create({
      // `tenantId` is stamped automatically by the tenant-scoped client.
      data: {
        userId: params.userId,
        channel,
        template: params.template,
        payload: params.payload as object,
        status: NotificationStatus.QUEUED,
      } as Prisma.NotificationUncheckedCreateInput,
    });

    try {
      if (channel === NotificationChannel.EMAIL && params.email) {
        await this.mail.send({
          to: params.email,
          subject: params.subject ?? params.template,
          text: params.body,
        });
      } else {
        // SMS / WhatsApp / PUSH: log in dev; integrate Twilio etc. later.
        this.logger.log(
          `🔔 [DEV] ${channel} "${params.template}" -> ${params.email ?? params.userId ?? 'n/a'}`,
        );
      }
      await db.notification.update({
        where: { id: record.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Notification ${record.id} failed`, err as Error);
      await db.notification.update({
        where: { id: record.id },
        data: { status: NotificationStatus.FAILED },
      });
    }
  }
}
