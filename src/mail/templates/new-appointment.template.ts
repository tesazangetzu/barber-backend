interface NewAppointmentTemplateData {
  barberName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function newAppointmentHtml(data: NewAppointmentTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1a1a2e; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 24px; }
    .detail { margin-bottom: 12px; }
    .detail-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-value { font-size: 16px; color: #333; font-weight: 500; }
    .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
    .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nueva Cita Registrada</h1>
    </div>
    <div class="body">
      <p>Hola <strong>${data.barberName}</strong>,</p>
      <p>Se ha registrado una nueva cita con los siguientes detalles:</p>

      <hr class="divider" />

      <div class="detail">
        <div class="detail-label">Cliente</div>
        <div class="detail-value">${data.clientName}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Teléfono</div>
        <div class="detail-value">${data.clientPhone}</div>
      </div>
      ${data.clientEmail ? `<div class="detail"><div class="detail-label">Email</div><div class="detail-value">${data.clientEmail}</div></div>` : ''}
      <div class="detail">
        <div class="detail-label">Servicio</div>
        <div class="detail-value">${data.serviceName}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Fecha</div>
        <div class="detail-value">${data.date}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Horario</div>
        <div class="detail-value">${data.startTime} - ${data.endTime}</div>
      </div>

      <hr class="divider" />

      <p style="color: #666; font-size: 14px;">Por favor, asegúrate de estar preparado para atender al cliente a la hora indicada.</p>
    </div>
    <div class="footer">
      Barbería — Sistema de Gestión de Citas
    </div>
  </div>
</body>
</html>`;
}

export function newAppointmentSubject(): string {
  return 'Nueva cita registrada';
}
