import { useMemo } from "react";
import CompanySelector from "./CompanySelector";

const INDUSTRY_OPTIONS = ["软件和信息服务业", "先进制造业", "电子商务", "生物医药", "新能源与新材料", "金融服务", "教育与培训", "现代物流"];

export default function ImportPanel({
  onImport,
  setUploadFile,
  importId,
  setImportId,
  importPageSize,
  setImportPageSize,
  queryImport,
  openSearchWithImportId,
  importItems,
  importSelectorItems,
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
  const rawColumns = useMemo(() => {
    const seen = new Set();
    const cols = [];
    importItems.forEach((item) => {
      Object.keys(item.raw_data || {}).forEach((key) => {
        if (seen.has(key)) return;
        seen.add(key);
        cols.push(key);
      });
    });
    return cols;
  }, [importItems]);

  function renderCell(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  return (
    <>
      <h2>Excel 一键导入</h2>
      <form className="card" onSubmit={onImport}>
        <div className="row">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          <button type="submit">上传并导入</button>
        </div>
      </form>

      <div className="card">
        <h3>导入数据查询与调整</h3>
        <div className="row">
          <input value={importId} onChange={(e) => setImportId(e.target.value)} placeholder="请输入 import_id" />
          <input id="importPageSize" type="number" value={importPageSize} onChange={(e) => setImportPageSize(Number(e.target.value || 20))} />
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
              items={importSelectorItems}
              selectedId={selectedId}
              onSelect={selectItemById}
            />
          </div>
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
