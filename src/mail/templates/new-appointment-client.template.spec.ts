import {
  newAppointmentClientHtml,
  newAppointmentClientSubject,
} from './new-appointment-client.template';

const PAYLOAD = '<script>alert(1)</script>';

const maliciousData = {
  clientName: PAYLOAD,
  barberName: '<b>"barber"</b>',
  serviceName: "<img src=x onerror=alert(1)>",
  date: '&fecha',
  startTime: '10:00',
  endTime: '11:00',
};

describe('new-appointment-client.template', () => {
  it('devuelve asunto de cita confirmada', () => {
    expect(newAppointmentClientSubject()).toBe('Cita confirmada');
  });

  it('no incluye el payload malicioso crudo en el HTML', () => {
    const html = newAppointmentClientHtml(maliciousData);
    expect(html).not.toContain(PAYLOAD);
    expect(html).not.toContain('<b>"barber"</b>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('incluye las entidades escapadas', () => {
    const html = newAppointmentClientHtml(maliciousData);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;&quot;barber&quot;&lt;/b&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&amp;fecha');
  });

  it('incluye los tokens de la identidad visual dark + gold', () => {
    const html = newAppointmentClientHtml(maliciousData);
    expect(html).toContain('#121212');
    expect(html).toContain('#1e1e1e');
    expect(html).toContain('#d4af37');
    expect(html).toContain('#ffffff');
    expect(html).toContain('#b0b0b0');
  });

  it('incluye el footer personalizado de God\'s Hands', () => {
    const html = newAppointmentClientHtml(maliciousData);
    expect(html).toContain("God's Hands Barbería — Sistema de Gestión de Citas");
  });

  it('no incluye teléfono ni email del barbero', () => {
    const html = newAppointmentClientHtml(maliciousData);
    expect(html.toLowerCase()).not.toContain('teléfono');
    expect(html.toLowerCase()).not.toContain('telefono');
    expect(html.toLowerCase()).not.toContain('email');
  });
});