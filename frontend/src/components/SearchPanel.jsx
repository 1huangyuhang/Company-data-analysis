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

export default function SearchPanel({ search, setSearch, doSearch, searchTotalPage, setRawPreview, formatDisplayCode }) {
  return (
    <>
      <h2>CRM 式企业检索</h2>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          doSearch(1);
        }}
      >
        <div className="grid">
          <div>
            <label>关键词</label>
            <input value={search.keyword} onChange={(e) => setSearch((p) => ({ ...p, keyword: e.target.value }))} />
          </div>
          <div>
            <label>检索模式</label>
            <select value={search.match_mode} onChange={(e) => setSearch((p) => ({ ...p, match_mode: e.target.value }))}>
              <option value="fuzzy">模糊检索</option>
              <option value="exact">精准检索</option>
            </select>
          </div>
          <div>
            <label>城市（逗号分隔）</label>
            <input value={search.city} onChange={(e) => setSearch((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <label>行业（逗号分隔）</label>
            <input value={search.industry} onChange={(e) => setSearch((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div>
            <label>导入批次（import_id）</label>
            <input value={search.import_id} onChange={(e) => setSearch((p) => ({ ...p, import_id: e.target.value }))} placeholder="可选，按导入批次筛选" />
          </div>
          <div>
            <label>每页条数</label>
            <input type="number" min="1" max="200" value={search.page_size} onChange={(e) => setSearch((p) => ({ ...p, page_size: Number(e.target.value || 20) }))} />
          </div>
        </div>
        <div className="row">
          <button type="submit">执行检索</button>
          <button className="secondary" type="button" onClick={() => setSearch((p) => ({ ...p, ...DEFAULT_SEARCH }))}>
            重置条件
          </button>
        </div>
      </form>

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
                <th>导入批次</th>
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
                    <td>{item.import_id || "-"}</td>
                    <td>{item.source_row || "-"}</td>
                    <td>{Array.isArray(item.tags) ? item.tags.join(", ") : ""}</td>
                    <td>
                      <button type="button" className="secondary" onClick={() => setRawPreview(JSON.stringify(item.raw_data || {}, null, 2))}>
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
    </>
  );
}
