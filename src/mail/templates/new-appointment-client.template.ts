import { htmlEscape } from './html-escape';

interface NewAppointmentClientTemplateData {
  clientName: string;
  barberName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function newAppointmentClientHtml(
  data: NewAppointmentClientTemplateData,
): string {
  const es = (value: string): string => htmlEscape(value);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cita Confirmada</title>
</head>
<body style="margin: 0; padding: 0; background-color: #121212; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #121212;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #1e1e1e; border-radius: 8px; border: 1px solid #333;">
          <tr>
            <td style="background-color: #1e1e1e; border-bottom: 3px solid #d4af37; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; color: #d4af37;">Cita Confirmada</h1>
              <p style="margin: 6px 0 0; font-size: 14px; color: #b0b0b0;">God's Hands Barbería</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #ffffff;">Hola <strong>${es(data.clientName)}</strong>,</p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #b0b0b0;">Tu cita ha sido confirmada. Aquí tienes el resumen:</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; color: #d4af37; text-transform: uppercase; letter-spacing: 0.5px;">Barbero</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 8px; font-size: 16px; color: #ffffff; font-weight: 500;">${es(data.barberName)}</td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #333;"></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; color: #d4af37; text-transform: uppercase; letter-spacing: 0.5px;">Servicio</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 8px; font-size: 16px; color: #ffffff; font-weight: 500;">${es(data.serviceName)}</td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #333;"></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; color: #d4af37; text-transform: uppercase; letter-spacing: 0.5px;">Fecha</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 8px; font-size: 16px; color: #ffffff; font-weight: 500;">${es(data.date)}</td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #333;"></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 11px; color: #d4af37; text-transform: uppercase; letter-spacing: 0.5px;">Horario</td>
                </tr>
                <tr>
                  <td style="padding: 0 0 8px; font-size: 16px; color: #ffffff; font-weight: 500;">${es(data.startTime)} - ${es(data.endTime)}</td>
                </tr>
              </table>

              <p style="margin: 16px 0 0; font-size: 14px; color: #b0b0b0;">Te esperamos en la fecha y hora indicadas. Si necesitas modificar o cancelar tu cita, contáctanos con anticipación.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1e1e1e; border-top: 1px solid #333; padding: 16px 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #b0b0b0;">God's Hands Barbería — Sistema de Gestión de Citas</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function newAppointmentClientSubject(): string {
  return 'Cita confirmada';
}
