import { useEffect, useMemo } from "react";
import CompanySelector from "../editor/CompanySelector";
import ImportFileQueueToolbar from "./ImportFileQueueToolbar";
import useImportDataSource from "../../hooks/useImportDataSource";
import { extractPhones } from "../../utils/formatters";

const INDUSTRY_OPTIONS = ["软件和信息服务业", "先进制造业", "电子商务", "生物医药", "新能源与新材料", "金融服务", "教育与培训", "现代物流"];

export default function ImportPanel({
  onImport,
  pendingFiles,
  onAddPendingFiles,
  onRemovePendingFile,
  importHistory,
  importHistoryRefreshing = false,
  onRefreshImportHistory,
  onSelectHistoricalImport,
  importId,
  setImportId,
  importPageSize,
  setImportPageSize,
  queryImport,
  openSearchWithImportId,
  importItems,
  selectedId,
  selectItem,
  formatDisplayCode,
  importPage,
  importTotalPage,
  importTotal,
  editForm,
  setEditForm,
  saveEdit,
  setSelectedId,
  setEditFormToEmpty,
  selectItemById,
}) {
  const { dataSource } = useImportDataSource(importItems);

  useEffect(() => {
    pendingFiles.forEach((entry) => {
      if (!(entry.file instanceof File)) onRemovePendingFile(entry.key);
    });
  }, [pendingFiles, onRemovePendingFile]);

  const rawColumns = useMemo(() => {
    const seen = new Set();
    const cols = [];
    dataSource.forEach((item) => {
      Object.keys(item.raw_data || {}).forEach((key) => {
        if (seen.has(key)) return;
        seen.add(key);
        cols.push(key);
      });
    });
    return cols;
  }, [dataSource]);

  function renderCell(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  }

  const selectedCompany = useMemo(() => {
    if (!selectedId) return null;
    return dataSource.find((item) => item.id === selectedId) || null;
  }, [selectedId, dataSource]);

  const selectedPhones = useMemo(() => extractPhones(selectedCompany), [selectedCompany]);

  return (
    <>
      <h2>Excel 一键导入</h2>
      <ImportFileQueueToolbar
        pendingFiles={pendingFiles}
        onAddPendingFiles={onAddPendingFiles}
        onRemovePendingFile={onRemovePendingFile}
        onUploadQueue={onImport}
      />

      <div className="card import-history-card">
        <div className="table-head import-history-head">
          <h3>历史导入记录</h3>
          <button
            type="button"
            className="secondary import-history-refresh"
            disabled={importHistoryRefreshing}
            aria-busy={importHistoryRefreshing}
            aria-label="刷新历史导入记录列表"
            onClick={() => onRefreshImportHistory()}
          >
            {importHistoryRefreshing ? "刷新中…" : "刷新列表"}
          </button>
        </div>
        <p className="hint-text">以下为已写入数据库的导入批次。点击「加载该批」即可查看与编辑，无需重复上传文件。</p>
        {!importHistory?.length ? (
          <p className="hint-text muted">暂无记录（需先登录；若刚导入请点击「刷新列表」）。</p>
        ) : (
          <div className="table-wrap import-history-wrap">
            <table className="import-history-table">
              <thead>
                <tr>
                  <th>导入编号</th>
                  <th>原文件名</th>
                  <th>状态</th>
                  <th>成功/总行</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((row) => (
                  <tr key={row.import_id}>
                    <td className="mono-cell">{row.import_id}</td>
                    <td>{row.file_name}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.success_rows ?? 0} / {row.total_rows ?? 0}
                    </td>
                    <td className="nowrap">{row.created_at ? String(row.created_at).slice(0, 19).replace("T", " ") : "—"}</td>
                    <td>
                      <button type="button" className="secondary" onClick={() => onSelectHistoricalImport(row.import_id)}>
                        加载该批
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card import-query-card">
        <h3>导入数据查询与调整</h3>
        <p className="hint-text">「本次 Excel 导入编号」在每次上传成功后自动生成，用于只查看或检索这一次上传的数据。</p>
        <div className="row">
          <div className="select-wrap">
            <label htmlFor="import-batch-id">本次 Excel 导入编号</label>
            <input
              id="import-batch-id"
              value={importId}
              onChange={(e) => setImportId(e.target.value)}
              placeholder="例如 imp_abc123def4"
            />
          </div>
          <div className="select-wrap">
            <label htmlFor="importPageSize">每页条数</label>
            <input id="importPageSize" type="number" value={importPageSize} onChange={(e) => setImportPageSize(Number(e.target.value || 20))} />
          </div>
          <button type="button" onClick={() => queryImport(1)}>
            查询导入数据
          </button>
          <button type="button" className="secondary" onClick={openSearchWithImportId}>
            带入检索
          </button>
        </div>

        <div className="table-wrap import-table-wrap">
          <table className="import-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>源行号</th>
                <th>企业名称</th>
                <th>城市</th>
                <th>行业</th>
                <th>地址</th>
                <th>标签</th>
                {rawColumns.map((key) => (
                  <th key={key}>{key}</th>
                ))}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {!importItems.length ? (
                <tr>
                  <td colSpan={8 + rawColumns.length}>暂无数据</td>
                </tr>
              ) : (
                importItems.map((item, index) => (
                  <tr key={item.id} className={`import-row ${selectedId === item.id ? "selected" : ""}`} onClick={() => selectItem(item)}>
                    <td>{formatDisplayCode(item, index, importPage, importPageSize, importId)}</td>
                    <td>{item.source_row || ""}</td>
                    <td>{item.name || ""}</td>
                    <td>{item.city || ""}</td>
                    <td>{item.industry || ""}</td>
                    <td>{item.address || ""}</td>
                    <td>{Array.isArray(item.tags) ? item.tags.join(", ") : ""}</td>
                    {rawColumns.map((key) => (
                      <td key={`${item.id}-${key}`} className="raw-col-cell" title={renderCell(item.raw_data?.[key])}>
                        {renderCell(item.raw_data?.[key])}
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectItem(item);
                        }}
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="row paginate">
          <button className="secondary" type="button" onClick={() => queryImport(Math.max(1, importPage - 1))}>
            上一页
          </button>
          <span>
            第 {importPage} / {importTotalPage} 页（共 {importTotal} 条）
          </span>
          <button className="secondary" type="button" onClick={() => queryImport(Math.min(importTotalPage, importPage + 1))}>
            下一页
          </button>
        </div>
      </div>

      <form className="card" onSubmit={saveEdit}>
        <div className="table-head">
          <h3>编辑选中数据</h3>
          <div className="hint-text">{selectedId ? `当前编辑企业 #${selectedId}` : "请先在上方列表选择一条记录"}</div>
        </div>
        <div className="row">
          <div className="select-wrap">
            <label>选择企业（按名称）</label>
            <CompanySelector
              items={dataSource}
              selectedId={selectedId}
              onSelect={selectItemById}
            />
          </div>
        </div>
        <div className="phone-module">
          <label>手机号模块</label>
          {!selectedId ? (
            <div className="phone-module-empty">请先选择企业后查看手机号</div>
          ) : selectedPhones.length ? (
            <div className="phone-chip-list">
              {selectedPhones.map((phone) => (
                <span key={phone} className="phone-chip">
                  {phone}
                </span>
              ))}
            </div>
          ) : (
            <div className="phone-module-empty">该企业未识别到手机号字段</div>
          )}
        </div>
        <div className="grid">
          <div>
            <label>系统ID（内部）</label>
            <input value={editForm.id} readOnly />
          </div>
          <div>
            <label>企业名称</label>
            <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label>城市</label>
            <input value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <label>行业</label>
            <input list="industryOptions" value={editForm.industry} onChange={(e) => setEditForm((p) => ({ ...p, industry: e.target.value }))} />
            <datalist id="industryOptions">
              {INDUSTRY_OPTIONS.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>
          <div>
            <label>地址</label>
            <input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <label>标签（逗号分隔）</label>
            <input value={editForm.tags} onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))} />
          </div>
        </div>
        <label>raw_data（JSON）</label>
        <textarea className="raw-editor" value={editForm.raw_data} onChange={(e) => setEditForm((p) => ({ ...p, raw_data: e.target.value }))} />
        <div className="row">
          <button disabled={!selectedId} type="submit">
            保存修改
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setSelectedId(null);
              setEditFormToEmpty();
            }}
          >
            取消选中
          </button>
        </div>
      </form>
    </>
  );
}
