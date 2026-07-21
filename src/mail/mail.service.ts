import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@barberia.com';

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no está configurada. Los correos no se enviarán.',
      );
    }

    this.resend = new Resend(apiKey ?? '');
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.configService.get<string>('RESEND_API_KEY')) {
      this.logger.warn(
        `[EMAIL SIMULADO] Para: ${options.to} | Asunto: ${options.subject}`,
      );
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.error(
          `Error al enviar email a ${options.to}: ${error.message}`,
        );
      } else {
        this.logger.log(`Email enviado exitosamente a ${options.to}`);
      }
    } catch (err) {
      this.logger.error(
        `Error al enviar email a ${options.to}: ${(err as Error).message}`,
      );
    }
  }
}
