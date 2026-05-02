import { useEffect, useMemo, useRef, useState } from "react";
import SearchPanel from "../components/search/SearchPanel";
import MessageBar from "../components/layout/MessageBar";
import { request } from "../utils/api";
import { formatDisplayCode } from "../utils/formatters";

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

const DEFAULT_FILTERS = {
  city: "",
  industry: "",
  import_id: "",
  created_start: "",
  created_end: "",
  tags: "",
  tag_match: "any",
  import_start_date: "",
  import_end_date: "",
};

const TAG_MATCH_OPTIONS = [
  { value: "any", label: "包含任意" },
  { value: "all", label: "包含全部" },
  { value: "none", label: "不包含" },
];

const SORT_OPTIONS = [
  { value: "created_at_desc", label: "创建时间 ↓" },
  { value: "created_at_asc", label: "创建时间 ↑" },
  { value: "updated_at_desc", label: "更新时间 ↓" },
  { value: "updated_at_asc", label: "更新时间 ↑" },
  { value: "name_asc", label: "企业名称 A-Z" },
  { value: "name_desc", label: "企业名称 Z-A" },
];

export default function SearchContainer() {
  const [msg, setMsg] = useState({ text: "企业检索已就绪。", error: false });
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const importCache = useRef(new Map());

  const searchTotalPage = useMemo(() => Math.max(1, Math.ceil(search.total / search.page_size)), [search.total, search.page_size]);

  // 获取导入历史记录
  const fetchImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const apiBase = localStorage.getItem("apiBase") || "http://127.0.0.1:8000";
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/import/history?limit=20&offset=0`);
      const data = await response.json();
      if (data.ok) {
        setImportHistory(data.data.items || []);
      }
    } catch (error) {
      console.error("获取导入历史失败:", error);
      setMsg({ text: "获取导入历史失败", error: true });
    } finally {
      setLoadingHistory(false);
    }
  };

  // 点击历史记录加载数据
  const handleHistorySelect = async (importId, fileName) => {
    setLoading(true);
    setMsg({ text: `正在加载历史记录：${fileName}...`, error: false });

    try {
      // 检查缓存
      if (importCache.current.has(importId)) {
        const cached = importCache.current.get(importId);
        // 检查缓存是否过期（30分钟）
        if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
          setSearch(prev => ({
            ...prev,
            import_id: importId,
            page: 1,
            items: cached.data,
            total: cached.total
          }));
          setFilters(prev => ({ ...prev, import_id }));
          setMsg({ text: `已从缓存加载历史记录：${fileName}`, error: false });
          setLoading(false);
          return;
        }
      }

      // 缓存未命中或已过期，查询数据库
      setSearch(prev => ({ ...prev, import_id: importId, page: 1 }));
      setFilters(prev => ({ ...prev, import_id }));

      // 查询导入数据
      const apiBase = localStorage.getItem("apiBase") || "http://127.0.0.1:8000";
      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/by-import/${encodeURIComponent(importId)}?page=1&page_size=20`);

      setSearch(prev => ({
        ...prev,
        items: data.data.items || [],
        total: data.data.total,
        page: 1
      }));

      // 更新缓存
      importCache.current.set(importId, {
        data: data.data.items || [],
        total: data.data.total,
        timestamp: Date.now()
      });

      setMsg({ text: `已成功加载历史记录：${fileName}`, error: false });
    } catch (error) {
      setMsg({ text: `加载历史记录失败：${error.message}`, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "正在检索企业数据...", error: false });

    try {
      const apiBase = localStorage.getItem("apiBase") || "http://127.0.0.1:8000";
      const searchParams = {
        keyword: search.keyword.trim(),
        match_mode: search.match_mode,
        filters: {
          city: filters.city ? filters.city.split(',').map(s => s.trim()).filter(Boolean) : [],
          industry: filters.industry ? filters.industry.split(',').map(s => s.trim()).filter(Boolean) : [],
          import_id: filters.import_id.trim() || null,
          created_start: filters.created_start || null,
          created_end: filters.created_end || null,
          tags: filters.tags ? filters.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
          tag_match: filters.tag_match || 'any',
          import_start_date: filters.import_start_date || null,
          import_end_date: filters.import_end_date || null
        },
        page: 1,
        page_size: search.page_size,
        sort_by: search.sort_by || 'created_at',
        sort_order: search.sort_order || 'desc'
      };

      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams)
      });

      setSearch(prev => ({
        ...prev,
        page: 1,
        total: data.data.total,
        items: data.data.items || [],
        total_pages: data.data.total_pages || Math.ceil(data.data.total / search.page_size)
      }));
      setMsg({ text: `检索完成：命中 ${data.data.total} 条。`, error: false });
    } catch (error) {
      setMsg({ text: `检索失败：${error.message}`, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearch(DEFAULT_SEARCH);
    setFilters(DEFAULT_FILTERS);
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const doSearch = async (page) => {
    setLoading(true);
    try {
      const apiBase = localStorage.getItem("apiBase") || "http://127.0.0.1:8000";
      const searchParams = {
        keyword: search.keyword.trim(),
        match_mode: search.match_mode,
        filters: {
          city: filters.city ? filters.city.split(',').map(s => s.trim()).filter(Boolean) : [],
          industry: filters.industry ? filters.industry.split(',').map(s => s.trim()).filter(Boolean) : [],
          import_id: filters.import_id.trim() || null,
        },
        page,
        page_size: search.page_size,
      };

      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams)
      });

      setSearch(prev => ({
        ...prev,
        page,
        total: data.data.total,
        items: data.data.items || [],
      }));
    } catch (error) {
      setMsg({ text: `检索失败：${error.message}`, error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchImportHistory();
    }
  }, [showHistory]);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
        <div className="loading-message">正在加载数据...</div>
      </div>
    );
  }

  return (
    <>
      <MessageBar msg={msg} />
      <SearchPanel
        search={search}
        setSearch={setSearch}
        doSearch={doSearch}
        searchTotalPage={searchTotalPage}
        setRawPreview={(data) => setMsg({ text: "已预览企业数据", error: false })}
        formatDisplayCode={formatDisplayCode}
        filters={filters}
        setFilters={setFilters}
        onHistorySelect={handleHistorySelect}
        loadingHistoryData={loadingHistory}
        importHistory={importHistory}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onSubmit={handleSubmit}
        onReset={handleReset}
        updateFilter={updateFilter}
        TAG_MATCH_OPTIONS={TAG_MATCH_OPTIONS}
        SORT_OPTIONS={SORT_OPTIONS}
      />
    </>
  );
}