import { useCallback, useState } from "react";
import { request, getApiUrl, API_PATHS } from "../utils/api";
import { cacheManager } from "../utils/cache";
import { requestDeduplicator } from "../utils/requestDeduplicator";
import { errorHandler } from "../utils/errorHandler";
import { validateRequired, validateFile, validateSearchParams, validateId, validatePagination } from "../utils/validators";
import { createPaginationParams, calculateTotalPages } from "../utils/pagination";

/**
 * 使用API操作的自定义Hook
 * 统一管理所有API调用，提供缓存、请求去重、错误处理和加载状态管理
 *
 * @param {string} apiBase - API基础URL，例如："http://localhost:8000"
 * @returns {Object} - API操作方法集合
 *
 * @property {Function} queryImport - 查询导入数据
 *   @param {string} importId - 导入批次ID
 *   @param {number} [page=1] - 页码，默认1
 *   @param {number} [pageSize=20] - 每页条数，默认20
 *   @param {boolean} [useCache=true] - 是否使用缓存，默认true
 *   @returns {Promise<Object>} - 查询结果
 *
 * @property {Function} createImport - 创建导入任务（上传Excel文件）
 *   @param {File} file - Excel文件对象
 *   @returns {Promise<Object>} - 导入结果
 *
 * @property {Function} searchCompanies - 搜索企业数据
 *   @param {Object} searchParams - 搜索参数
 *   @param {string} searchParams.keyword - 关键词
 *   @param {string} searchParams.match_mode - 匹配模式："fuzzy"或"exact"
 *   @param {Object} searchParams.filters - 过滤条件
 *   @param {number} searchParams.page - 页码
 *   @param {number} searchParams.page_size - 每页条数
 *   @param {boolean} [useCache=true] - 是否使用缓存，默认true
 *   @returns {Promise<Object>} - 搜索结果
 *
 * @property {Function} updateCompany - 更新企业信息
 *   @param {number} id - 企业ID
 *   @param {Object} companyData - 企业数据
 *   @returns {Promise<Object>} - 更新结果
 *
 * @property {Function} getCompanyById - 根据ID获取单个企业信息
 *   @param {number} id - 企业ID
 *   @param {boolean} [useCache=true] - 是否使用缓存，默认true
 *   @returns {Promise<Object>} - 企业信息
 *
 * @property {Object} loading - 加载状态对象
 *   @property {boolean} loading.queryImport - 查询导入数据加载状态
 *   @property {boolean} loading.createImport - 创建导入任务加载状态
 *   @property {boolean} loading.searchCompanies - 搜索企业加载状态
 *   @property {boolean} loading.updateCompany - 更新企业加载状态
 *   @property {boolean} loading.getCompanyById - 获取单个企业加载状态
 *
 * @property {Object} errors - 错误信息对象
 *   @property {string|null} errors.queryImport - 查询导入数据错误信息
 *   @property {string|null} errors.createImport - 创建导入任务错误信息
 *   @property {string|null} errors.searchCompanies - 搜索企业错误信息
 *   @property {string|null} errors.updateCompany - 更新企业错误信息
 *   @property {string|null} errors.getCompanyById - 获取单个企业错误信息
 *
 * @property {Function} clearCache - 清除指定缓存
 *   @param {string} key - 缓存键
 *   @param {boolean} [persistent=false] - 是否清除持久化缓存
 *
 * @property {Function} clearAllCache - 清除所有缓存
 *   @param {boolean} [persistent=false] - 是否清除持久化缓存
 *
 * @property {Function} getCacheStats - 获取缓存统计信息
 * @returns {Object} - 缓存统计信息
 *
 * @example
 * const { queryImport, searchCompanies, loading, errors } = useApi("http://localhost:8000");
 *
 * // 查询导入数据
 * try {
 *   const data = await queryImport("import_123", 1, 20);
 *   console.log(data);
 * } catch (error) {
 *   console.error("查询失败:", error.message);
 * }
 *
 * // 搜索企业
 * const searchParams = {
 *   keyword: "科技",
 *   match_mode: "fuzzy",
 *   filters: { city: ["北京", "上海"] },
 *   page: 1,
 *   page_size: 20
 * };
 * const results = await searchCompanies(searchParams);
 */
