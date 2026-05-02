import { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../utils/api";
import { formatDisplayCode } from "../utils/formatters";

export function useSearchWorkspace() {
  const [search, setSearch] = useState({
    keyword: "",
    match_mode: "fuzzy",
    city: "",
    industry: "",
    import_id: "",
    page: 1,
    page_size: 20,
    total: 0,
    items: [],
  });
  const [filters, setFilters] = useState({
    city: "",
    industry: "",
    import_id: "",
  });
  const [loading, setLoading] = useState(false);
  const importCache = useRef(new Map());

  const doSearch = async (page = 1) => {
    setLoading(true);
    try {
      const apiBase = localStorage.getItem("apiBase") || "http://127.0.0.1:8000";
      const searchParams = {
        keyword: search.keyword.trim(),
        match_mode: search.match_mode,
        filters: {
          city: filters.city ? filters.city.split(',').map(s => s.trim()).filter(Boolean) : [],
          industry: filters.industry ? filters.industry.split(',').map(s => s.trim()).filter(Boolean) : [],
          import_id: filters.import_id.trim() || null,
        },
        page,
        page_size: search.page_size,
      };

      const data = await request(`${apiBase.replace(/\/$/, "")}/api/v1/companies/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams)
      });

      setSearch(prev => ({
        ...prev,
        page,
        total: data.data.total,
        items: data.data.items || [],
      }));
    } catch (error) {
      console.error("检索失败:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    search,
    setSearch,
    filters,
    setFilters,
    loading,
    doSearch,
    importCache,
  };
}