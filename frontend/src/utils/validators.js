/**
 * 参数校验工具函数
 * 提供统一的参数校验和错误抛出
 */

/**
 * 校验必需参数
 * @param {*} value - 参数值
 * @param {string} paramName - 参数名称
 * @param {string} [customMessage] - 自定义错误消息
 * @throws {Error} - 如果参数无效则抛出错误
 */
export function validateRequired(value, paramName, customMessage = null) {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (!trimmed && trimmed !== 0 && trimmed !== false) {
    const message = customMessage || `请输入${paramName}`;
    throw new Error(message);
  }
}

/**
 * 校验字符串参数
 * @param {string} value - 参数值
 * @param {string} paramName - 参数名称
 * @param {Object} [options] - 校验选项
 * @param {number} [options.minLength] - 最小长度
 * @param {number} [options.maxLength] - 最大长度
 * @param {RegExp} [options.pattern] - 正则表达式校验
 * @throws {Error} - 如果参数无效则抛出错误
 */
export function validateString(value, paramName, options = {}) {
  validateRequired(value, paramName);

  const trimmed = value.trim();
  const { minLength, maxLength, pattern } = options;

  if (minLength && trimmed.length < minLength) {
    throw new Error(`${paramName}长度不能少于${minLength}个字符`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new Error(`${paramName}长度不能超过${maxLength}个字符`);
  }

  if (pattern && !pattern.test(trimmed)) {
    throw new Error(`${paramName}格式不正确`);
  }
}

/**
 * 校验数字参数
 * @param {number} value - 参数值
 * @param {string} paramName - 参数名称
 * @param {Object} [options] - 校验选项
 * @param {number} [options.min] - 最小值
 * @param {number} [options.max] - 最大值
 * @throws {Error} - 如果参数无效则抛出错误
 */
export function validateNumber(value, paramName, options = {}) {
  validateRequired(value, paramName);

  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${paramName}必须是有效的数字`);
  }

  const { min, max } = options;
  if (min !== undefined && num < min) {
    throw new Error(`${paramName}不能小于${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`${paramName}不能大于${max}`);
  }

  return num;
}

/**
 * 校验文件参数
 * @param {File} file - 文件对象
 * @param {string} paramName - 参数名称
 * @param {Object} [options] - 校验选项
 * @param {Array<string>} [options.allowedTypes] - 允许的文件类型
 * @param {number} [options.maxSize] - 最大文件大小（字节）
 * @throws {Error} - 如果文件无效则抛出错误
 */
export function validateFile(file, paramName, options = {}) {
  validateRequired(file, paramName);

  const { allowedTypes = [], maxSize } = options;

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(`${paramName}必须是${allowedTypes.join(', ')}格式`);
  }

  if (maxSize && file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
    throw new Error(`${paramName}大小不能超过${maxSizeMB}MB`);
  }
}

/**
 * 校验分页参数
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {Object} [options] - 校验选项
 * @param {number} [options.minPage=1] - 最小页码
 * @param {number} [options.maxPage=1000] - 最大页码
 * @param {number} [options.minSize=1] - 最小每页条数
 * @param {number} [options.maxSize=200] - 最大每页条数
 * @returns {Object} - 校验后的分页参数
 * @throws {Error} - 如果参数无效则抛出错误
 */
export function validatePagination(page, pageSize, options = {}) {
  const {
    minPage = 1,
    maxPage = 1000,
    minSize = 1,
    maxSize = 200
  } = options;

  const pageNum = validateNumber(page, '页码', { min: minPage, max: maxPage });
  const pageSizeNum = validateNumber(pageSize, '每页条数', { min: minSize, max: maxSize });

  return {
    page: pageNum,
    pageSize: pageSizeNum
  };
}

/**
 * 校验ID参数
 * @param {number|string} id - ID值
 * @param {string} paramName - 参数名称
 * @throws {Error} - 如果ID无效则抛出错误
 */
export function validateId(id, paramName = 'ID') {
  if (typeof id === 'string') {
    validateRequired(id, paramName);
    const trimmed = id.trim();
    if (!/^\d+$/.test(trimmed) && !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new Error(`${paramName}格式不正确`);
    }
  } else if (typeof id === 'number') {
    validateNumber(id, paramName, { min: 1 });
  } else {
    throw new Error(`${paramName}必须是字符串或数字`);
  }
}

/**
 * 校验搜索参数
 * @param {Object} searchParams - 搜索参数对象
 * @param {Object} [options] - 校验选项
 * @returns {Object} - 校验后的搜索参数
 * @throws {Error} - 如果参数无效则抛出错误
 */
export function validateSearchParams(searchParams, options = {}) {
  const {
    allowedMatchModes = ['fuzzy', 'exact'],
    maxKeywordLength = 100
  } = options;

  if (!searchParams || typeof searchParams !== 'object') {
    throw new Error('搜索参数必须是有效的对象');
  }

  // 校验关键词
  if (searchParams.keyword !== undefined) {
    validateString(searchParams.keyword, '关键词', { maxLength: maxKeywordLength });
  }

  // 校验匹配模式
  if (searchParams.match_mode !== undefined) {
    if (!allowedMatchModes.includes(searchParams.match_mode)) {
      throw new Error(`匹配模式必须是${allowedMatchModes.join('或')}`);
    }
  }

  // 校验分页
  if (searchParams.page !== undefined && searchParams.page_size !== undefined) {
    const { page, pageSize } = validatePagination(searchParams.page, searchParams.page_size);
    searchParams.page = page;
    searchParams.page_size = pageSize;
  }

  return searchParams;
}