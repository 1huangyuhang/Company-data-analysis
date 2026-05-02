/**
 * 加载状态组件
 * 提供美观的加载动画和状态提示
 */

import { useState } from "react";

export default function LoadingSpinner({
  message = "加载中...",
  size = "medium",
  showMessage = true,
  fullScreen = false,
  className = ""
}) {
  const sizeClass = {
    small: "loading-spinner-small",
    medium: "loading-spinner-medium",
    large: "loading-spinner-large"
  }[size];

  const containerClass = fullScreen
    ? "loading-container-fullscreen"
    : "loading-container";

  return (
    <div className={`${containerClass} ${className}`}>
      <div className={`loading-spinner ${sizeClass}`}></div>
      {showMessage && <p className="loading-message">{message}</p>}
    </div>
  );
}

/**
 * 内联加载组件（用于按钮等小空间）
 */
export function InlineLoader({ size = "small", className = "" }) {
  return (
    <div className={`inline-loader ${className}`}>
      <div className={`loading-spinner ${size}-spinner`}></div>
    </div>
  );
}

/**
 * 加载状态遮罩层
 */
export function LoadingOverlay({ visible = true, message = "加载中...", children }) {
  if (!visible) return children;

  return (
    <div className="loading-overlay">
      <LoadingSpinner message={message} size="large" />
      <div className="loading-overlay-content">
        {children}
      </div>
    </div>
  );
}