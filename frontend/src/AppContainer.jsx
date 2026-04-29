import { useEffect, useMemo, useState } from "react";
import ImportPanel from "./components/ImportPanel";
import MessageBar from "./components/MessageBar";
import OverviewPanel from "./components/OverviewPanel";
import SearchPanel from "./components/SearchPanel";
import SidebarTabs from "./components/SidebarTabs";
import Topbar from "./components/Topbar";

const EMPTY_EDIT = { id: "", name: "", city: "", industry: "", address: "", tags: "", raw_data: "{}" };
const DEFAULT_SEARCH = { keyword: "", match_mode: "fuzzy", city: "", industry: "", import_id: "", page: 1, page_size: 20, total: 0, items: [] };

function parseCsvInput(value) {
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDisplayCode(item, index, page, pageSize, importIdForFallback = "") {
  const importToken = (item.import_id || importIdForFallback || "").replace(/^imp_/i, "").slice(-4).toUpperCase() || "GEN";
  if (item.source_row) return `${importToken}-${String(item.source_row).padStart(4, "0")}`;
  return `${importToken}-N${String((page - 1) * pageSize + index + 1).padStart(4, "0")}`;
}

export default function AppContainer() {
  const [tab, setTab] = useState("import");
  const [msg, setMsg] = useState({ text: "前端已就绪，请先导入 Excel 或直接检索。", error: false });
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("apiBase") || "http://127.0.0.1:8000");
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

  useEffect(() => localStorage.setItem("apiBase", apiBase), [apiBase]);
  useEffect(() => localStorage.setItem("importId", importId), [importId]);
  useEffect(() => localStorage.setItem("importPageSize", String(importPageSize)), [importPageSize]);

  const importTotalPage = useMemo(() => Math.max(1, Math.ceil(importTotal / importPageSize)), [importTotal, importPageSize]);
  const searchTotalPage = useMemo(() => Math.max(1, Math.ceil(search.total / search.page_size)), [search.total, search.page_size]);

  async function request(url, options) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data?.detail || data?.error?.message || "请求失败");
    return data;
  }

  async function queryImport(page = importPage) {
    if (!importId.trim()) return setMsg({ text: "请输入 import_id。", error: true });
    setMsg({ text: "正在查询导入数据...", error: false });
    try {
      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/by-import/${encodeURIComponent(importId.trim())}?page=${page}&page_size=${importPageSize}`);
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
    const formData = new FormData();
    formData.append("file", uploadFile);
    setMsg({ text: "正在上传并导入，请稍候...", error: false });
    try {
      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/import/excel`, { method: "POST", body: formData });
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
      await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), city: editForm.city.trim(), industry: editForm.industry.trim(), address: editForm.address.trim(), tags: parseCsvInput(editForm.tags), raw_data: raw }),
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
      const payload = { keyword: search.keyword.trim(), match_mode: search.match_mode, filters: { city: parseCsvInput(search.city), industry: parseCsvInput(search.industry), import_id: search.import_id.trim() || null }, page, page_size: search.page_size };
      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setSearch((prev) => ({ ...prev, page, total: data.data.total, items: data.data.items || [] }));
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

  return (
    <>
      <Topbar apiBase={apiBase} setApiBase={setApiBase} />
      <main className="layout">
        <SidebarTabs tab={tab} setTab={setTab} />
        <section className="content">
          <MessageBar msg={msg} />
          {tab === "import" && <ImportPanel onImport={onImport} setUploadFile={setUploadFile} importId={importId} setImportId={setImportId} importPageSize={importPageSize} setImportPageSize={setImportPageSize} queryImport={queryImport} openSearchWithImportId={openSearchWithImportId} importItems={importItems} selectedId={selectedId} selectItem={selectItem} formatDisplayCode={formatDisplayCode} importPage={importPage} importTotalPage={importTotalPage} importTotal={importTotal} editForm={editForm} setEditForm={setEditForm} saveEdit={saveEdit} setSelectedId={setSelectedId} setEditFormToEmpty={() => setEditForm(EMPTY_EDIT)} selectItemById={selectItemById} />}
          {tab === "search" && (<><SearchPanel search={search} setSearch={setSearch} doSearch={doSearch} searchTotalPage={searchTotalPage} setRawPreview={setRawPreview} formatDisplayCode={formatDisplayCode} /><div className="card"><h3>企业全量字段预览（raw_data）</h3><pre className="json-box">{rawPreview}</pre></div></>)}
          {tab === "overview" && <OverviewPanel search={search} />}
        </section>
      </main>
    </>
  );
}
