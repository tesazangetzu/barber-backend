import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  const createMailService = async (config: Record<string, string>) => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    return moduleRef.get<MailService>(MailService);
  };

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('entra en modo mock ([EMAIL SIMULADO]) sin API key', async () => {
    const service = await createMailService({
      BREVO_FROM_EMAIL: 'test@example.com',
    });
    const warnSpy = jest.spyOn(service['logger'], 'warn');
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await service.sendEmail({
      to: 'cliente@example.com',
      subject: 'Asunto',
      html: '<p>hola</p>',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[EMAIL SIMULADO] Para: cliente@example.com | Asunto: Asunto',
    );
  });

  it('entra en modo mock ([EMAIL SIMULADO]) sin BREVO_FROM_EMAIL', async () => {
    const service = await createMailService({
      BREVO_API_KEY: 'key-real',
    });
    const warnSpy = jest.spyOn(service['logger'], 'warn');
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await service.sendEmail({
      to: 'cliente@example.com',
      subject: 'Asunto',
      html: '<p>hola</p>',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[EMAIL SIMULADO] Para: cliente@example.com | Asunto: Asunto',
    );
  });

  it('envía con fetch y loguea el messageId en respuesta 2xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messageId: 'abc-123' }),
    });
    global.fetch = fetchMock;

    const service = await createMailService({
      BREVO_API_KEY: 'key-real',
      BREVO_FROM_EMAIL: 'noreply@example.com',
      BREVO_FROM_NAME: "God's Hands",
    });
    const logSpy = jest.spyOn(service['logger'], 'log');

    await service.sendEmail({
      to: 'cliente@example.com',
      subject: 'Asunto',
      html: '<p>hola</p>',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'api-key': 'key-real',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }),
    );

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
    const [, init] = calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: 'noreply@example.com', name: "God's Hands" },
      to: [{ email: 'cliente@example.com' }],
      subject: 'Asunto',
      htmlContent: '<p>hola</p>',
    });

    expect(logSpy).toHaveBeenCalledWith(
      'Email enviado exitosamente a cliente@example.com (abc-123)',
    );
  });

  it('loguea el error del cuerpo de Brevo cuando response.ok es false', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          message: 'sender not verified',
          code: 'invalid_parameter',
        }),
    });
    global.fetch = fetchMock;

    const service = await createMailService({
      BREVO_API_KEY: 'key-real',
      BREVO_FROM_EMAIL: 'noreply@example.com',
    });
    const errorSpy = jest.spyOn(service['logger'], 'error');

    await service.sendEmail({
      to: 'cliente@example.com',
      subject: 'Asunto',
      html: '<p>hola</p>',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error al enviar email a cliente@example.com: sender not verified',
    );
  });

  it('loguea el error de red (fetch lanza) sin relanzar', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));

    const service = await createMailService({
      BREVO_API_KEY: 'key-real',
      BREVO_FROM_EMAIL: 'noreply@example.com',
    });
    const errorSpy = jest.spyOn(service['logger'], 'error');

    await expect(
      service.sendEmail({
        to: 'cliente@example.com',
        subject: 'Asunto',
        html: '<p>hola</p>',
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      'Error al enviar email a cliente@example.com: fetch failed',
    );
  });
});
