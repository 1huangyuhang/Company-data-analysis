import { useEffect, useState } from "react";
import { request, AUTH_TOKEN_STORAGE_KEY } from "../../utils/api";

const AUTH_USERNAME_KEY = "auth_username";

function formatAuthError(err, apiBase) {
  const m = err?.message || "";
  if (m === "Failed to fetch" || err?.name === "TypeError") {
    let text =
      "无法连接服务器：请确认后端已在 8000 端口运行（如 backend 目录执行 uvicorn），并检查 API 地址。";
    if (import.meta.env.DEV && apiBase && apiBase.includes("127.0.0.1:8000")) {
      text += " 若仍失败，可点击顶栏「改用代理」或清空 API 地址，通过 Vite 同源转发。";
    }
    return text;
  }
  return m || "请求失败";
}

export default function AuthModal({ open, onClose, apiBase, initialTab = "login", onLoggedIn }) {
  const [tab, setTab] = useState(initialTab);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setMsg("");
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function persistSession(username, token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(AUTH_USERNAME_KEY, username);
    onLoggedIn(username);
    onClose();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMsg("");
    if (!loginUser.trim() || !loginPass) {
      setMsg("请输入用户名和密码");
      return;
    }
    setBusy(true);
    try {
      const base = apiBase.replace(/\/$/, "");
      const data = await request(`${base}/api/v1/auth/login`, {
        skipAuth: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass }),
      });
      const token = data?.data?.access_token;
      const username = data?.data?.user?.username || loginUser.trim();
      if (!token) {
        setMsg("登录响应异常，未返回 token");
        return;
      }
      setLoginPass("");
      persistSession(username, token);
    } catch (err) {
      setMsg(formatAuthError(err, apiBase));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMsg("");
    if (!regUser.trim() || !regEmail.trim() || !regPass) {
      setMsg("请填写用户名、邮箱和密码");
      return;
    }
    if (regPass !== regPass2) {
      setMsg("两次输入的密码不一致");
      return;
    }
    if (regPass.length < 6) {
      setMsg("密码至少 6 位");
      return;
    }
    setBusy(true);
    try {
      const base = apiBase.replace(/\/$/, "");
      const data = await request(`${base}/api/v1/auth/register`, {
        skipAuth: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUser.trim(),
          email: regEmail.trim(),
          password: regPass,
        }),
      });
      const token = data?.data?.access_token;
      const username = data?.data?.user?.username || regUser.trim();
      if (!token) {
        setMsg("注册成功但未返回 token，请改用「登录」");
        return;
      }
      setRegPass("");
      setRegPass2("");
      persistSession(username, token);
    } catch (err) {
      setMsg(formatAuthError(err, apiBase));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="auth-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-header">
          <h2 id="auth-modal-title" className="auth-modal-title">
            账号
          </h2>
          <button type="button" className="auth-modal-close secondary" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="auth-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={`auth-modal-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setMsg("");
            }}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={`auth-modal-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setMsg("");
            }}
          >
            注册
          </button>
        </div>

        {msg ? <div className={`auth-modal-msg ${msg.includes("成功") ? "success" : "error"}`}>{msg}</div> : null}

        {tab === "login" ? (
          <form className="auth-modal-form" onSubmit={handleLogin}>
            <div className="auth-modal-field">
              <label htmlFor="auth-login-user">用户名</label>
              <input
                id="auth-login-user"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                autoComplete="username"
                disabled={busy}
              />
            </div>
            <div className="auth-modal-field">
              <label htmlFor="auth-login-pass">密码</label>
              <input
                id="auth-login-pass"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
            <div className="auth-modal-actions">
              <button type="submit" disabled={busy}>
                {busy ? "提交中…" : "登录"}
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-modal-form" onSubmit={handleRegister}>
            <div className="auth-modal-field">
              <label htmlFor="auth-reg-user">用户名</label>
              <input
                id="auth-reg-user"
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                autoComplete="username"
                disabled={busy}
              />
            </div>
            <div className="auth-modal-field">
              <label htmlFor="auth-reg-email">邮箱</label>
              <input
                id="auth-reg-email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                disabled={busy}
              />
            </div>
            <div className="auth-modal-field">
              <label htmlFor="auth-reg-pass">密码</label>
              <input
                id="auth-reg-pass"
                type="password"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
              />
            </div>
            <div className="auth-modal-field">
              <label htmlFor="auth-reg-pass2">确认密码</label>
              <input
                id="auth-reg-pass2"
                type="password"
                value={regPass2}
                onChange={(e) => setRegPass2(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
              />
            </div>
            <p className="auth-modal-hint">注册成功后将自动登录。</p>
            <div className="auth-modal-actions">
              <button type="submit" disabled={busy}>
                {busy ? "提交中…" : "注册"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
