import { useEffect, useMemo, useRef, useState } from "react";
import { extractPhones } from "../../utils/formatters";

export default function CompanySelector({ items = [], selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const groups = useMemo(() => {
    const groupMap = new Map();
    items.forEach((item) => {
      const name = (item.name || "未命名企业").trim();
      if (!groupMap.has(name)) groupMap.set(name, []);
      groupMap.get(name).push(item);
    });
    return Array.from(groupMap.entries()).map(([name, list]) => ({ name, list }));
  }, [items]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => {
      if (group.name.toLowerCase().includes(q)) return true;
      return group.list.some((item) => extractPhones(item).some((phone) => phone.toLowerCase().includes(q)));
    });
  }, [groups, query]);

  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedLabel = selectedItem ? (selectedItem.name || "未命名企业").trim() || "未命名企业" : "请选择企业名称";

  return (
    <div className="company-selector" ref={wrapperRef}>
      <button type="button" className="company-selector-trigger" onClick={() => setOpen((prev) => !prev)}>
        {selectedLabel}
      </button>
      {open && (
        <div className="company-selector-panel">
          <input
            className="company-selector-search"
            type="text"
            placeholder="输入企业名称筛选"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="company-selector-list">
            {filteredGroups.length === 0 ? (
              <div className="company-selector-empty">没有匹配的企业</div>
            ) : (
              filteredGroups.map((group) => {
                return group.list.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`company-selector-item ${selectedId === item.id ? "active" : ""}`}
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                  >
                    {group.name}
                  </button>
                ));
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
