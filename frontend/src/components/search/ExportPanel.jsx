import { useState } from "react";
import { EXPORT_COLUMNS, EXPORT_TYPES, exportToCSV, formatExportData } from "../../utils/export";

const ExportPanel = ({ search, setSearch, doSearch, formatDisplayCode, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ page: 0, totalPages: 0, percent: 0 });
  const [config, setConfig] = useState({
    type: 'csv',
    columns: 'detailed',
    includeRawData: false,
    filename: `企业数据_${new Date().toLocaleDateString('zh-CN')}`
  });

  const handleExport = async () => {
    setExporting(true);
    setProgress({ page: 0, totalPages: 0, percent: 0 });

    try {
      // 1. 获取完整数据
      const allData = await getAllData();
      if (!allData.length) {
        alert('没有数据可导出');
        return;
      }

      // 2. 格式化数据
      const formattedData = formatExportData(allData, formatDisplayCode);

      // 3. 选择列
      const columns = getSelectedColumns(formattedData[0]);

      // 4. 导出文件
      const exportType = EXPORT_TYPES[config.type];
      exportType.handler(formattedData, columns, config.filename);

      alert(`导出成功！共导出 ${allData.length} 条数据`);
      onClose();
    } catch (error) {
      alert(`导出失败：${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getAllData = async () => {
    // 保存当前搜索状态
    const originalPage = search.page;
    const originalPageSize = search.page_size;

    const allResults = [];
    let currentPage = 1;
    let totalPages = 1;
    const pageSize = 100;

    try {
      do {
        setProgress(prev => ({
          ...prev,
          page: currentPage,
          percent: Math.min(100, Math.round((currentPage / totalPages) * 100))
        }));

        const pageData = await doSearch(currentPage, pageSize);
        if (!pageData) break;
        totalPages = Math.max(1, Math.ceil(pageData.total / pageSize));
        if (!pageData.items?.length) break;
        allResults.push(...pageData.items);

        currentPage++;
      } while (currentPage <= totalPages && allResults.length < 10000);
    } finally {
      // 恢复原始搜索状态
      setSearch(prev => ({
        ...prev,
        page: originalPage,
        page_size: originalPageSize
      }));
    }

    setProgress(prev => ({ ...prev, totalPages }));
    return allResults;
  };

  const getSelectedColumns = (sampleRow) => {
    const baseColumns = EXPORT_COLUMNS[config.columns] || EXPORT_COLUMNS.detailed;

    if (config.includeRawData) {
      // 获取raw_data中的所有字段
      const rawDataKeys = Object.keys(sampleRow).filter(key =>
        !baseColumns.some(col => col.key === key)
      );
      const rawDataColumns = rawDataKeys.map(key => ({ key, label: key }));
      return [...baseColumns, ...rawDataColumns];
    }

    return baseColumns;
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="export-panel">
      <div className="export-header">
        <h3>数据导出</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="export-content">
        {/* 导出类型选择 */}
        <div className="export-section">
          <h4>选择导出格式</h4>
          <div className="export-type-options">
            {Object.entries(EXPORT_TYPES).map(([key, type]) => (
              <label key={key} className={`export-type ${config.type === key ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value={key}
                  checked={config.type === key}
                  onChange={(e) => updateConfig('type', e.target.value)}
                />
                <span className="export-type-icon">{type.icon}</span>
                <span className="export-type-label">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 列选择 */}
        <div className="export-section">
          <h4>选择导出字段</h4>
          <div className="column-options">
            {Object.entries(EXPORT_COLUMNS).map(([key, columns]) => (
              <label key={key} className={`column-option ${config.columns === key ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value={key}
                  checked={config.columns === key}
                  onChange={(e) => updateConfig('columns', e.target.value)}
                />
                <span className="column-option-label">
                  {key === 'basic' && '基础字段'}
                  {key === 'detailed' && '详细字段'}
                  {key === 'full' && '全部字段'}
                </span>
                <span className="column-count">({columns.length}列)</span>
              </label>
            ))}
          </div>
          <div className="include-raw-data">
            <label>
              <input
                type="checkbox"
                checked={config.includeRawData}
                onChange={(e) => updateConfig('includeRawData', e.target.checked)}
              />
              包含原始数据字段
            </label>
          </div>
        </div>

        {/* 文件名设置 */}
        <div className="export-section">
          <h4>文件名</h4>
          <input
            type="text"
            value={config.filename}
            onChange={(e) => updateConfig('filename', e.target.value)}
            placeholder="输入文件名"
          />
        </div>

        {/* 导出进度 */}
        {exporting && (
          <div className="export-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.percent}%` }}></div>
            </div>
            <div className="progress-text">
              正在导出第 {progress.page} 页，共 {progress.totalPages} 页
            </div>
          </div>
        )}
      </div>

      <div className="export-actions">
        <button
          className="secondary"
          onClick={onClose}
          disabled={exporting}
        >
          取消
        </button>
        <button
          className="primary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '导出中...' : '开始导出'}
        </button>
      </div>
    </div>
  );
};

// 样式
const styles = `
.export-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.export-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f5f5f5;
}

.export-content {
  padding: 20px;
}

.export-section {
  margin-bottom: 24px;
}

.export-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.export-type-options {
  display: flex;
  gap: 16px;
}

.export-type {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.export-type.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.export-type input {
  margin: 0;
}

.export-type-icon {
  font-size: 16px;
}

.column-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
}

.column-option.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.column-count {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.include-raw-data {
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.include-raw-data label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.export-progress {
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s;
}

.progress-text {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
}

.export-actions button {
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-size: 14px;
}

.export-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-actions button.primary {
  background: #1890ff;
  color: white;
}

.export-actions button.primary:hover:not(:disabled) {
  background: #096dd9;
}

.export-actions button.secondary {
  background: #f5f5f5;
  color: #666;
}

.export-actions button.secondary:hover:not(:disabled) {
  background: #e8e8e8;
}

/* 遮罩层 */
.export-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
}
`;

// 动态添加样式
if (!document.getElementById('export-panel-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'export-panel-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ExportPanel;