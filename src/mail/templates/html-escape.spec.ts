import { htmlEscape } from './html-escape';

describe('htmlEscape', () => {
  it('escapa < y >', () => {
    expect(htmlEscape('<tag>')).toBe('&lt;tag&gt;');
  });

  it('escapa &', () => {
    expect(htmlEscape('a & b')).toBe('a &amp; b');
  });

  it('escapa comillas dobles', () => {
    expect(htmlEscape('"doble"')).toBe('&quot;doble&quot;');
  });

  it('escapa comillas simples', () => {
    expect(htmlEscape("'simple'")).toBe('&#39;simple&#39;');
  });

  it('escapa un payload malicioso de script', () => {
    expect(htmlEscape('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('no altera texto plano sin caracteres especiales', () => {
    expect(htmlEscape('texto normal')).toBe('texto normal');
  });
});
