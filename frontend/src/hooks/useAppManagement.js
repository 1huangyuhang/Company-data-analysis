import { useState, useEffect } from "react";

/**
 * 应用管理自定义Hook
 * 管理应用级别的状态和逻辑
 */
export function useAppManagement() {
  // 应用状态
  const [tab, setTab] = useState("import");
  const [msg, setMsg] = useState({ text: "前端已就绪，请先导入 Excel 或直接检索。", error: false });
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("apiBase") || "http://127.0.0.1:8000");

  // 持久化存储
  useEffect(() => localStorage.setItem("apiBase", apiBase), [apiBase]);

  // 显示消息
  const showMessage = (text, error = false) => {
    setMsg({ text, error });
  };

  // 清除消息
  const clearMessage = () => {
    setMsg({ text: "前端已就绪，请先导入 Excel 或直接检索。", error: false });
  };

  // 切换到导入标签
  const switchToImport = () => {
    setTab("import");
  };

  // 切换到搜索标签
  const switchToSearch = () => {
    setTab("search");
  };

  // 切换到概览标签
  const switchToOverview = () => {
    setTab("overview");
  };

  return {
    // 状态
    tab,
    setTab,
    msg,
    setMsg,
    apiBase,
    setApiBase,

    // 方法
    showMessage,
    clearMessage,
    switchToImport,
    switchToSearch,
    switchToOverview,
  };
}