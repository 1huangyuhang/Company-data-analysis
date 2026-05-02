import { useEffect, useMemo, useState, useRef } from "react";
import ImportPanel from "./components/import/ImportPanel";
import MessageBar from "./components/layout/MessageBar";
import OverviewPanel from "./components/overview/OverviewPanel";
import SearchPanel from "./components/search/SearchPanel";
import SidebarTabs from "./components/layout/SidebarTabs";
import Topbar from "./components/layout/Topbar";
import LoadingSpinner from "./components/common/LoadingSpinner";
import EmptyState from "./components/common/EmptyState";
import { useApiContext } from "./contexts/ApiContext";
import { formatDisplayCode, parseCsvInput, safeJson } from "./utils/formatters";

const EMPTY_EDIT = { id: "", name: "", city: "", industry: "", address: "", tags: "", raw_data: "{}" };
const DEFAULT_SEARCH = { keyword: "", match_mode: "fuzzy", city: "", industry: "", import_id: "", page: 1, page_size: 20, total: 0, items: [] };

export default function AppContainer() {
  const [tab, setTab] = useState("import");
  const [msg, setMsg] = useState({ text: "前端已就绪，请先导入 Excel 或直接检索。", error: false });
  const [importId, setImportId] = useState(() => localStorage.getItem("importId") || "");
  const [importPageSize, setImportPageSize] = useState(() => Number(localStorage.getItem("importPageSize") || "20"));
  const [importPage, setImportPage] = useState(1);
  const [importTotal, setImportTotal] = useState(0);
  const [importItems, setImportItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [uploadFile, setUploadFile] = useState(null);
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const [rawPreview, setRawPreview] = useState("请先点击“查看”");
  const [loadingHistoryData, setLoadingHistoryData] = useState(false);

  // 使用API上下文
  const apiContext = useApiContext();
  const apiBase = apiContext.currentEnvConfig?.apiBase || "http://127.0.0.1:8000";

  // 数据缓存管理
  const importCache = useRef(new Map());

  // 使用增强版API客户端
  const api = useMemo(() => {
    return {
      queryImport: async (importId, page, pageSize) => {
        try {
          const data = await apiContext.request(
            `${apiBase}/api/v1/imports/${importId}/companies`,
            {
              method: "GET",
              params: { page, page_size: pageSize },
              useCache: true,
              cacheKey: `import_${importId}_${page}_${pageSize}`,
              cacheTTL: 10 * 60 * 1000, // 10分钟
            }
          );
          return data;
        } catch (error) {
          console.error("查询导入数据失败:", error);
          throw error;
        }
      },
      createImport: async (file) => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          const data = await apiContext.request(`${apiBase}/api/v1/imports`, {
            method: "POST",
            body: formData,
            timeout: 60000, // 上传文件需要更长的超时时间
          });
          return data;
        } catch (error) {
          console.error("创建导入任务失败:", error);
          throw error;
        }
      },
      searchCompanies: async (searchParams) => {
        try {
          const data = await apiContext.request(`${apiBase}/api/v1/companies/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(searchParams),
            useCache: true,
            cacheKey: `search_${JSON.stringify(searchParams)}`,
            cacheTTL: 2 * 60 * 1000, // 2分钟
          });
          return data;
        } catch (error) {
          console.error("搜索企业失败:", error);
          throw error;
        }
      },
      updateCompany: async (id, companyData) => {
        try {
          const data = await apiContext.request(`${apiBase}/api/v1/companies/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(companyData),
            requireAuth: true, // 需要认证
          });

          // 清除相关缓存
          apiContext.clearCache(`company_${id}`, true);
          apiContext.clearCache(`import_*`, true); // 清除导入缓存

          return data;
        } catch (error) {
          console.error("更新企业失败:", error);
          throw error;
        }
      },
    };
  }, [apiContext, apiBase]);

  // 持久化配置
  useEffect(() => localStorage.setItem("importId", importId), [importId]);
  useEffect(() => localStorage.setItem("importPageSize", String(importPageSize)), [importPageSize]);

  // 计算属性
  const importTotalPage = useMemo(() => Math.max(1, Math.ceil(importTotal / importPageSize)), [importTotal, importPageSize]);
  const searchTotalPage = useMemo(() => Math.max(1, Math.ceil(search.total / search.page_size)), [search.total, search.page_size]);

  // API调用函数
  async function queryImport(page = importPage) {
    if (!importId.trim()) return setMsg({ text: "请输入 import_id。", error: true });
    setMsg({ text: "正在查询导入数据...", error: false });
    try {
      const data = await api.queryImport(importId, page, importPageSize);
      setImportPage(page);
      setImportTotal(data.data.total);
      setImportItems(data.data.items || []);
      if (!(data.data.items || []).some((x) => x.id === selectedId)) {
        setSelectedId(null);
        setEditForm(EMPTY_EDIT);
      }
      setMsg({ text: `查询完成：当前批次共 ${data.data.total} 条。`, error: false });
    } catch (e) {
      setMsg({ text: `查询失败：${e.message}`, error: true });
    }
  }

  async function onImport(e) {
    e.preventDefault();
    if (!uploadFile) return setMsg({ text: "请先选择 Excel 文件。", error: true });
    setMsg({ text: "正在上传并导入，请稍候...", error: false });
    try {
      const data = await api.createImport(uploadFile);
      setImportId(data.data.import_id);
      setMsg({ text: `导入成功：${data.data.import_id}，可直接查询并调整导入数据。`, error: false });
      queryImport(1);
    } catch (e2) {
      setMsg({ text: `导入失败：${e2.message}`, error: true });
    }
  }

  function selectItem(item) {
    setSelectedId(item.id);
    setEditForm({ id: String(item.id), name: item.name || "", city: item.city || "", industry: item.industry || "", address: item.address || "", tags: Array.isArray(item.tags) ? item.tags.join(",") : "", raw_data: safeJson(item.raw_data || {}) });
  }

  function selectItemById(value) {
    const selected = importItems.find((item) => item.id === Number(value));
    if (selected) selectItem(selected);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!selectedId) return setMsg({ text: "请先选择记录。", error: true });
    let raw;
    try { raw = JSON.parse(editForm.raw_data || "{}"); } catch { return setMsg({ text: "raw_data 不是合法 JSON。", error: true }); }
    try {
      await api.updateCompany(selectedId, {
        name: editForm.name.trim(),
        city: editForm.city.trim(),
        industry: editForm.industry.trim(),
        address: editForm.address.trim(),
        tags: parseCsvInput(editForm.tags),
        raw_data: raw
      });
      setMsg({ text: `保存成功：企业 #${selectedId} 已更新。`, error: false });
      queryImport(importPage);
    } catch (e3) {
      setMsg({ text: `保存失败：${e3.message}`, error: true });
    }
  }

  async function doSearch(page = search.page) {
    setMsg({ text: "正在检索企业数据...", error: false });
    try {
      const searchParams = {
        keyword: search.keyword.trim(),
        match_mode: search.match_mode,
        filters: {
          city: search.city ? search.city.split(',').map(s => s.trim()).filter(Boolean) : [],
          industry: search.industry ? search.industry.split(',').map(s => s.trim()).filter(Boolean) : [],
          import_id: search.import_id.trim() || null,

          // 新增复杂过滤条件
          created_start: search.created_start || null,
          created_end: search.created_end || null,
          tags: search.tags ? search.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
          tag_match: search.tag_match || 'any',
          import_start_date: search.import_start_date || null,
          import_end_date: search.import_end_date || null
        },
        page,
        page_size: search.page_size,
        sort_by: search.sort_by || 'created_at',
        sort_order: search.sort_order || 'desc'
      };

      const data = await api.searchCompanies(searchParams);

      setSearch((prev) => ({
        ...prev,
        page,
        total: data.data.total,
        items: data.data.items || [],
        total_pages: data.data.total_pages || Math.ceil(data.data.total / search.page_size)
      }));
      setMsg({ text: `检索完成：命中 ${data.data.total} 条。`, error: false });
    } catch (e4) {
      setMsg({ text: `检索失败：${e4.message}`, error: true });
    }
  }

  useEffect(() => {
    if (importId.trim()) queryImport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSearchWithImportId() {
    const value = importId.trim();
    if (!value) return setMsg({ text: "请先输入或生成 import_id。", error: true });
    setSearch((prev) => ({ ...prev, import_id: value, page: 1 }));
    setTab("search");
    setMsg({ text: `已切换到企业检索，并带入导入批次：${value}`, error: false });
  }

  // 点击历史记录加载数据
  async function handleHistorySelect(importId, fileName) {
    setLoadingHistoryData(true);
    setMsg({ text: `正在加载历史记录：${fileName}...`, error: false });

    try {
      // 检查缓存
      if (importCache.current.has(importId)) {
        const cached = importCache.current.get(importId);
        // 检查缓存是否过期（30分钟）
        if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
          setImportId(importId);
          setSearch((prev) => ({
            ...prev,
            import_id: importId,
            page: 1,
            items: cached.data,
            total: cached.total
          }));
          setTab("search");
          setMsg({ text: `已从缓存加载历史记录：${fileName}`, error: false });
          setLoadingHistoryData(false);
          return;
        }
      }

      // 缓存未命中或已过期，查询数据库
      setImportId(importId);
      setSearch((prev) => ({ ...prev, import_id: importId, page: 1 }));
      setTab("search");

      // 查询导入数据
      await queryImport(1);

      // 更新缓存
      importCache.current.set(importId, {
        data: search.items,
        total: search.total,
        timestamp: Date.now()
      });

      setMsg({ text: `已成功加载历史记录：${fileName}`, error: false });
    } catch (error) {
      setMsg({ text: `加载历史记录失败：${error.message}`, error: true });
    } finally {
      setLoadingHistoryData(false);
    }
  }

  return (
    <div className="app-layout">
      <Topbar apiBase={apiBase} setApiBase={apiContext.switchEnvironment} />
      <SidebarTabs tab={tab} setTab={setTab} />
      <main className="main-content">
        <div className="content-surface">
          <section className="content">
            <MessageBar msg={msg} />
            {tab === "import" && <ImportPanel onImport={onImport} setUploadFile={setUploadFile} importId={importId} setImportId={setImportId} importPageSize={importPageSize} setImportPageSize={setImportPageSize} queryImport={queryImport} openSearchWithImportId={openSearchWithImportId} importItems={importItems} selectedId={selectedId} selectItem={selectItem} formatDisplayCode={formatDisplayCode} importPage={importPage} importTotalPage={importTotalPage} importTotal={importTotal} editForm={editForm} setEditForm={setEditForm} saveEdit={saveEdit} setSelectedId={setSelectedId} setEditFormToEmpty={() => setEditForm(EMPTY_EDIT)} selectItemById={selectItemById} />}
            {tab === "search" && (<><SearchPanel search={search} setSearch={setSearch} doSearch={doSearch} searchTotalPage={searchTotalPage} setRawPreview={setRawPreview} formatDisplayCode={formatDisplayCode} filters={search} setFilters={setSearch} onHistorySelect={handleHistorySelect} loadingHistoryData={loadingHistoryData} /><div className="card"><h3>企业全量字段预览（raw_data）</h3><pre className="json-box">{rawPreview}</pre></div></>)}
            {tab === "overview" && <OverviewPanel search={search} />}
          </section>
        </div>
      </main>
    </div>
  );
}