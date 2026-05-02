/**
 * 空状态组件
 * 提供友好的空数据提示和引导
 */

export default function EmptyState({
  icon = "📭",
  title = "暂无数据",
  description = "请尝试其他搜索条件或导入新数据",
  action = null,
  variant = "default",
  className = ""
}) {
  const variantClass = {
    default: "empty-state-default",
    search: "empty-state-search",
    import: "empty-state-import",
    edit: "empty-state-edit"
  }[variant];

  return (
    <div className={`empty-state ${variantClass} ${className}`}>
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        {action && <div className="empty-state-action">{action}</div>}
      </div>
    </div>
  );
}

/**
 * 搜索空状态专用组件
 */
export function SearchEmptyState({ onReset }) {
  return (
    <EmptyState
      icon="🔍"
      title="没有找到匹配的企业"
      description="请尝试调整搜索条件或关键词"
      action={onReset && (
        <button type="button" className="secondary" onClick={onReset}>
          重置搜索条件
        </button>
      )}
      variant="search"
    />
  );
}

/**
 * 导入空状态专用组件
 */
export function ImportEmptyState({ onImport }) {
  return (
    <EmptyState
      icon="📊"
      title="暂无导入数据"
      description="请先导入Excel文件或输入import_id查询"
      action={onImport && (
        <button type="button" onClick={onImport}>
          导入Excel文件
        </button>
      )}
      variant="import"
    />
  );
}

/**
 * 编辑空状态专用组件
 */
export function EditEmptyState({ onSelect }) {
  return (
    <EmptyState
      icon="✏️"
      title="请先选择企业"
      description="请在上方列表选择一条记录进行编辑"
      action={onSelect && (
        <button type="button" className="secondary" onClick={onSelect}>
          查看企业列表
        </button>
      )}
      variant="edit"
    />
  );
}