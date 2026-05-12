import { useState } from "react";
import ExportPanel from "./ExportPanel";
import { formatImportIdForDisplay } from "../../utils/formatters";

const DEFAULT_SEARCH = {
  keyword: "",
  match_mode: "fuzzy",
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
  sort_by: "created_at",
  sort_order: "desc",
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

export default function SearchPanel({ search, setSearch, doSearch, searchTotalPage, setRawPreview, formatDisplayCode, filters = {}, setFilters = () => {} }) {
  // 合并默认值和传入值
  const mergedFilters = { ...DEFAULT_FILTERS, ...filters };
  const [showExport, setShowExport] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(1);
  };

  const handleReset = () => {
    // setFilters 与 setSearch 常为同一函数：不可先 DEFAULT_SEARCH 再 DEFAULT_FILTERS，否则会丢掉 keyword、match_mode 等
    setSearch((prev) => ({
      ...DEFAULT_SEARCH,
      page_size: prev.page_size,
      ...DEFAULT_FILTERS,
    }));
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    setShowExport(true);
  };

  const handleCloseExport = () => {
    setShowExport(false);
  };

  return (
    <>
      <h2>CRM 式企业检索</h2>
      <form className="card" onSubmit={handleSubmit}>
        {/* 基础搜索区域 */}
        <div className="grid">
          <div>
            <label>关键词</label>
            <input
              value={search.keyword}
              onChange={(e) => setSearch((p) => ({ ...p, keyword: e.target.value }))}
              placeholder="企业名称、地址等"
            />
          </div>
          <div>
            <label>检索模式</label>
            <select
              value={search.match_mode}
              onChange={(e) => setSearch((p) => ({ ...p, match_mode: e.target.value }))}
            >
              <option value="fuzzy">模糊检索</option>
              <option value="exact">精准检索</option>
            </select>
          </div>
          <div>
            <label>每页条数</label>
            <input
              type="number"
              min="1"
              max="100"
              value={search.page_size}
              onChange={(e) => setSearch((p) => ({ ...p, page_size: Number(e.target.value || 20) }))}
            />
          </div>
        </div>

        {/* 高级过滤区域 */}
        <div className="filter-section">
          <h4>高级过滤条件</h4>
          <div className="grid">
            <div>
              <label>城市（逗号分隔）</label>
              <input
                value={mergedFilters.city}
                onChange={(e) => updateFilter("city", e.target.value)}
                placeholder="北京,上海,深圳"
              />
            </div>
            <div>
              <label>行业（逗号分隔）</label>
              <input
                value={mergedFilters.industry}
                onChange={(e) => updateFilter("industry", e.target.value)}
                placeholder="软件和信息服务业,先进制造业"
              />
            </div>
            <div>
              <label>Excel 导入编号</label>
              <input
                value={mergedFilters.import_id}
                onChange={(e) => updateFilter("import_id", e.target.value)}
                placeholder="留空=不限定；填写则只查该次上传"
                title="与「Excel 导入」页成功导入后显示的编号一致，例如 imp_xxxxxxxxxx"
              />
            </div>
            <div>
              <label>标签（逗号分隔）</label>
              <input
                value={mergedFilters.tags}
                onChange={(e) => updateFilter("tags", e.target.value)}
                placeholder="高新技术企业,专精特新"
              />
            </div>
            <div>
              <label>标签匹配方式</label>
              <select
                value={mergedFilters.tag_match}
                onChange={(e) => updateFilter("tag_match", e.target.value)}
              >
                {TAG_MATCH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>排序方式</label>
              <select
                value={`${mergedFilters.sort_by || "created_at"}_${mergedFilters.sort_order || "desc"}`}
                onChange={(e) => {
                  const v = e.target.value;
                  const i = v.lastIndexOf("_");
                  if (i <= 0) return;
                  updateFilter("sort_by", v.slice(0, i));
                  updateFilter("sort_order", v.slice(i + 1));
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 时间范围过滤 */}
          <div className="grid">
            <div>
              <label>创建时间开始</label>
              <input
                type="date"
                value={mergedFilters.created_start}
                onChange={(e) => updateFilter("created_start", e.target.value)}
              />
            </div>
            <div>
              <label>创建时间结束</label>
              <input
                type="date"
                value={mergedFilters.created_end}
                onChange={(e) => updateFilter("created_end", e.target.value)}
              />
            </div>
            <div>
              <label>导入时间开始</label>
              <input
                type="date"
                value={mergedFilters.import_start_date}
                onChange={(e) => updateFilter("import_start_date", e.target.value)}
              />
            </div>
            <div>
              <label>导入时间结束</label>
              <input
                type="date"
                value={mergedFilters.import_end_date}
                onChange={(e) => updateFilter("import_end_date", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="row">
          <button type="submit">开始检索</button>
          <button className="secondary" type="button" onClick={handleReset}>
            重置条件
          </button>
          {search.items && search.items.length > 0 && (
            <button className="export-btn" type="button" onClick={handleExport}>
              📊 导出数据
            </button>
          )}
        </div>
      </form>

      {/* 搜索结果 */}
      <div className="card">
        <div className="table-head">
          <h3>企业数据列表</h3>
          <div>总数 {search.total} 条</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>编号</th>
                <th>企业名称</th>
                <th>城市</th>
                <th>行业</th>
                <th>地址</th>
                <th>Excel 导入编号</th>
                <th>源行号</th>
                <th>标签</th>
                <th>查看</th>
              </tr>
            </thead>
            <tbody>
              {!search.items.length ? (
                <tr>
                  <td colSpan="9">暂无数据</td>
                </tr>
              ) : (
                search.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{formatDisplayCode(item, index, search.page, search.page_size)}</td>
                    <td>{item.name}</td>
                    <td>{item.city}</td>
                    <td>{item.industry}</td>
                    <td>{item.address}</td>
                    <td>{formatImportIdForDisplay(item.import_id)}</td>
                    <td>{item.source_row || "-"}</td>
                    <td>{Array.isArray(item.tags) ? item.tags.join(", ") : ""}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setRawPreview(JSON.stringify(item.raw_data || {}, null, 2))}
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="row paginate">
          <button type="button" className="secondary" onClick={() => doSearch(Math.max(1, search.page - 1))}>
            上一页
          </button>
          <span>
            第 {search.page} / {searchTotalPage} 页
          </span>
          <button type="button" className="secondary" onClick={() => doSearch(Math.min(searchTotalPage, search.page + 1))}>
            下一页
          </button>
        </div>
      </div>

      {/* 导出面板 */}
      {showExport && (
        <>
          <div className="export-overlay" onClick={handleCloseExport}></div>
          <ExportPanel
            search={search}
            setSearch={setSearch}
            doSearch={doSearch}
            formatDisplayCode={formatDisplayCode}
            onClose={handleCloseExport}
          />
        </>
      )}
    </>
  );
}