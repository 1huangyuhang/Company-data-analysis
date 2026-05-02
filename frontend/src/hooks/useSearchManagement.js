import { useState, useMemo } from "react";

const DEFAULT_SEARCH = {
  keyword: "",
  match_mode: "fuzzy",
  city: "",
  industry: "",
  import_id: "",
  page: 1,
  page_size: 20,
  total: 0,
  items: [],
};

/**
 * 搜索管理自定义Hook
 * 管理搜索相关的状态和逻辑
 */
export function useSearchManagement() {
  // 搜索状态
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [rawPreview, setRawPreview] = useState("请先点击“查看”");

  // 计算属性
  const searchTotalPage = useMemo(() => Math.max(1, Math.ceil(search.total / search.page_size)), [search.total, search.page_size]);

  // 重置搜索
  const resetSearch = () => {
    setSearch(DEFAULT_SEARCH);
  };

  // 设置搜索参数
  const setSearchParams = (params) => {
    setSearch(prev => ({ ...prev, ...params }));
  };

  // 清空预览
  const clearPreview = () => {
    setRawPreview("请先点击“查看”");
  };

  return {
    // 状态
    search,
    setSearch,
    rawPreview,
    setRawPreview,

    // 计算属性
    searchTotalPage,

    // 方法
    resetSearch,
    setSearchParams,
    clearPreview,
  };
}