export function useApi(apiBase) {
  const [loading, setLoading] = useState({
    queryImport: false,
    createImport: false,
    searchCompanies: false,
    updateCompany: false,
  });

  const [errors, setErrors] = useState({
    queryImport: null,
    createImport: null,
    searchCompanies: null,
    updateCompany: null,
  });

  const queryImport = useCallback(async (importId, page = 1, pageSize = 20, useCache = true) => {
    // 使用校验模块
    validateRequired(importId, 'import_id');
    const { page: validPage, pageSize: validPageSize } = validatePagination(page, pageSize);

    const cacheKey = cacheManager.generateKey('import', importId, validPage, validPageSize);

    // 检查缓存
    if (useCache) {
      const cached = cacheManager.get(cacheKey, true);
      if (cached) {
        console.log('Cache hit for queryImport:', cacheKey);
        return cached;
      }
    }

    setLoading(prev => ({ ...prev, queryImport: true }));
    setErrors(prev => ({ ...prev, queryImport: null }));

    try {
      const apiUrl = getApiUrl(apiBase, API_PATHS.imports.getCompanies(importId.trim()));
      const fullUrl = `${apiUrl}?page=${validPage}&page_size=${validPageSize}`;

      // 检查是否有重复请求
      const existingRequest = requestDeduplicator.check(
        requestDeduplicator.generateKey('GET', fullUrl, null, { page: validPage, pageSize: validPageSize })
      );
      if (existingRequest) {
        return existingRequest;
      }

      // 使用错误处理和重试机制
      const data = await errorHandler.withRetry(async () => {
        // 添加请求去重
        const promise = request(fullUrl);

        return await requestDeduplicator.add(
          requestDeduplicator.generateKey('GET', fullUrl, null, { page: validPage, pageSize: validPageSize }),
          promise,
          { timeout: 30000 }
        );
      }, {
        onRetry: (error, attempt, delay) => {
          console.warn(`queryImport 重试 ${attempt}，${delay}ms后重试:`, error);
        },
        onError: (error) => {
          console.error('queryImport 错误:', error);
        }
      });

      // 缓存结果，持久化存储
      cacheManager.set(cacheKey, data, true, 10 * 60 * 1000); // 缓存10分钟

      return data;
    } catch (error) {
      const formattedError = errorHandler.formatError(error);
      setErrors(prev => ({ ...prev, queryImport: formattedError }));
      throw new Error(formattedError, { cause: error });
    } finally {
      setLoading(prev => ({ ...prev, queryImport: false }));
    }
  }, [apiBase]);

  const createImport = useCallback(async (file) => {
    // 使用校验模块
    validateFile(file, 'Excel文件', {
      allowedTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      maxSize: 10 * 1024 * 1024 // 10MB
    });

    setLoading(prev => ({ ...prev, createImport: true }));
    setErrors(prev => ({ ...prev, createImport: null }));

    try {
      const apiUrl = getApiUrl(apiBase, API_PATHS.imports.create);
      const formData = new FormData();
      formData.append("file", file);

      // 使用错误处理和重试机制
      return await errorHandler.withRetry(async () => {
        return await request(apiUrl, { method: "POST", body: formData });
      }, {
        maxRetries: 2, // 上传文件重试次数较少
        onRetry: (error, attempt, delay) => {
          console.warn(`createImport 重试 ${attempt}，${delay}ms后重试:`, error);
        },
        onError: (error) => {
          console.error('createImport 错误:', error);
        }
      });
    } catch (error) {
      const formattedError = errorHandler.formatError(error);
      setErrors(prev => ({ ...prev, createImport: formattedError }));
      throw new Error(formattedError, { cause: error });
    } finally {
      setLoading(prev => ({ ...prev, createImport: false }));
    }
  }, [apiBase]);

  const searchCompanies = useCallback(async (searchParams, useCache = true) => {
    // 使用校验模块
    validateSearchParams(searchParams, {
      allowedMatchModes: ['fuzzy', 'exact'],
      maxKeywordLength: 100
    });

    const cacheKey = cacheManager.generateKey('search', searchParams);

    // 检查缓存
    if (useCache) {
      const cached = cacheManager.get(cacheKey, true);
      if (cached) {
        console.log('Cache hit for searchCompanies:', cacheKey);
        return cached;
      }
    }

    setLoading(prev => ({ ...prev, searchCompanies: true }));
    setErrors(prev => ({ ...prev, searchCompanies: null }));

    try {
      const apiUrl = getApiUrl(apiBase, API_PATHS.companies.search);
      const requestKey = requestDeduplicator.generateKey('POST', apiUrl, searchParams);

      // 检查是否有重复请求
      const existingRequest = requestDeduplicator.check(requestKey);
      if (existingRequest) {
        return existingRequest;
      }

      // 使用错误处理和重试机制
      const data = await errorHandler.withRetry(async () => {
        // 添加请求去重
        const promise = request(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchParams)
        });

        return await requestDeduplicator.add(requestKey, promise, { timeout: 30000 });
      }, {
        onRetry: (error, attempt, delay) => {
          console.warn(`searchCompanies 重试 ${attempt}，${delay}ms后重试:`, error);
        },
        onError: (error) => {
          console.error('searchCompanies 错误:', error);
        }
      });

      // 缓存结果，持久化存储，缓存时间较短（搜索条件可能变化）
      cacheManager.set(cacheKey, data, true, 2 * 60 * 1000); // 缓存2分钟

      return data;
    } catch (error) {
      const formattedError = errorHandler.formatError(error);
      setErrors(prev => ({ ...prev, searchCompanies: formattedError }));
      throw new Error(formattedError, { cause: error });
    } finally {
      setLoading(prev => ({ ...prev, searchCompanies: false }));
    }
  }, [apiBase]);

  const updateCompany = useCallback(async (id, companyData) => {
    // 使用校验模块
    validateId(id, '企业ID');
    validateRequired(companyData, '企业数据');

    setLoading(prev => ({ ...prev, updateCompany: true }));
    setErrors(prev => ({ ...prev, updateCompany: null }));

    try {
      const apiUrl = getApiUrl(apiBase, API_PATHS.companies.update(id));
      const requestKey = requestDeduplicator.generateKey('PUT', apiUrl, companyData);

      // 检查是否有重复请求
      const existingRequest = requestDeduplicator.check(requestKey);
      if (existingRequest) {
        return existingRequest;
      }

      // 使用错误处理和重试机制
      const data = await errorHandler.withRetry(async () => {
        // 添加请求去重
        const promise = request(apiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(companyData)
        });

        return await requestDeduplicator.add(requestKey, promise, { timeout: 30000 });
      }, {
        maxRetries: 2, // 更新操作重试次数较少
        onRetry: (error, attempt, delay) => {
          console.warn(`updateCompany 重试 ${attempt}，${delay}ms后重试:`, error);
        },
        onError: (error) => {
          console.error('updateCompany 错误:', error);
        }
      });

      // 清除相关的缓存
      cacheManager.clearAll(true); // 清除所有持久化缓存，确保数据一致性

      return data;
    } catch (error) {
      const formattedError = errorHandler.formatError(error);
      setErrors(prev => ({ ...prev, updateCompany: formattedError }));
      throw new Error(formattedError, { cause: error });
    } finally {
      setLoading(prev => ({ ...prev, updateCompany: false }));
    }
  }, [apiBase]);

  const getCompanyById = useCallback(async (id, useCache = true) => {
    // 使用校验模块
    validateId(id, '企业ID');

    const cacheKey = cacheManager.generateKey('company', id);

    // 检查缓存
    if (useCache) {
      const cached = cacheManager.get(cacheKey, false); // 内存缓存
      if (cached) {
        console.log('Cache hit for getCompanyById:', cacheKey);
        return cached;
      }
    }

    setLoading(prev => ({ ...prev, getCompanyById: true }));
    setErrors(prev => ({ ...prev, getCompanyById: null }));

    try {
      const apiUrl = getApiUrl(apiBase, API_PATHS.companies.getById(id));

      // 检查是否有重复请求
      const existingRequest = requestDeduplicator.check(
        requestDeduplicator.generateKey('GET', apiUrl)
      );
      if (existingRequest) {
        return existingRequest;
      }

      // 使用错误处理和重试机制
      const data = await errorHandler.withRetry(async () => {
        // 添加请求去重
        const promise = request(apiUrl);
        return await requestDeduplicator.add(
          requestDeduplicator.generateKey('GET', apiUrl),
          promise,
          { timeout: 15000 }
        );
      }, {
        maxRetries: 2,
        onRetry: (error, attempt, delay) => {
          console.warn(`getCompanyById 重试 ${attempt}，${delay}ms后重试:`, error);
        },
        onError: (error) => {
          console.error('getCompanyById 错误:', error);
        }
      });

      // 缓存结果，内存缓存
      cacheManager.set(cacheKey, data, false, 5 * 60 * 1000); // 缓存5分钟

      return data;
    } catch (error) {
      const formattedError = errorHandler.formatError(error);
      setErrors(prev => ({ ...prev, getCompanyById: formattedError }));
      throw new Error(formattedError, { cause: error });
    } finally {
      setLoading(prev => ({ ...prev, getCompanyById: false }));
    }
  }, [apiBase]);

  return {
    queryImport,
    createImport,
    searchCompanies,
    updateCompany,
    getCompanyById,
    loading,
    errors,
    clearCache: cacheManager.clear,
    clearAllCache: cacheManager.clearAll,
    getCacheStats: cacheManager.getStats,
  };
}