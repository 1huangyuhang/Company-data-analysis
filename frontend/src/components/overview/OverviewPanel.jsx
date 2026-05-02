export default function OverviewPanel({ search }) {
  return (
    <section className="card">
      <h2>数据看板（首版）</h2>
      <ul id="overviewList">
        <li>总企业数：{search.total}</li>
        <li>当前筛选命中数：{search.total}</li>
        <li>当前页数据条数：{search.items.length}</li>
      </ul>
    </section>
  );
}
