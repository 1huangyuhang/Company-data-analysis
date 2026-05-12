import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImportPanel from "./components/import/ImportPanel";
import MessageBar from "./components/layout/MessageBar";
import OverviewPanel from "./components/overview/OverviewPanel";
import SearchPanel from "./components/search/SearchPanel";
import SidebarTabs from "./components/layout/SidebarTabs";
import Topbar from "./components/layout/Topbar";
import { request, ensureAccessTokenOrOpenAuth, friendlyAuthErrorMessage, hasStoredAccessToken } from "./utils/api";
import { formatDisplayCode, parseCsvInput, safeJson } from "./utils/formatters";

const EMPTY_EDIT = { id: "", name: "", city: "", industry: "", address: "", tags: "", raw_data: "{}" };
const DEFAULT_SEARCH = { keyword: "", match_mode: "fuzzy", city: "", industry: "", import_id: "", page: 1, page_size: 20, total: 0, items: [] };

function readInitialApiBase() {
  const saved = localStorage.getItem("apiBase");
  if (saved !== null) return saved;
  if (import.meta.env.DEV) return "";
  return "http://127.0.0.1:8000";
}

export default function AppContainer() {
  const [tab, setTab] = useState("import");
  const [msg, setMsg] = useState({ text: "前端已就绪，请先导入 Excel 或直接检索。", error: false });
  const [apiBase, setApiBase] = useState(readInitialApiBase);

  const [importId, setImportId] = useState(() => localStorage.getItem("importId") || "");
  const [importPageSize, setImportPageSize] = useState(() => Number(localStorage.getItem("importPageSize") || "20"));
  const [importPage, setImportPage] = useState(1);
  const [importTotal, setImportTotal] = useState(0);
  const [importItems, setImportItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  /** 待上传队列：每项 { key, file }；上传成功或校验无效会从队列移除 */
  const [pendingFiles, setPendingFiles] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [importHistoryRefreshing, setImportHistoryRefreshing] = useState(false);

  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);
  const [rawPreview, setRawPreview] = useState("请先点击“查看”");

  useEffect(() => localStorage.setItem("apiBase", apiBase), [apiBase]);
  useEffect(() => localStorage.setItem("importId", importId), [importId]);
  useEffect(() => localStorage.setItem("importPageSize", String(importPageSize)), [importPageSize]);

  const importTotalPage = useMemo(() => Math.max(1, Math.ceil(importTotal / importPageSize)), [importTotal, importPageSize]);
  const searchTotalPage = useMemo(() => Math.max(1, Math.ceil(search.total / search.page_size)), [search.total, search.page_size]);

  const addPendingFilesFromList = useCallback((fileList) => {
    if (!fileList?.length) return;
    setPendingFiles((prev) => {
      const map = new Map(prev.map((x) => [x.key, x]));
      for (const file of fileList) {
        if (!file?.name?.toLowerCase().match(/\.(xlsx|xls)$/)) continue;
        const key = `${file.name}::${file.size}::${file.lastModified}`;
        map.set(key, { key, file });
      }
      return [...map.values()];
    });
  }, []);

  const removePendingFile = useCallback((key) => {
    setPendingFiles((p) => p.filter((x) => x.key !== key));
  }, []);

  const loadImportHistory = useCallback(async () => {
    setImportHistoryRefreshing(true);
    try {
      if (!hasStoredAccessToken()) {
        setImportHistory([]);
        return;
      }
      const prefix = apiBase.replace(/\/$/, "");
      try {
        const data = await request(`${prefix}/api/v1/import/history?limit=100`);
        setImportHistory(data.data.items || []);
      } catch {
        setImportHistory([]);
      }
    } finally {
      setImportHistoryRefreshing(false);
    }
  }, [apiBase]);

  /** @param {number} [page] @param {string} [batchIdOverride] 刚 setImportId 尚未提交时用 */
  async function queryImport(page = importPage, batchIdOverride) {
    const bid = (batchIdOverride != null && String(batchIdOverride).trim() !== "" ? String(batchIdOverride).trim() : importId.trim());
    if (!bid) {
      setMsg({ text: "请输入本次 Excel 导入编号。", error: true });
      return null;
    }
    if (!ensureAccessTokenOrOpenAuth()) {
      setMsg({ text: "请先登录后再查询导入数据。", error: true });
      return null;
    }
    setMsg({ text: "正在查询导入数据...", error: false });
    try {
      const prefix = apiBase.replace(/\/$/, "");
      const data = await request(`${prefix}/api/v1/companies/by-import/${encodeURIComponent(bid)}?page=${page}&page_size=${importPageSize}`);
      setImportPage(page);
      setImportTotal(data.data.total);
      setImportItems(data.data.items || []);
      if (!(data.data.items || []).some((x) => x.id === selectedId)) {
        setSelectedId(null);
        setEditForm(EMPTY_EDIT);
      }
      const total = data.data.total;
      setMsg({ text: `查询完成：该次上传共 ${total} 条。`, error: false });
      return total;
    } catch (e) {
      setMsg({ text: `查询失败：${friendlyAuthErrorMessage(e.message)}`, error: true });
      return null;
    }
  }

  async function onImport(e) {
    e?.preventDefault?.();
    const validQueue = pendingFiles.filter((x) => x.file instanceof File);
    if (validQueue.length !== pendingFiles.length) setPendingFiles(validQueue);
    if (!validQueue.length) return setMsg({ text: "请先选择 Excel 文件（可多选加入队列）。", error: true });
    if (!ensureAccessTokenOrOpenAuth()) {
      return setMsg({ text: "请先登录后再上传并导入（已为你打开登录窗口）。", error: true });
    }
    const base = apiBase.replace(/\/$/, "");
    const snapshot = [...validQueue];
    let lastImportId = "";
    let okCount = 0;
    for (let i = 0; i < snapshot.length; i++) {
      const entry = snapshot[i];
      const file = entry.file;
      if (!(file instanceof File) || !file.name?.toLowerCase().match(/\.(xlsx|xls)$/)) {
        setPendingFiles((p) => p.filter((x) => x.key !== entry.key));
        continue;
      }
      setMsg({ text: `正在导入第 ${i + 1} / ${snapshot.length} 个文件：${file.name}…`, error: false });
      const formData = new FormData();
      formData.append("file", file);
      try {
        const data = await request(`${base}/api/v1/import/excel`, { method: "POST", body: formData });
        lastImportId = data.data.import_id;
        setImportId(lastImportId);
        okCount += 1;
        setPendingFiles((p) => p.filter((x) => x.key !== entry.key));
      } catch (e2) {
        setMsg({ text: `导入失败（${file.name}）：${friendlyAuthErrorMessage(e2.message)}`, error: true });
        return;
      }
    }
    if (lastImportId) {
      await loadImportHistory();
      await queryImport(1, lastImportId);
      setMsg({
        text:
          okCount > 1
            ? `已成功导入 ${okCount} 个文件。当前展示最后一次导入编号：${lastImportId}。`
            : `导入成功。本次导入编号：${lastImportId}，可在下方查询或到「企业检索」筛选该次上传。`,
        error: false,
      });
    }
  }

  async function selectHistoricalImport(batchId) {
    const id = String(batchId || "").trim();
    if (!id) return;
    setImportId(id);
    if (!ensureAccessTokenOrOpenAuth()) {
      return setMsg({ text: "请先登录后再加载历史导入数据。", error: true });
    }
    const total = await queryImport(1, id);
    if (total != null) {
      setMsg({ text: `已切换到历史导入「${id}」，共 ${total} 条（数据已在库中，无需再次上传文件）。`, error: false });
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
    if (!ensureAccessTokenOrOpenAuth()) {
      return setMsg({ text: "请先登录后再保存修改。", error: true });
    }
    let raw;
    try {
      raw = JSON.parse(editForm.raw_data || "{}");
    } catch {
      return setMsg({ text: "raw_data 不是合法 JSON。", error: true });
    }
    try {
      await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), city: editForm.city.trim(), industry: editForm.industry.trim(), address: editForm.address.trim(), tags: parseCsvInput(editForm.tags), raw_data: raw }),
      });
      setMsg({ text: `保存成功：企业 #${selectedId} 已更新。`, error: false });
      queryImport(importPage);
    } catch (e3) {
      setMsg({ text: `保存失败：${friendlyAuthErrorMessage(e3.message)}`, error: true });
    }
  }

  /** @returns {Promise<{ total: number, page: number, page_size: number, items: unknown[] } | null>} */
  async function doSearch(pageArg, requestPageSize) {
    if (!ensureAccessTokenOrOpenAuth()) {
      setMsg({ text: "请先登录后再检索企业。", error: true });
      return null;
    }
    const s = searchRef.current;
    const page =
      typeof pageArg === "number" && pageArg >= 1 ? pageArg : Math.max(1, Number(s.page) || 1);
    const pageSize =
      typeof requestPageSize === "number" && requestPageSize >= 1
        ? Math.min(200, Math.max(1, requestPageSize))
        : Math.min(200, Math.max(1, Number(s.page_size) || 20));

    setMsg({ text: "正在检索企业数据...", error: false });
    try {
      const cityStr = String(s.city ?? "").trim();
      const indStr = String(s.industry ?? "").trim();
      const impStr = String(s.import_id ?? "").trim();
      const payload = {
        keyword: String(s.keyword ?? "").trim(),
        match_mode: s.match_mode === "exact" ? "exact" : "fuzzy",
        filters: {
          city: cityStr ? cityStr.split(",").map((x) => x.trim()).filter(Boolean) : [],
          industry: indStr ? indStr.split(",").map((x) => x.trim()).filter(Boolean) : [],
          import_id: impStr || null,
        },
        page,
        page_size: pageSize,
      };
      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const total = data.data.total;
      const items = data.data.items || [];
      setSearch((prev) => ({ ...prev, page, total, items }));
      setMsg({
        text:
          total === 0
            ? "检索完成：命中 0 条。若尚未导入 Excel，请先到「Excel 导入」页上传；若已导入，可放宽关键词或筛选条件。"
            : `检索完成：命中 ${total} 条。`,
        error: false,
      });
      return { total, page: data.data.page, page_size: data.data.page_size, items };
    } catch (e4) {
      setMsg({ text: `检索失败：${friendlyAuthErrorMessage(e4.message)}`, error: true });
      return null;
    }
  }

  useEffect(() => {
    if (importId.trim()) queryImport(1);
  }, []);

  useEffect(() => {
    if (tab === "import") loadImportHistory();
  }, [tab, apiBase]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      setPendingFiles((p) => {
        const next = p.filter((x) => x.file instanceof File);
        return next.length === p.length ? p : next;
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function openSearchWithImportId() {
    const value = importId.trim();
    if (!value) return setMsg({ text: "请先在上方填写本次 Excel 导入编号。", error: true });
    setSearch((prev) => ({ ...prev, import_id: value, page: 1 }));
    setTab("search");
    setMsg({ text: `已切换到企业检索，已填入本次导入编号「${value}」，点击「开始检索」即可。`, error: false });
  }

  return (
    <div className="app-layout">
      <Topbar
        apiBase={apiBase}
        setApiBase={setApiBase}
        onAuthSessionChange={(ev) => {
          if (ev?.type === "login") loadImportHistory();
          if (ev?.type === "logout") setImportHistory([]);
        }}
      />
      <SidebarTabs tab={tab} setTab={setTab} />
      <main className="main-content">
        <div className="content-surface">
          <section className="content">
            <MessageBar msg={msg} />
            {tab === "import" && (
              <ImportPanel
                onImport={onImport}
                pendingFiles={pendingFiles}
                onAddPendingFiles={addPendingFilesFromList}
                onRemovePendingFile={removePendingFile}
                importHistory={importHistory}
                importHistoryRefreshing={importHistoryRefreshing}
                onRefreshImportHistory={loadImportHistory}
                onSelectHistoricalImport={selectHistoricalImport}
                importId={importId}
                setImportId={setImportId}
                importPageSize={importPageSize}
                setImportPageSize={setImportPageSize}
                queryImport={queryImport}
                openSearchWithImportId={openSearchWithImportId}
                importItems={importItems}
                selectedId={selectedId}
                selectItem={selectItem}
                formatDisplayCode={formatDisplayCode}
                importPage={importPage}
                importTotalPage={importTotalPage}
                importTotal={importTotal}
                editForm={editForm}
                setEditForm={setEditForm}
                saveEdit={saveEdit}
                setSelectedId={setSelectedId}
                setEditFormToEmpty={() => setEditForm(EMPTY_EDIT)}
                selectItemById={selectItemById}
              />
            )}
            {tab === "search" && (
              <>
                <SearchPanel
                  search={search}
                  setSearch={setSearch}
                  doSearch={doSearch}
                  searchTotalPage={searchTotalPage}
                  setRawPreview={setRawPreview}
                  formatDisplayCode={formatDisplayCode}
                  filters={search}
                  setFilters={setSearch}
                />
                <div className="card">
                  <h3>企业全量字段预览（raw_data）</h3>
                  <pre className="json-box">{rawPreview}</pre>
                </div>
              </>
            )}
            {tab === "overview" && <OverviewPanel search={search} />}
          </section>
        </div>
      </main>
    </div>
  );
}
