import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { request, getApiUrl, API_PATHS } from '../utils/api';
import { cacheManager } from '../utils/cache';
import { requestDeduplicator } from '../utils/requestDeduplicator';
import { errorHandler } from '../utils/errorHandler';

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
 * API上下文
 */
const ApiContext = createContext(null);

/**
 * API提供者组件
 * 统一管理环境配置、会话管理、Token管理、请求拦截等
 */
export function ApiProvider({ children, initialEnvironment = 'development' }) {
  // 环境状态
  const [environment, setEnvironment] = useState(() => {
    const saved = localStorage.getItem('api_environment');
    return saved || initialEnvironment;
  });

  // Token状态
  const [token, setToken] = useState(() => localStorage.getItem(ApiConfig.tokenConfig.storageKey));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(ApiConfig.tokenConfig.refreshKey));
  const [tokenExpiresAt, setTokenExpiresAt] = useState(() => localStorage.getItem(ApiConfig.tokenConfig.expiresKey));

  // 会话状态
  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem(ApiConfig.sessionConfig.sessionIdKey);
    return saved || generateSessionId();
  });

  // 设备标识
  const [deviceId] = useState(() => {
    const saved = localStorage.getItem(ApiConfig.sessionConfig.deviceIdKey);
    return saved || generateDeviceId();
  });

  // 加载状态
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshQueue, setRefreshQueue] = useState([]);

  // 持久化配置
  useEffect(() => {
    localStorage.setItem('api_environment', environment);
  }, [environment]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(ApiConfig.tokenConfig.storageKey, token);
    } else {
      localStorage.removeItem(ApiConfig.tokenConfig.storageKey);
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem(ApiConfig.tokenConfig.refreshKey, refreshToken);
    } else {
      localStorage.removeItem(ApiConfig.tokenConfig.refreshKey);
    }
  }, [refreshToken]);

  useEffect(() => {
    if (tokenExpiresAt) {
      localStorage.setItem(ApiConfig.tokenConfig.expiresKey, tokenExpiresAt);
    } else {
      localStorage.removeItem(ApiConfig.tokenConfig.expiresKey);
    }
  }, [tokenExpiresAt]);

  useEffect(() => {
    localStorage.setItem(ApiConfig.sessionConfig.sessionIdKey, sessionId);
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem(ApiConfig.sessionConfig.deviceIdKey, deviceId);
  }, [deviceId]);

  // 获取当前环境配置
  const currentEnvConfig = useMemo(() => {
    return ApiConfig.environments[environment] || ApiConfig.environments.development;
  }, [environment]);

  // 检查Token是否过期
  const isTokenExpired = useMemo(() => {
    if (!tokenExpiresAt) return true;
    const expiresAt = new Date(tokenExpiresAt).getTime();
    const now = Date.now();
    const threshold = ApiConfig.tokenConfig.refreshThreshold;
    return now >= (expiresAt - threshold);
  }, [tokenExpiresAt]);

  // 刷新Token
  const refreshAccessToken = useCallback(async () => {
    if (isRefreshing) {
      // 如果正在刷新，加入队列等待
      return new Promise((resolve, reject) => {
        setRefreshQueue(prev => [...prev, { resolve, reject }]);
      });
    }

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    setIsRefreshing(true);

    try {
      const apiUrl = getApiUrl(currentEnvConfig.apiBase, API_PATHS.auth.refresh);
      const response = await request(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Device-ID': deviceId,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

      // 更新Token
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
      setToken(access_token);
      setTokenExpiresAt(expiresAt);

      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }

      // 处理队列中的请求
      setRefreshQueue(prev => {
        prev.forEach(({ resolve }) => resolve(access_token));
        return [];
      });

      return access_token;
    } catch (error) {
      // 处理队列中的请求
      setRefreshQueue(prev => {
        prev.forEach(({ reject }) => reject(error));
        return [];
      });

      // 清除无效的Token
      setToken(null);
      setRefreshToken(null);
      setTokenExpiresAt(null);

      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshToken, currentEnvConfig.apiBase, sessionId, deviceId]);

  // 获取认证Header
  const getAuthHeaders = useCallback(async () => {
    let currentToken = token;

    // 自动刷新Token
    if (ApiConfig.tokenConfig.autoRefresh && isTokenExpired && refreshToken) {
      try {
        currentToken = await refreshAccessToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }

    const headers = {
      'X-Session-ID': sessionId,
      'X-Device-ID': deviceId,
    };

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    // 添加用户代理信息
    if (ApiConfig.sessionConfig.userAgent && typeof navigator !== 'undefined') {
      headers['X-User-Agent'] = navigator.userAgent;
    }

    // 添加语言信息
    if (ApiConfig.sessionConfig.language && typeof navigator !== 'undefined') {
      headers['X-Language'] = navigator.language || 'zh-CN';
    }

    return headers;
  }, [token, isTokenExpired, refreshToken, refreshAccessToken, sessionId, deviceId]);

  // 请求拦截器
  const requestInterceptor = useCallback(async (url, options = {}) => {
    // 获取认证Header
    const authHeaders = await getAuthHeaders();

    // 合并Header
    const mergedHeaders = {
      ...options.headers,
      ...authHeaders,
    };

    // 环境特定的超时设置
    const timeout = options.timeout || currentEnvConfig.timeout;

    // 创建带超时的请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 统一错误处理
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorHandler.createApiError(response.status, errorData.message || response.statusText, errorData);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw errorHandler.formatError(error);
    }
  }, [getAuthHeaders, currentEnvConfig.timeout]);

  // 切换环境
  const switchEnvironment = useCallback((newEnvironment) => {
    if (ApiConfig.environments[newEnvironment]) {
      setEnvironment(newEnvironment);
      // 清除缓存
      cacheManager.clearAll(true);
      return true;
    }
    return false;
  }, []);

  // 设置Token
  const setAuthToken = useCallback((accessToken, refreshTokenData = null, expiresIn = null) => {
    setToken(accessToken);
    if (refreshTokenData) {
      setRefreshToken(refreshTokenData);
    }
    if (expiresIn) {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      setTokenExpiresAt(expiresAt);
    }
  }, []);

  // 清除认证
  const clearAuth = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setTokenExpiresAt(null);
  }, []);

  // 重新生成会话ID
  const regenerateSessionId = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    return newSessionId;
  }, []);

  // 上下文值
  const contextValue = useMemo(() => ({
    // 环境相关
    environment,
    switchEnvironment,
    currentEnvConfig,

    // Token相关
    token,
    refreshToken,
    tokenExpiresAt,
    isTokenExpired,
    setAuthToken,
    clearAuth,
    refreshAccessToken,

    // 会话相关
    sessionId,
    deviceId,
    regenerateSessionId,

    // 请求相关
    request: requestInterceptor,

    // 工具函数
    getAuthHeaders,
    cacheManager,
    requestDeduplicator,
    errorHandler,

    // 配置
    config: ApiConfig,
  }), [
    environment,
    switchEnvironment,
    currentEnvConfig,
    token,
    refreshToken,
    tokenExpiresAt,
    isTokenExpired,
    setAuthToken,
    clearAuth,
    refreshAccessToken,
    sessionId,
    deviceId,
    regenerateSessionId,
    requestInterceptor,
    getAuthHeaders,
  ]);

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
}

/**
 * 使用API上下文
 */
export function useApiContext() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within ApiProvider');
  }
  return context;
}

/**
 * 生成会话ID
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成设备ID
 */
function generateDeviceId() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const platform = typeof window !== 'undefined' ? window : {};
  const deviceInfo = [
    nav.userAgent,
    nav.platform,
    nav.language,
    screen?.width,
    screen?.height,
    platform.innerWidth,
    platform.innerHeight,
  ].filter(Boolean).join('|');

  return `device_${btoa(deviceInfo).substring(0, 32)}`;
}

/**
 * API消费者Hook（扩展原有的useApi）
 */
export function useApi() {
  const context = useApiContext();

  // 扩展原有的API调用方法，添加环境感知和认证支持
  const enhancedApi = useMemo(() => {
    // 这里可以扩展更多的API方法
    return {
      // 环境切换
      switchEnvironment: context.switchEnvironment,

      // 认证管理
      setAuthToken: context.setAuthToken,
      clearAuth: context.clearAuth,
      refreshToken: context.refreshAccessToken,

      // 会话管理
      regenerateSessionId: context.regenerateSessionId,

      // 原始API方法（通过context.request实现）
      request: context.request,
    };
  }, [context]);

  return enhancedApi;
}