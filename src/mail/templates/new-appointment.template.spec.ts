import { newAppointmentHtml, newAppointmentSubject } from './new-appointment.template';

const PAYLOAD = '<script>alert(1)</script>';

const maliciousData = {
  barberName: PAYLOAD,
  clientName: '<b>"injection"</b>',
  clientPhone: "123'456",
  clientEmail: '<script>steal()</script>',
  serviceName: PAYLOAD,
  date: '<img src=x onerror=alert(1)>',
  startTime: '&start',
  endTime: '10:00',
};

describe('newAppointment.template', () => {
  it('devuelve asunto de nueva cita registrada', () => {
    expect(newAppointmentSubject()).toBe('Nueva cita registrada');
  });

  it('no incluye el payload malicioso crudo en el HTML', () => {
    const html = newAppointmentHtml(maliciousData);
    expect(html).not.toContain(PAYLOAD);
    expect(html).not.toContain('<b>"injection"</b>');
  });

  it('incluye las entidades escapadas', () => {
    const html = newAppointmentHtml(maliciousData);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;&quot;injection&quot;&lt;/b&gt;');
    expect(html).toContain('123&#39;456');
    expect(html).toContain('&amp;start');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapa el email del cliente dentro del condicional', () => {
    const html = newAppointmentHtml(maliciousData);
    expect(html).not.toContain('<script>steal()</script>');
    expect(html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
  });

  it('incluye los tokens de la identidad visual dark + gold', () => {
    const html = newAppointmentHtml(maliciousData);
    expect(html).toContain('#121212');
    expect(html).toContain('#1e1e1e');
    expect(html).toContain('#d4af37');
    expect(html).toContain('#ffffff');
    expect(html).toContain('#b0b0b0');
  });

  it('incluye el footer personalizado de God\'s Hands', () => {
    const html = newAppointmentHtml(maliciousData);
    expect(html).toContain("God's Hands Barbería — Sistema de Gestión de Citas");
  });
});