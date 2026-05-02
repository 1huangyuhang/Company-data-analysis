import { useEffect, useState } from "react";
import { AUTH_TOKEN_STORAGE_KEY } from "../../utils/api";
import AuthModal from "./AuthModal";

const AUTH_USERNAME_KEY = "auth_username";

export default function Topbar({ apiBase, setApiBase }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState("login");
  const [loggedInAs, setLoggedInAs] = useState(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ? localStorage.getItem(AUTH_USERNAME_KEY) || "已登录" : "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      const hasToken = !!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      setLoggedInAs(hasToken ? localStorage.getItem(AUTH_USERNAME_KEY) || "已登录" : "");
    } catch {
      setLoggedInAs("");
    }
  }, []);

  useEffect(() => {
    const onOpenAuth = (e) => {
      const tab = e.detail?.tab === "register" ? "register" : "login";
      setAuthInitialTab(tab);
      setAuthOpen(true);
    };
    window.addEventListener("open-auth-modal", onOpenAuth);
    return () => window.removeEventListener("open-auth-modal", onOpenAuth);
  }, []);

  function openLogin() {
    setAuthInitialTab("login");
    setAuthOpen(true);
  }

  function openRegister() {
    setAuthInitialTab("register");
    setAuthOpen(true);
  }

  function handleLogout() {
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USERNAME_KEY);
    } catch {
      /* ignore */
    }
    setLoggedInAs("");
  }

  function handleLoggedIn(username) {
    setLoggedInAs(username);
  }

  return (
    <header className="topbar">
      <h1>企业数据智能管理检索系统</h1>
      <div className="topbar-actions">
        <div className="api-config">
          <label htmlFor="topbar-api-base">API 地址</label>
          <input
            id="topbar-api-base"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder={import.meta.env.DEV ? "留空 = 同页代理到 :8000" : "http://127.0.0.1:8000"}
            title="开发时留空可走 Vite 代理，避免跨域；或直接填后端完整地址"
          />
          {import.meta.env.DEV ? (
            <button type="button" className="secondary api-config-proxy-btn" onClick={() => setApiBase("")} title="请求发往当前页面端口，由 Vite 转发到 127.0.0.1:8000">
              改用代理
            </button>
          ) : null}
        </div>
        <div className="topbar-auth-row">
          {loggedInAs ? (
            <>
              <span className="topbar-auth-user">{loggedInAs}</span>
              <button type="button" className="secondary" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <>
              <button type="button" className="secondary" onClick={openLogin}>
                登录
              </button>
              <button type="button" className="secondary" onClick={openRegister}>
                注册
              </button>
            </>
          )}
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        apiBase={apiBase}
        initialTab={authInitialTab}
        onLoggedIn={handleLoggedIn}
      />
    </header>
  );
}
