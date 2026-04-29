export default function Topbar({ apiBase, setApiBase }) {
  return (
    <header className="topbar">
      <h1>企业数据智能管理检索系统</h1>
      <div className="api-config">
        <label>API 地址</label>
        <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
      </div>
    </header>
  );
}
