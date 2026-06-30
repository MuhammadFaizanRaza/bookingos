import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Transactional email. In dev it logs to the console; the interface is ready
 * to be backed by SMTP/Nodemailer or a provider (Resend, SES) in production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from =
      config.get<string>('MAIL_FROM') ?? 'SalonOS <no-reply@salonos.app>';
  }

  async send(message: MailMessage): Promise<void> {
    // TODO: wire SMTP transport (SMTP_HOST/PORT/USER/PASSWORD) for production.
    this.logger.log(
      `📧 [DEV] mail from "${this.from}" to "${message.to}": ${message.subject}`,
    );
  }
}
