/**
 * 数据缓存管理器
 * 支持内存缓存和localStorage持久化缓存
 * 提供TTL（Time To Live）支持
 */

export class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      clears: 0
    };
  }

  /**
   * 从localStorage获取持久化缓存数据
   * @param {string} key - 缓存键
   * @returns {Object|null} - 缓存数据或null
   */
  _getPersistentItem(key) {
    try {
      const data = localStorage.getItem(`cache_${key}`);
      if (!data) return null;

      const parsed = JSON.parse(data);
      const now = Date.now();

      // 检查是否过期
      if (now - parsed.timestamp > parsed.ttl) {
        this._clearPersistentItem(key);
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  /**
   * 设置localStorage持久化缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 存活时间（毫秒）
   */
  _setPersistentItem(key, value, ttl) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache write error:', error);
      // 如果localStorage满了，尝试清理旧缓存
      if (error.name === 'QuotaExceededError') {
        this._cleanupOldCache();
      }
    }
  }

  /**
   * 清除localStorage中的缓存项
   * @param {string} key - 缓存键
   */
  _clearPersistentItem(key) {
    localStorage.removeItem(`cache_${key}`);
  }

  /**
   * 清理旧的缓存（当localStorage空间不足时）
   */
  _cleanupOldCache() {
    try {
      const cacheKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .sort((a, b) => {
          const dataA = JSON.parse(localStorage.getItem(a));
          const dataB = JSON.parse(localStorage.getItem(b));
          return dataA.timestamp - dataB.timestamp;
        });

      // 清理最旧的20%缓存
      const removeCount = Math.floor(cacheKeys.length * 0.2);
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(cacheKeys[i]);
      }

      console.log(`Cleaned up ${removeCount} old cache items`);
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @param {boolean} persistent - 是否使用持久化缓存
   * @returns {*} - 缓存的数据或null
   */
  get(key, persistent = false) {
    const result = persistent
      ? this._getPersistentItem(key)
      : this.memoryCache.get(key);

    if (result) {
      this.cacheStats.hits++;
      return result.value;
    }

    this.cacheStats.misses++;
    return null;
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {boolean} persistent - 是否持久化
   * @param {number} ttl - 存活时间（毫秒），默认5分钟
   */
  set(key, value, persistent = false, ttl = 5 * 60 * 1000) {
    if (persistent) {
      this._setPersistentItem(key, value, ttl);
    } else {
      this.memoryCache.set(key, {
        value,
        timestamp: Date.now(),
        ttl
      });
    }

    this.cacheStats.sets++;
  }

  /**
   * 清除缓存
   * @param {string} key - 缓存键
   * @param {boolean} persistent - 是否清除持久化缓存
   */
  clear(key, persistent = false) {
    if (persistent) {
      this._clearPersistentItem(key);
    } else {
      this.memoryCache.delete(key);
    }

    this.cacheStats.clears++;
  }

  /**
   * 清除所有缓存
   * @param {boolean} persistent - 是否清除持久化缓存
   */
  clearAll(persistent = false) {
    if (persistent) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .forEach(key => localStorage.removeItem(key));
    } else {
      this.memoryCache.clear();
    }

    this.cacheStats.clears++;
  }

  /**
   * 清理过期的内存缓存
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} - 缓存统计
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      ...this.cacheStats,
      hitRate: total > 0 ? (this.cacheStats.hits / total).toFixed(2) : 0,
      memorySize: this.memoryCache.size
    };
  }

  /**
   * 生成缓存键
   * @param {string} prefix - 前缀
   * @param {...*} args - 参数
   * @returns {string} - 缓存键
   */
  static generateKey(prefix, ...args) {
    const keyParts = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    );
    return `${prefix}:${keyParts.join(':')}`;
  }
}

// 创建单例
export const cacheManager = new CacheManager();

// 定期清理过期缓存
setInterval(() => {
  cacheManager.cleanupExpired();
}, 60 * 1000); // 每分钟清理一次

// 监听页面可见性变化，当页面重新可见时清理缓存
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    cacheManager.cleanupExpired();
  }
});