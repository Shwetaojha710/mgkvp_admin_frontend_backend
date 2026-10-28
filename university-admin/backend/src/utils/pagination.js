function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPagedResult(rows, total, page, limit) {
  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { parsePagination, buildPagedResult };
