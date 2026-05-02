/**
 * 分页工具函数
 * 提供统一的分页逻辑处理
 */

/**
 * 计算总页数
 * @param {number} total - 总条数
 * @param {number} pageSize - 每页条数
 * @returns {number} - 总页数
 */
export function calculateTotalPages(total, pageSize) {
  if (total <= 0) return 1;
  if (pageSize <= 0) throw new Error('每页条数必须大于0');
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * 计算偏移量
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 * @returns {number} - 偏移量
 */
export function calculateOffset(page, pageSize) {
  const pageNum = Math.max(1, Math.floor(page));
  const pageSizeNum = Math.max(1, Math.floor(pageSize));
  return (pageNum - 1) * pageSizeNum;
}

/**
 * 生成分页数据
 * @param {Array} items - 数据项
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 * @param {number} total - 总条数
 * @returns {Object} - 分页数据
 */
export function createPaginationData(items, page, pageSize, total) {
  const totalPages = calculateTotalPages(total, pageSize);

  return {
    items: items || [],
    pagination: {
      page: Math.max(1, Math.min(page, totalPages)),
      pageSize,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      offset: calculateOffset(page, pageSize)
    }
  };
}

/**
 * 生成分页参数
 * @param {Object} options - 配置选项
 * @param {number} [options.page=1] - 当前页码
 * @param {number} [options.pageSize=20] - 每页条数
 * @param {number} [options.total=0] - 总条数
 * @returns {Object} - 分页参数
 */
export function createPaginationParams(options = {}) {
  const {
    page = 1,
    pageSize = 20,
    total = 0
  } = options;

  return {
    page: Math.max(1, Math.floor(page)),
    pageSize: Math.max(1, Math.floor(pageSize)),
    total: Math.max(0, Math.floor(total))
  };
}

/**
 * 分页导航信息
 * @param {Object} pagination - 分页数据
 * @param {number} [maxButtons=5] - 最大显示的页码按钮数
 * @returns {Object} - 分页导航信息
 */
export function createPaginationNav(pagination, maxButtons = 5) {
  const { page, totalPages } = pagination;

  // 计算显示的页码范围
  const halfButtons = Math.floor(maxButtons / 2);
  let startPage = Math.max(1, page - halfButtons);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  // 调整起始页码，确保显示maxButtons个按钮（如果可能）
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  // 生成页码数组
  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return {
    pages,
    currentPage: page,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
    firstPage: 1,
    lastPage: totalPages
  };
}

/**
 * 限制页码在有效范围内
 * @param {number} page - 页码
 * @param {number} totalPages - 总页数
 * @returns {number} - 有效的页码
 */
export function clampPage(page, totalPages) {
  return Math.max(1, Math.min(page, totalPages));
}

/**
 * 获取分页元数据
 * @param {Object} options - 配置选项
 * @param {number} options.page - 当前页码
 * @param {number} options.pageSize - 每页条数
 * @param {number} options.total - 总条数
 * @param {Array} options.items - 数据项
 * @returns {Object} - 分页元数据
 */
export function getPaginationMetadata(options) {
  const { page, pageSize, total, items } = options;
  const totalPages = calculateTotalPages(total, pageSize);
  const startItem = items.length > 0 ? calculateOffset(page, pageSize) + 1 : 0;
  const endItem = Math.min(startItem + items.length - 1, total);

  return {
    currentPage: page,
    totalPages,
    pageSize,
    total,
    startItem,
    endItem,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    isFirstPage: page === 1,
    isLastPage: page === totalPages,
    itemsCount: items.length,
    from: startItem,
    to: endItem
  };
}

/**
 * 生成分页查询参数
 * @param {Object} options - 配置选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页条数
 * @param {string} [paramNamePage='page'] - 页码参数名
 * @param {string} [paramNamePageSize='page_size'] - 每页条数参数名
 * @returns {Object} - 查询参数
 */
export function createQueryParams(options, paramNamePage = 'page', paramNamePageSize = 'page_size') {
  const { page, pageSize } = createPaginationParams(options);

  return {
    [paramNamePage]: page,
    [paramNamePageSize]: pageSize
  };
}

/**
 * 从请求参数中解析分页信息
 * @param {Object} params - 请求参数
 * @param {Object} [options] - 配置选项
 * @param {number} [options.defaultPage=1] - 默认页码
 * @param {number} [options.defaultPageSize=20] - 默认每页条数
 * @param {number} [options.maxPageSize=200] - 最大每页条数
 * @returns {Object} - 分页信息
 */
export function parsePaginationFromRequest(params, options = {}) {
  const {
    defaultPage = 1,
    defaultPageSize = 20,
    maxPageSize = 200
  } = options;

  const page = parseInt(params.page) || defaultPage;
  const pageSize = Math.min(parseInt(params.pageSize) || defaultPageSize, maxPageSize);

  return createPaginationParams({ page, pageSize });
}

/**
 * 分页中间件（用于API处理）
 * @param {Object} options - 配置选项
 * @param {number} [options.defaultPage=1] - 默认页码
 * @param {number} [options.defaultPageSize=20] - 默认每页条数
 * @returns {Function} - 中间件函数
 */
export function createPaginationMiddleware(options = {}) {
  return (req, res, next) => {
    const pagination = parsePaginationFromRequest(req.query, options);
    req.pagination = pagination;
    next();
  };
}