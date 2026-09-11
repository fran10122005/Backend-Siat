/**
 * Helper para paginación consistente en SIAT Backend.
 * Aplica por defecto page=1 y limit=50 (con tope máximo de 100), garantizando
 * compatibilidad con el frontend y evitando transferencias excesivas de datos.
 */
function getPagination(query = {}, defaultLimit = 50, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    formatMeta: (total) => ({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  };
}

module.exports = { getPagination };
