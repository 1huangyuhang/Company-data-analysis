/**
 * 增强版API工具函数 - 在现有API基础上扩展环境、会话、Token管理功能
 */

import { cacheManager } from './cache';
import { requestDeduplicator } from './requestDeduplicator';
import { errorHandler } from './errorHandler';

// 导入基础API函数
import { request as baseRequest, getApiUrl, API_PATHS } from './api';

/**
 * API上下文配置
 */
export const ApiConfig = {
  // 环境配置
  environments: {
    development: {
      apiBase: 'http://127.0.0.1:8000',
      timeout: 30000,
      retryAttempts: 3,
      cacheEnabled: true,
    },
    production: {
      apiBase: 'https://api.yourdomain.com',
      timeout: 30000,
      retryAttempts: 2,
      cacheEnabled: true,
    },
    staging: {
      apiBase: 'https://staging-api.yourdomain.com',
      timeout: 30000,
      retryAttempts: 2,
      cacheEnabled: true,
    },
    test: {
      apiBase: 'http://test-api.yourdomain.com',
      timeout: 15000,
      retryAttempts: 1,
      cacheEnabled: false,
    },
  },

  // Token配置
  tokenConfig: {
    storageKey: 'api_token',
    refreshKey: 'refresh_token',
    expiresKey: 'token_expires_at',
    autoRefresh: true,
    refreshThreshold: 5 * 60 * 1000, // 5分钟
  },

  // 会话配置
  sessionConfig: {
    sessionIdKey: 'session_id',
    deviceIdKey: 'device_id',
    userAgent: true,
    language: true,
  },
};

/**
 * 增强版请求函数 - 添加缓存、重试、Token管理等功能
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {Object} context - API上下文
 * @returns {Promise<Object>} - 响应数据
 */
