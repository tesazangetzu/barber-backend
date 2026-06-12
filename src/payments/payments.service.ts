import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  PaymentStatus,
  PaymentMethod,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private mpClient: MercadoPagoConfig | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly appointmentsService: AppointmentsService,
  ) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (accessToken) {
      this.mpClient = new MercadoPagoConfig({ accessToken });
      this.logger.log('✅ MercadoPago client initialized successfully.');
    } else {
      this.logger.warn(
        '⚠️ MERCADOPAGO_ACCESS_TOKEN not defined. Payments will run in MOCK mode.',
      );
    }
  }

  async createPreference(
    appointmentId: number,
  ): Promise<{ init_point: string; preference_id: string }> {
    // 1. Fetch appointments using AppointmentsService
    // To keep it simple, we can fetch all and find, or let's assume we can fetch by id
    const appointments = await this.appointmentsService.findAll();
    const appointment = appointments.find((a) => a.id === appointmentId);

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${appointmentId} no encontrada`);
    }

    if (!this.mpClient) {
      // Mock flow
      this.logger.log(
        `[MOCK PAYMENT] Creating preference for appointment ${appointmentId}`,
      );
      return {
        init_point: `https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=mock-pref-${appointmentId}`,
        preference_id: `mock-pref-${appointmentId}`,
      };
    }

    try {
      const preference = new Preference(this.mpClient);
      const response = await preference.create({
        body: {
          items: [
            {
              id: String(appointment.service.id),
              title: appointment.service.name,
              quantity: 1,
              unit_price: Number(appointment.service.price),
              currency_id: 'MXN', // Or use config
            },
          ],
          external_reference: String(appointment.id),
          back_urls: {
            success:
              this.configService.get<string>(
                'FRONTEND_URL',
                'http://localhost:4321',
              ) + '/booking/success',
            failure:
              this.configService.get<string>(
                'FRONTEND_URL',
                'http://localhost:4321',
              ) + '/booking/failure',
            pending:
              this.configService.get<string>(
                'FRONTEND_URL',
                'http://localhost:4321',
              ) + '/booking/pending',
          },
          auto_return: 'approved',
          notification_url: this.configService.get<string>(
            'MERCADOPAGO_WEBHOOK_URL',
            'http://localhost:3000/payments/webhook',
          ),
        },
      });

      return {
        init_point: response.init_point!,
        preference_id: response.id!,
      };
    } catch (error) {
      this.logger.error('Error creating MercadoPago preference', error);
      throw new BadRequestException(
        'No se pudo crear la preferencia de pago de MercadoPago',
      );
    }
  }

  async handleWebhook(body: any, query: any): Promise<void> {
    this.logger.log(
      `Received MercadoPago webhook query: ${JSON.stringify(query)}, body: ${JSON.stringify(body)}`,
    );

    // MercadoPago webhooks can send topic/id in query or action/data in body
    const action = body.action || query.topic;
    const dataId = body.data?.id || query.id;

    if (action === 'payment' && dataId) {
      this.logger.log(`Processing payment ID: ${dataId}`);

      if (!this.mpClient) {
        // Mock simulation
        this.logger.log(
          `[MOCK WEBHOOK] Simulating payment success for ID: ${dataId}`,
        );
        return;
      }

      try {
        const paymentClient = new Payment(this.mpClient);
        const paymentData = await paymentClient.get({ id: dataId });

        const appointmentId = Number(paymentData.external_reference);
        const status = paymentData.status;

        if (status === 'approved' && appointmentId) {
          this.logger.log(
            `💰 Payment APPROVED for appointment ${appointmentId}. Marking as PAID.`,
          );
          await this.appointmentsService.updatePaymentStatus(
            appointmentId,
            PaymentStatus.PAID,
            PaymentMethod.ONLINE,
            String(dataId),
          );
        } else if (
          (status === 'rejected' || status === 'cancelled') &&
          appointmentId
        ) {
          this.logger.log(
            `❌ Payment REJECTED/CANCELLED for appointment ${appointmentId}.`,
          );
          await this.appointmentsService.updatePaymentStatus(
            appointmentId,
            PaymentStatus.PENDING,
            PaymentMethod.ONLINE,
            String(dataId),
          );
        }
      } catch (error) {
        this.logger.error(
          'Error fetching payment details from MercadoPago',
          error,
        );
      }
    }
  }
}
