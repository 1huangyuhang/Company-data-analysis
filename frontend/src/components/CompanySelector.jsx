import { useEffect, useMemo, useRef, useState } from "react";

function extractPhones(item) {
  const raw = item?.raw_data || {};
  const values = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!/(手机|电话|联系方式|phone|mobile|tel)/i.test(String(key))) continue;
    if (Array.isArray(value)) values.push(...value);
    else values.push(value);
  }
  return [...new Set(values.map((x) => String(x ?? "").trim()).filter(Boolean))];
}

export default function CompanySelector({ items, selectedId, onSelect }) {
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
  const selectedPhones = selectedItem ? extractPhones(selectedItem) : [];
  const selectedLabel = selectedItem ? `${selectedItem.name || "未命名企业"}${selectedPhones[0] ? `（${selectedPhones[0]}）` : ""}` : "请选择企业名称";

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
                const single = group.list.length === 1;
                if (single) {
                  const item = group.list[0];
                  return (
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
                  );
                }

                return (
                  <div className="company-selector-group" key={group.name}>
                    <div className="company-selector-group-name">{group.name}</div>
                    <div className="company-selector-group-subtitle">手机号模块</div>
                    {group.list.map((item) => {
                      const phones = extractPhones(item);
                      const phoneLabel = phones.length ? phones.join(" / ") : "手机号缺失";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`company-selector-item phone-item ${selectedId === item.id ? "active" : ""}`}
                          onClick={() => {
                            onSelect(item.id);
                            setOpen(false);
                          }}
                        >
                          {phoneLabel}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
