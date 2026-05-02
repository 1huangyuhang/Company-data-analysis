const TABS = [
  { key: "import", label: "Excel 导入", icon: "📊" },
  { key: "search", label: "企业检索", icon: "🔍" },
  { key: "overview", label: "数据看板", icon: "📈" },
];

export default function SidebarTabs({ tab, setTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-dot" />
        <strong>数据中台</strong>
      </div>
      <div className="sidebar-group-title">功能导航</div>
      {TABS.map((item) => (
        <button key={item.key} className={`tab-btn ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key)}>
          <span className="tab-btn-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </aside>
  );
}
