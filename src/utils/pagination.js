/**
 * @param {number} totalItems
 * @param {number} page
 * @param {number} limit
 * @param {unknown[]} data
 */
export function buildPaginatedResponse(totalItems, page, limit, data) {
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  return {
    totalItems,
    totalPages,
    currentPage: page,
    data,
  };
}
