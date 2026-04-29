const TABS = [
  { key: "import", label: "Excel 导入" },
  { key: "search", label: "企业检索" },
  { key: "overview", label: "数据看板" },
];

export default function SidebarTabs({ tab, setTab }) {
  return (
    <aside className="sidebar">
      {TABS.map((item) => (
        <button key={item.key} className={`tab-btn ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key)}>
          {item.label}
        </button>
      ))}
    </aside>
  );
}
