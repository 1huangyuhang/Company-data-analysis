import { useCallback, useEffect, useMemo, useState } from "react";
import ImportPanel from "../components/import/ImportPanel";
import MessageBar from "../components/layout/MessageBar";
import { request } from "../utils/api";
import { formatDisplayCode, parseCsvInput, safeJson } from "../utils/formatters";

const EMPTY_EDIT = { id: "", name: "", city: "", industry: "", address: "", tags: "", raw_data: "{}" };

export default function ImportContainer() {
  const [msg, setMsg] = useState({ text: "前端已就绪，请先导入 Excel 或直接检索。", error: false });
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("apiBase") || "http://127.0.0.1:8000");
  const [importId, setImportId] = useState(() => localStorage.getItem("importId") || "");
  const [importPageSize, setImportPageSize] = useState(() => Number(localStorage.getItem("importPageSize") || "20"));
  const [importPage, setImportPage] = useState(1);
  const [importTotal, setImportTotal] = useState(0);
  const [importItems, setImportItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [importHistoryRefreshing, setImportHistoryRefreshing] = useState(false);

  useEffect(() => localStorage.setItem("apiBase", apiBase), [apiBase]);
  useEffect(() => localStorage.setItem("importId", importId), [importId]);
  useEffect(() => localStorage.setItem("importPageSize", String(importPageSize)), [importPageSize]);

  const importTotalPage = useMemo(() => Math.max(1, Math.ceil(importTotal / importPageSize)), [importTotal, importPageSize]);

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

  async function queryImport(page = importPage, batchIdOverride) {
    const bid = (batchIdOverride != null && String(batchIdOverride).trim() !== "" ? String(batchIdOverride).trim() : importId.trim());
    if (!bid) {
      setMsg({ text: "请输入 import_id。", error: true });
      return null;
    }
    setMsg({ text: "正在查询导入数据...", error: false });
    try {
      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/by-import/${encodeURIComponent(bid)}?page=${page}&page_size=${importPageSize}`);
      setImportPage(page);
      setImportTotal(data.data.total);
      setImportItems(data.data.items || []);
      if (!(data.data.items || []).some((x) => x.id === selectedId)) {
        setSelectedId(null);
        setEditForm(EMPTY_EDIT);
      }
      const total = data.data.total;
      setMsg({ text: `查询完成：当前批次共 ${total} 条。`, error: false });
      return total;
    } catch (e) {
      setMsg({ text: `查询失败：${e.message}`, error: true });
      return null;
    }
  }

  async function onImport(e) {
    e.preventDefault();
    const validQueue = pendingFiles.filter((x) => x.file instanceof File);
    if (validQueue.length !== pendingFiles.length) setPendingFiles(validQueue);
    if (!validQueue.length) return setMsg({ text: "请先选择 Excel 文件。", error: true });
    const base = apiBase.replace(/\/$/, "");
    const snapshot = [...validQueue];
    let lastImportId = "";
    for (let i = 0; i < snapshot.length; i++) {
      const entry = snapshot[i];
      const file = entry.file;
      setMsg({ text: `正在导入第 ${i + 1} / ${snapshot.length} 个文件：${file.name}…`, error: false });
      const formData = new FormData();
      formData.append("file", file);
      try {
        const data = await request(`${base}/api/v1/import/excel`, { method: "POST", body: formData });
        lastImportId = data.data.import_id;
        setImportId(lastImportId);
        setPendingFiles((p) => p.filter((x) => x.key !== entry.key));
      } catch (e2) {
        setMsg({ text: `导入失败：${e2.message}`, error: true });
        return;
      }
    }
    if (lastImportId) {
      await loadImportHistory();
      await queryImport(1, lastImportId);
      setMsg({ text: `导入成功：${lastImportId}，可直接查询并调整导入数据。`, error: false });
    }
  }

  async function selectHistoricalImport(batchId) {
    const id = String(batchId || "").trim();
    if (!id) return;
    setImportId(id);
    const total = await queryImport(1, id);
    if (total != null) setMsg({ text: `已切换到历史导入「${id}」，共 ${total} 条。`, error: false });
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
      setMsg({ text: `保存失败：${e3.message}`, error: true });
    }
  }

  useEffect(() => {
    if (importId.trim()) queryImport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSearchWithImportId() {
    const value = importId.trim();
    if (!value) return setMsg({ text: "请先输入或生成 import_id。", error: true });
    if (window.onSwitchToSearch) {
      window.onSwitchToSearch(value);
    }
  }

  return (
    <>
      <MessageBar msg={msg} />
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
    </>
  );
}
