/**
 * 错误处理和重试机制
 * 提供统一的错误处理、重试逻辑和用户友好的错误消息
 */

export class ErrorHandler {
  constructor() {
    this.retryDelays = [1000, 3000, 5000]; // 重试延迟时间（毫秒）
    this.maxRetries = 3;
    this.networkTimeout = 10000; // 网络超时时间（毫秒）
  }

  /**
   * 带重试的请求包装器
   * @param {Function} requestFn - 请求函数
   * @param {Object} options - 配置选项
   * @param {number} options.maxRetries - 最大重试次数
   * @param {number} options.timeout - 单次请求超时时间
   * @param {Function} options.onRetry - 重试回调函数
   * @param {Function} options.onError - 错误回调函数
   * @returns {Promise} - 请求Promise
   */
  async withRetry(requestFn, options = {}) {
    const {
      maxRetries = this.maxRetries,
      timeout = this.networkTimeout,
      onRetry = null,
      onError = null
    } = options;

    let lastError;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // 使用AbortController实现超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        const result = await this.executeWithTimeout(requestFn, controller.signal);
        clearTimeout(timeoutId);

        return result;

      } catch (error) {
        lastError = error;
        clearTimeout(timeoutId);

        // 调用错误回调
        if (onError) {
          onError(error, attempt);
        }

        // 检查是否需要重试
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const delay = this.retryDelays[attempt] || 5000;
          console.warn(`请求失败，${delay}ms后重试 (尝试 ${attempt + 1}/${maxRetries})`, error);

          // 调用重试回调
          if (onRetry) {
            onRetry(error, attempt, delay);
          }

          await this.sleep(delay);
          attempt++;
          continue;
        }

        // 不需要重试或达到最大重试次数
        break;
      }
    }

    // 所有重试都失败，抛出格式化后的错误
    const formattedError = this.formatError(lastError);
    throw new Error(formattedError, { cause: lastError });
  }

  /**
   * 执行请求并处理超时
   * @param {Function} requestFn - 请求函数
   * @param {AbortSignal} signal - 取消信号
   * @returns {Promise} - 请求结果
   */
  async executeWithTimeout(requestFn, signal) {
    try {
      // 将signal传递给请求函数
      if (requestFn.length > 0) {
        return await requestFn(signal);
      }
      return await requestFn();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时', { cause: { status: 408 } });
      }
      throw error;
    }
  }

  /**
   * 判断是否需要重试
   * @param {Error} error - 错误对象
   * @returns {boolean} - 是否重试
   */
  shouldRetry(error) {
    // 根据错误类型判断是否需要重试
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableMessages = [
      '网络错误',
      '请求超时',
      '服务器错误',
      '服务不可用',
      '网络连接失败',
      '连接超时'
    ];

    const errorMessage = error.message || '';
    const errorStatus = error.cause?.status || error.status || 0;

    // 检查状态码
    if (retryableStatusCodes.includes(errorStatus)) {
      return true;
    }

    // 检查错误消息
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化错误消息，提供用户友好的错误提示
   * @param {Error} error - 错误对象
   * @returns {string} - 用户友好的错误消息
   */
  formatError(error) {
    const errorMessage = error.message || '';
    const errorStatus = error.cause?.status || error.status || 0;

    // 根据状态码格式化错误消息
    switch (errorStatus) {
      case 400:
        return '请求参数错误，请检查输入内容';
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '权限不足，请联系管理员';
      case 404:
        return '请求的资源不存在';
      case 408:
        return '请求超时，请检查网络连接';
      case 429:
        return '请求过于频繁，请稍后再试';
      case 500:
        return '服务器错误，请稍后重试';
      case 502:
        return '服务器暂时不可用，请稍后重试';
      case 503:
        return '服务维护中，请稍后重试';
      case 504:
        return '服务器响应超时，请稍后重试';
      default:
        // 根据错误消息内容判断
        if (errorMessage.includes('网络错误') || errorMessage.includes('网络连接')) {
          return '网络连接失败，请检查网络设置';
        }
        if (errorMessage.includes('超时')) {
          return '请求超时，请稍后重试';
        }
        if (errorMessage.includes('服务器')) {
          return '服务器错误，请稍后重试';
        }
        if (errorMessage.includes('权限')) {
          return '权限不足，请联系管理员';
        }
        if (errorMessage.includes('登录')) {
          return '登录已过期，请重新登录';
        }
        return errorMessage || '操作失败，请稍后重试';
    }
  }

  /**
   * 分类错误类型
   * @param {Error} error - 错误对象
   * @returns {string} - 错误类型
   */
  classifyError(error) {
    const errorStatus = error.cause?.status || error.status || 0;

    if (errorStatus >= 500) {
      return 'server_error';
    }
    if (errorStatus === 401) {
      return 'auth_error';
    }
    if (errorStatus === 403) {
      return 'permission_error';
    }
    if (errorStatus === 404) {
      return 'not_found_error';
    }
    if (errorStatus === 408 || error.message?.includes('超时')) {
      return 'timeout_error';
    }
    if (error.message?.includes('网络')) {
      return 'network_error';
    }
    if (errorStatus >= 400 && errorStatus < 500) {
      return 'client_error';
    }
    return 'unknown_error';
  }

  /**
   * 创建错误处理器实例
   * @param {Object} config - 配置对象
   * @param {Function} config.onError - 全局错误处理函数
   * @param {Function} config.onRetry - 全局重试处理函数
   * @returns {ErrorHandler} - 错误处理器实例
   */
  static create(config = {}) {
    const handler = new ErrorHandler();
    if (config.onError) {
      handler.onError = config.onError;
    }
    if (config.onRetry) {
      handler.onRetry = config.onRetry;
    }
    return handler;
  }
}

// 创建默认实例
export const errorHandler = new ErrorHandler();

// 全局错误监听
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

// 全局未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});