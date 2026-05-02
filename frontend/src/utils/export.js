/**
 * 数据导出工具函数
 */

/**
 * 将数据转换为CSV格式
 * @param {Array} data - 要导出的数据数组
 * @param {Array} columns - 列定义 [{key: 'name', label: '企业名称'}, ...]
 * @returns {string} CSV字符串
 */
export function convertToCSV(data, columns) {
  if (!data || data.length === 0) return '';

  // 创建CSV头部
  const headers = columns.map(col => col.label).join(',');

  // 创建CSV行
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key] ?? '';
      // 处理包含逗号或引号的情况
      if (String(value).includes(',') || String(value).includes('"')) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} contentType - 文件类型
 */
export function downloadFile(content, filename, contentType = 'text/csv') {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 导出为CSV文件
 * @param {Array} data - 要导出的数据
 * @param {Array} columns - 列定义
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToCSV(data, columns, filename = 'export') {
  const csvContent = convertToCSV(data, columns);
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
}

/**
 * 导出为Excel文件（简单实现，实际项目建议使用xlsx库）
 * @param {Array} data - 要导出的数据
 * @param {Array} columns - 列定义
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToExcel(data, columns, filename = 'export') {
  // 简化的Excel导出，实际项目建议使用专业的xlsx库
  const csvContent = convertToCSV(data, columns);
  downloadFile(csvContent, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

/**
 * 获取搜索结果的所有数据（用于导出完整数据集）
 * @param {Function} doSearch - 搜索函数
 * @param {Object} searchParams - 搜索参数
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} 完整的数据集
 */
export async function getAllSearchResults(doSearch, searchParams, onProgress = () => {}) {
  const allResults = [];
  let currentPage = 1;
  let totalPages = 1;
  const pageSize = 100; // 每页获取较多数据

  do {
    onProgress({ page: currentPage, totalPages, percent: Math.min(100, Math.round((currentPage / totalPages) * 100)) });

    const results = await doSearch(currentPage, pageSize);
    allResults.push(...results.items);

    totalPages = results.total_pages || Math.ceil(results.total / pageSize);
    currentPage++;
  } while (currentPage <= totalPages && allResults.length < 10000); // 限制最大导出数量

  return allResults;
}

/**
 * 格式化数据用于导出
 * @param {Array} items - 企业数据
 * @param {Object} formatDisplayCode - 编号格式化函数
 * @returns {Array} 格式化后的数据
 */
export function formatExportData(items, formatDisplayCode) {
  return items.map((item, index) => ({
    '编号': formatDisplayCode(item, index, 1, items.length),
    '企业名称': item.name || '',
    '城市': item.city || '',
    '行业': item.industry || '',
    '地址': item.address || '',
    '标签': Array.isArray(item.tags) ? item.tags.join('; ') : '',
    '导入批次': item.import_id || '',
    '源行号': item.source_row || '',
    '创建时间': item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '',
    '更新时间': item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '',
    '企业ID': item.id,
    // 展开raw_data中的常用字段
    ...Object.entries(item.raw_data || {}).reduce((acc, [key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        acc[key] = value;
      } else if (Array.isArray(value)) {
        acc[key] = value.join('; ');
      }
      return acc;
    }, {})
  }));
}

/**
 * 预设的导出列配置
 */
export const EXPORT_COLUMNS = {
  basic: [
    { key: '编号', label: '编号' },
    { key: '企业名称', label: '企业名称' },
    { key: '城市', label: '城市' },
    { key: '行业', label: '行业' },
    { key: '地址', label: '地址' },
    { key: '标签', label: '标签' },
    { key: '导入批次', label: '导入批次' },
    { key: '创建时间', label: '创建时间' },
  ],

  detailed: [
    { key: '编号', label: '编号' },
    { key: '企业名称', label: '企业名称' },
    { key: '城市', label: '城市' },
    { key: '行业', label: '行业' },
    { key: '地址', label: '地址' },
    { key: '标签', label: '标签' },
    { key: '导入批次', label: '导入批次' },
    { key: '源行号', label: '源行号' },
    { key: '企业ID', label: '企业ID' },
    { key: '创建时间', label: '创建时间' },
    { key: '更新时间', label: '更新时间' },
  ],

  full: [
    { key: '编号', label: '编号' },
    { key: '企业名称', label: '企业名称' },
    { key: '城市', label: '城市' },
    { key: '行业', label: '行业' },
    { key: '地址', label: '地址' },
    { key: '标签', label: '标签' },
    { key: '导入批次', label: '导入批次' },
    { key: '源行号', label: '源行号' },
    { key: '企业ID', label: '企业ID' },
    { key: '创建时间', label: '创建时间' },
    { key: '更新时间', label: '更新时间' },
    // 其他字段在formatExportData中动态添加
  ]
};

/**
 * 导出类型配置
 */
export const EXPORT_TYPES = {
  csv: {
    label: 'CSV 文件',
    icon: '📄',
    handler: exportToCSV,
    contentType: 'text/csv;charset=utf-8'
  },
  excel: {
    label: 'Excel 文件',
    icon: '📊',
    handler: exportToExcel,
    contentType: 'application/vnd.ms-excel;charset=utf-8'
  }
};