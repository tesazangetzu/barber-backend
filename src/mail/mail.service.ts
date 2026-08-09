import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string | undefined;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('BREVO_FROM_EMAIL');
    this.fromName =
      this.configService.get<string>('BREVO_FROM_NAME') || "God's Hands";

    if (
      !this.configService.get<string>('BREVO_API_KEY') ||
      !this.fromEmail
    ) {
      this.logger.warn(
        'BREVO_API_KEY o BREVO_FROM_EMAIL no están configuradas. Los correos no se enviarán.',
      );
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');

    if (!apiKey || !this.fromEmail) {
      this.logger.warn(
        `[EMAIL SIMULADO] Para: ${options.to} | Asunto: ${options.subject}`,
      );
      return;
    }

    try {
      const response = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.fromEmail,
            name: this.fromName,
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
          code?: string;
          [key: string]: unknown;
        };
        this.logger.error(
          `Error al enviar email a ${options.to}: ${body.message ?? body.code ?? response.status}`,
        );
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        messageId?: string;
        [key: string]: unknown;
      };
      this.logger.log(`Email enviado exitosamente a ${options.to}${body.messageId ? ` (${body.messageId})` : ''}`);
    } catch (err) {
      this.logger.error(
        `Error al enviar email a ${options.to}: ${(err as Error).message}`,
      );
    }
  }
}
