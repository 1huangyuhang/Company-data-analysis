/** 与 ApiContext 一致，供登录后写入、request() 自动带上 Bearer */
export const AUTH_TOKEN_STORAGE_KEY = "api_token";

function getStoredAccessToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/** 是否已有 JWT（与 request() 使用的键一致） */
export function hasStoredAccessToken() {
  return !!getStoredAccessToken();
}

/**
 * 若无 token，派发全局事件由 Topbar 打开登录/注册弹窗。
 * @returns {boolean} true 表示已登录，可继续发请求
 */
export function ensureAccessTokenOrOpenAuth(detail = {}) {
  if (hasStoredAccessToken()) return true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { tab: "login", ...detail } }));
  }
  return false;
}

/** 将后端 401 等文案转成对用户更清楚的说明 */
export function friendlyAuthErrorMessage(raw) {
  if (!raw) return "请求失败";
  const s = String(raw);
  if (s === "Not authenticated" || s.includes("Could not validate credentials") || s.includes("无效的认证凭证")) {
    return "未登录或登录已过期，请先点击顶部「登录」。";
  }
  return s;
}

/**
 * API请求工具函数 - 资源导向设计
 * 若 localStorage 中存在 JWT（api_token），自动附加 Authorization: Bearer
 */
export async function request(url, options = {}) {
  try {
    const { skipAuth, ...fetchOptions } = options;
    const token = skipAuth ? "" : getStoredAccessToken();
    const headers = new Headers(fetchOptions.headers || {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(url, { ...fetchOptions, headers });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const status = res.status;
      const trimmed = text.trim();
      const startsLikeHtml = /^\s*</.test(text);
      const backendHint =
        "请在后端目录执行：python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000（并安装 requirements.txt）。";

      if (!trimmed) {
        throw new Error(
          `服务器返回空内容（HTTP ${status}）。通常表示后端未启动或连接被拒绝。${backendHint}`
        );
      }
      if (startsLikeHtml || (status >= 502 && status <= 504)) {
        throw new Error(
          `网关/代理返回了网页而非 JSON（HTTP ${status}），多为后端 8000 未启动或崩溃。${backendHint} API 留空时使用 Vite 代理转发到 127.0.0.1:8000。`
        );
      }
      const clip = trimmed.slice(0, 100).replace(/\s+/g, " ");
      throw new Error(
        `响应不是合法 JSON（HTTP ${status}）。${backendHint} 片段：${clip}${trimmed.length > 100 ? "…" : ""}`
      );
    }
    if (!res.ok || !data.ok) {
      throw new Error(data?.detail || data?.error?.message || "请求失败");
    }
    return data;
  } catch (error) {
    console.error(`API请求失败: ${url}`, error);
    throw error;
  }
}

export function getApiUrl(base, path) {
  return `${base.replace(/\/$/, "")}${path}`;
}

// 资源导向的API路径设计
export const API_PATHS = {
  // 导入资源
  imports: {
    create: "/api/v1/import/excel", // POST 创建导入任务
    getCompanies: (importId) => `/api/v1/companies/by-import/${encodeURIComponent(importId)}`, // GET 获取导入的企业
  },
  // 企业资源
  companies: {
    search: "/api/v1/companies/search", // POST 搜索企业
    update: (id) => `/api/v1/companies/${id}`, // PUT 更新企业
    getById: (id) => `/api/v1/companies/${id}`, // GET 获取单个企业
    delete: (id) => `/api/v1/companies/${id}`, // DELETE 删除企业
  },
  // 统计数据资源
  stats: {
    overview: "/api/v1/stats/overview", // GET 获取统计概览
    industry: "/api/v1/stats/industry", // GET 按行业统计
    city: "/api/v1/stats/city", // GET 按城市统计
    import: "/api/v1/stats/import", // GET 导入统计
  },
};

/**
 * API响应类型定义 - 用于TypeScript项目
 * 如果需要，可以创建单独的types.js文件
 */
/*
export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}

export interface ImportResponse {
  import_id: string;
  total: number;
  items: Company[];
}

export interface Company {
  id: number;
  name: string;
  city?: string;
  industry?: string;
  address?: string;
  tags?: string[];
  raw_data?: Record<string, any>;
  import_id?: string;
  source_row?: number;
}

export interface SearchParams {
  keyword: string;
  match_mode: "fuzzy" | "exact";
  filters: {
    city?: string[];
    industry?: string[];
    import_id?: string | null;
  };
  page: number;
  page_size: number;
}
*/