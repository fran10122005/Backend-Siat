const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto o inválido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // { usu_codi, rol_codi, ... }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token expirado o inválido' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol_codi)) {
    return res.status(403).json({ error: 'Acceso denegado: Rol insuficiente' });
  }
  next();
};

module.exports = { authenticate, requireRole };
