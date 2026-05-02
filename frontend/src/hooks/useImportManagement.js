import { useState, useEffect, useMemo } from "react";

const EMPTY_EDIT = { id: "", name: "", city: "", industry: "", address: "", tags: "", raw_data: "{}" };

/**
 * 导入管理自定义Hook
 * 管理导入相关的状态和逻辑
 */
export function useImportManagement() {
  // 导入状态
  const [importId, setImportId] = useState(() => localStorage.getItem("importId") || "");
  const [importPageSize, setImportPageSize] = useState(() => Number(localStorage.getItem("importPageSize") || "20"));
  const [importPage, setImportPage] = useState(1);
  const [importTotal, setImportTotal] = useState(0);
  const [importItems, setImportItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [uploadFile, setUploadFile] = useState(null);

  // 持久化存储
  useEffect(() => localStorage.setItem("importId", importId), [importId]);
  useEffect(() => localStorage.setItem("importPageSize", String(importPageSize)), [importPageSize]);

  // 计算属性
  const importTotalPage = useMemo(() => Math.max(1, Math.ceil(importTotal / importPageSize)), [importTotal, importPageSize]);

  // 选择项目
  const selectItem = (item) => {
    setSelectedId(item.id);
    setEditForm({
      id: String(item.id),
      name: item.name || "",
      city: item.city || "",
      industry: item.industry || "",
      address: item.address || "",
      tags: Array.isArray(item.tags) ? item.tags.join(",") : "",
      raw_data: JSON.stringify(item.raw_data || {}, null, 2)
    });
  };

  // 根据ID选择项目
  const selectItemById = (value) => {
    const selected = importItems.find((item) => item.id === Number(value));
    if (selected) selectItem(selected);
  };

  // 清空编辑表单
  const setEditFormToEmpty = () => setEditForm(EMPTY_EDIT);

  return {
    // 状态
    importId,
    setImportId,
    importPageSize,
    setImportPageSize,
    importPage,
    setImportPage,
    importTotal,
    setImportTotal,
    importItems,
    setImportItems,
    selectedId,
    setSelectedId,
    editForm,
    setEditForm,
    uploadFile,
    setUploadFile,

    // 计算属性
    importTotalPage,

    // 方法
    selectItem,
    selectItemById,
    setEditFormToEmpty,
  };
}