export async function enhancedRequest(url, options = {}, context = {}) {
  const {
    useCache = false,
    cacheKey = null,
    cacheTTL = 60000,
    timeout = 30000,
    retryAttempts = 3,
    requireAuth = false,
  } = options;

  // 缓存检查
  if (useCache && cacheKey) {
    const cached = cacheManager.get(cacheKey, true);
    if (cached) {
      console.log('Cache hit:', cacheKey);
      return cached;
    }
  }

  // 认证Header处理
  let authHeaders = {};
  if (requireAuth && context.getAuthHeaders) {
    try {
      authHeaders = await context.getAuthHeaders();
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      throw new Error('Authentication required');
    }
  }

  // 合并Header
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...authHeaders,
  };

  // 会话Header
  if (context.sessionId) {
    headers['X-Session-ID'] = context.sessionId;
  }
  if (context.deviceId) {
    headers['X-Device-ID'] = context.deviceId;
  }

  // 环境特定配置
  const envConfig = context.currentEnvConfig || ApiConfig.environments.development;
  const finalTimeout = options.timeout || envConfig.timeout;

  // 请求选项
  const requestOptions = {
    ...options,
    headers,
    timeout: finalTimeout,
  };

  // 重试机制
  let lastError;
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const response = await baseRequest(url, requestOptions);

      // 缓存结果
      if (useCache && cacheKey) {
        cacheManager.set(cacheKey, response, true, cacheTTL);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Token过期特殊处理
      if (error.status === 401 && requireAuth && context.refreshAccessToken) {
        try {
          // 尝试刷新Token
          await context.refreshAccessToken();
          // Token刷新成功后重试一次
          if (attempt === 1) {
            continue;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Session expired');
        }
      }

      // 最后一次尝试不重试
      if (attempt === retryAttempts) {
        break;
      }

      // 检查是否需要重试
      if (!shouldRetryRequest(error)) {
        break;
      }

      // 指数退避等待
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(`Request failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 判断是否需要重试请求
 * @param {Error} error - 错误对象
 * @returns {boolean} - 是否需要重试
 */
function shouldRetryRequest(error) {
  // 网络错误或超时
  if (error.message === 'Request timeout' || error.message.includes('Network')) {
    return true;
  }

  // 服务器错误（5xx）
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }

  // 速率限制（429）
  if (error.status === 429) {
    return true;
  }

  return false;
}

/**
 * 增强版API客户端
 * @param {Object} context - API上下文
 * @returns {Object} - 增强版API客户端
 */
export function createEnhancedApiClient(context = {}) {
  const client = {
    // 环境相关
    getEnvironment: () => context.environment || 'development',
    getEnvConfig: () => context.currentEnvConfig || ApiConfig.environments.development,

    // 基础请求方法
    request: (url, options) => enhancedRequest(url, options, context),

    // RESTful方法
    get: (path, params, options = {}) => {
      const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, path, params);
      return enhancedRequest(url, { ...options, method: 'GET' }, context);
    },

    post: (path, data, options = {}) => {
      const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, path);
      return enhancedRequest(url, { ...options, method: 'POST', body: data }, context);
    },

    put: (path, data, options = {}) => {
      const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, path);
      return enhancedRequest(url, { ...options, method: 'PUT', body: data }, context);
    },

    delete: (path, options = {}) => {
      const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, path);
      return enhancedRequest(url, { ...options, method: 'DELETE' }, context);
    },

    patch: (path, data, options = {}) => {
      const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, path);
      return enhancedRequest(url, { ...options, method: 'PATCH', body: data }, context);
    },

    // 资源特定方法
    imports: {
      create: (file, options) => {
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.imports.create);
        const formData = new FormData();
        formData.append('file', file);
        return enhancedRequest(url, { ...options, method: 'POST', body: formData }, context);
      },

      getCompanies: (importId, page = 1, pageSize = 20, useCache = true) => {
        const cacheKey = `import_${importId}_${page}_${pageSize}`;
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.imports.getCompanies(importId));
        return enhancedRequest(url, {
          method: 'GET',
          useCache,
          cacheKey,
          cacheTTL: 10 * 60 * 1000, // 10分钟
          params: { page, page_size: pageSize },
        }, context);
      },
    },

    companies: {
      search: (searchParams, useCache = true) => {
        const cacheKey = `search_${JSON.stringify(searchParams)}`;
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.companies.search);
        return enhancedRequest(url, {
          method: 'POST',
          body: searchParams,
          useCache,
          cacheKey,
          cacheTTL: 2 * 60 * 1000, // 2分钟
        }, context);
      },

      update: (id, companyData) => {
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.companies.update(id));
        return enhancedRequest(url, {
          method: 'PUT',
          body: companyData,
          requireAuth: true,
        }, context);
      },

      getById: (id, useCache = true) => {
        const cacheKey = `company_${id}`;
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.companies.getById(id));
        return enhancedRequest(url, {
          method: 'GET',
          useCache,
          cacheKey,
          cacheTTL: 5 * 60 * 1000, // 5分钟
        }, context);
      },
    },

    auth: {
      login: (credentials) => {
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.auth.login);
        return enhancedRequest(url, {
          method: 'POST',
          body: credentials,
        }, context);
      },

      refreshToken: (refreshToken) => {
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.auth.refresh);
        return enhancedRequest(url, {
          method: 'POST',
          body: { refresh_token: refreshToken },
        }, context);
      },

      logout: () => {
        const url = getApiUrl(context.apiBase || ApiConfig.environments.development.apiBase, API_PATHS.auth.logout);
        return enhancedRequest(url, {
          method: 'POST',
          requireAuth: true,
        }, context);
      },
    },

    // 环境切换
    switchEnvironment: (environment) => {
      if (ApiConfig.environments[environment]) {
        context.environment = environment;
        context.currentEnvConfig = ApiConfig.environments[environment];
        context.apiBase = context.currentEnvConfig.apiBase;
        // 清除缓存
        cacheManager.clearAll(true);
        return true;
      }
      return false;
    },

    // 认证管理
    setAuthToken: (accessToken, refreshTokenData = null, expiresIn = null) => {
      if (context.setAuthToken) {
        context.setAuthToken(accessToken, refreshTokenData, expiresIn);
      }
    },

    clearAuth: () => {
      if (context.clearAuth) {
        context.clearAuth();
      }
    },

    // 工具方法
    clearCache: (key, persistent = false) => {
      cacheManager.clear(key, persistent);
    },

    clearAllCache: (persistent = false) => {
      cacheManager.clearAll(persistent);
    },

    getCacheStats: () => {
      return cacheManager.getStats();
    },

    // 会话管理
    regenerateSessionId: () => {
      if (context.regenerateSessionId) {
        return context.regenerateSessionId();
      }
      return null;
    },
  };

  return client;
}

/**
 * 生成增强版API Hook
 * @param {Object} context - API上下文
 * @returns {Object} - API Hook
 */
export function createApiHook(context = {}) {
  const apiClient = createEnhancedApiClient(context);

  return {
    // 基础API客户端
    api: apiClient,

    // 环境相关
    environment: context.environment || 'development',
    switchEnvironment: apiClient.switchEnvironment,

    // 认证相关
    token: context.token,
    isAuthenticated: !!context.token,
    login: apiClient.auth.login,
    logout: apiClient.auth.logout,

    // 会话相关
    sessionId: context.sessionId,

    // 加载状态
    loading: context.loading || {},

    // 错误信息
    errors: context.errors || {},

    // 工具方法
    clearCache: apiClient.clearCache,
    clearAllCache: apiClient.clearAllCache,
    getCacheStats: apiClient.getCacheStats,
  };
}