/**
 * 请求去重管理器
 * 防止短时间内重复的API请求，提升性能和用户体验
 */

export class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
    this.requestHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * 生成请求的唯一标识
   * @param {string} method - HTTP方法 (GET, POST, PUT, DELETE)
   * @param {string} url - 完整的请求URL
   * @param {Object} data - 请求数据（body）
   * @param {Object} params - URL参数
   * @returns {string} - 请求标识
   */
  generateKey(method, url, data = null, params = null) {
    // 标准化URL，移除协议和主机名，只保留路径和查询参数
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;

    // 标准化数据，确保对象属性顺序一致
    const normalizeData = (obj) => {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'object') {
        return JSON.stringify(obj, Object.keys(obj).sort());
      }
      return String(obj);
    };

    const dataStr = normalizeData(data);
    const paramsStr = normalizeData(params);

    return `${method.toUpperCase()}:${path}:${dataStr}:${paramsStr}`;
  }

  /**
   * 检查是否有相同请求在进行中
   * @param {string} key - 请求标识
   * @returns {Promise|boolean} - 如果存在返回Promise，否则返回false
   */
  check(key) {
    if (this.pendingRequests.has(key)) {
      console.log('Request deduplicated:', key);
      return this.pendingRequests.get(key);
    }
    return false;
  }

  /**
   * 添加新请求到去重管理器
   * @param {string} key - 请求标识
   * @param {Promise} promise - 请求Promise
   * @param {Object} options - 配置选项
   * @param {number} options.timeout - 超时时间（毫秒）
   */
  add(key, promise, options = {}) {
    const {
      timeout = 30000 // 默认30秒超时
    } = options;

    // 添加到进行中的请求
    this.pendingRequests.set(key, promise);

    // 添加超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });

    // 创建带超时的Promise
    const racedPromise = Promise.race([promise, timeoutPromise]);

    // 请求完成后清理
    racedPromise.finally(() => {
      this.pendingRequests.delete(key);
      this._addToHistory(key);
    });

    return racedPromise;
  }

  /**
   * 添加到请求历史记录
   * @param {string} key - 请求标识
   */
  _addToHistory(key) {
    this.requestHistory.push({
      key,
      timestamp: Date.now()
    });

    // 限制历史记录大小
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }
  }

  /**
   * 检查是否频繁请求相同资源
   * @param {string} key - 请求标识
   * @param {number} threshold - 时间阈值（毫秒），默认5秒
   * @returns {boolean} - 如果频繁请求返回true
   */
  isFrequentRequest(key, threshold = 5000) {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      req => req.timestamp > now - threshold && req.key === key
    );

    return recentRequests.length > 1;
  }

  /**
   * 获取请求统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      requestHistory: this.requestHistory.length,
      duplicateRequests: this.requestHistory.filter(req => {
        // 统计重复请求的数量
        const duplicates = this.requestHistory.filter(r => r.key === req.key);
        return duplicates.length > 1;
      }).length
    };
  }

  /**
   * 清空所有进行中的请求
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * 获取进行中的请求数量
   * @returns {number} - 进行中的请求数量
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

// 创建单例
export const requestDeduplicator = new RequestDeduplicator();

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面不可见时，清空进行中的请求
    requestDeduplicator.clear();
  }
});

// 监听网络状态变化
window.addEventListener('online', () => {
  console.log('Network back online, pending requests:', requestDeduplicator.getPendingCount());
});

window.addEventListener('offline', () => {
  console.log('Network offline, clearing pending requests');
  requestDeduplicator.clear();
});