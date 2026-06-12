import {
  Controller,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout/:appointmentId')
  @ApiOperation({
    summary: 'Crear preferencia de pago',
    description: 'Crea una preferencia de pago para una cita',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'ID de la cita',
    type: 'number',
  })
  @ApiResponse({
    status: 201,
    description: 'Preferencia de pago creada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async createCheckout(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ) {
    return this.paymentsService.createPreference(appointmentId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de pagos',
    description: 'Maneja notificaciones de pago de MercadoPago',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiResponse({ status: 200, description: 'Webhook procesado exitosamente' })
  async handleWebhook(@Body() body: any, @Query() query: any) {
    await this.paymentsService.handleWebhook(body, query);
    return { received: true };
  }
}
