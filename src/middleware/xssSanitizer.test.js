const xssSanitizer = require('./xssSanitizer');

describe('xssSanitizer Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {};
    next = jest.fn();
  });

  test('elimina etiquetas <script> y vectores maliciosos de texto plano', () => {
    req.body = {
      titulo: 'Nota clínica <script>alert("xss")</script>',
      descripcion: '<img src=x onerror="alert(1)">Observación médica',
      profundo: {
        diagnostico: 'TEA Nivel 1 <iframe src="javascript:alert(2)"></iframe>'
      }
    };

    xssSanitizer(req, res, next);

    expect(req.body.titulo).toBe('Nota clínica ');
    expect(req.body.descripcion).toBe('Observación médica');
    expect(req.body.profundo.diagnostico).toBe('TEA Nivel 1 ');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('preserva contraseñas intactas sin alterar caracteres especiales', () => {
    req.body = {
      usu_crro: 'admin@siat.com',
      password: 'MiContraseñaSegura<>&"\'123!',
      currentPassword: 'Otra<Clave>&!',
      usu_clve: 'Hash<bcrypt>&!'
    };

    xssSanitizer(req, res, next);

    expect(req.body.password).toBe('MiContraseñaSegura<>&"\'123!');
    expect(req.body.currentPassword).toBe('Otra<Clave>&!');
    expect(req.body.usu_clve).toBe('Hash<bcrypt>&!');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('sanitiza parámetros de query y params', () => {
    req.query = { search: '<script>alert(1)</script>Juan' };
    req.params = { id: '<b onmouseover=alert(1)>123</b>' };

    xssSanitizer(req, res, next);

    expect(req.query.search).toBe('Juan');
    expect(req.params.id).toBe('123');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
