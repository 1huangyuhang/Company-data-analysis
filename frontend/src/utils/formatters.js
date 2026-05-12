/**
 * 数据格式化工具函数
 */

/** 表格列展示：一次 Excel 上传对应一个系统编号（仍以 imp_ 开头便于与后端一致） */
export function formatImportIdForDisplay(id) {
  if (id == null || String(id).trim() === "") return "—";
  return String(id).trim();
}

export function formatDisplayCode(item, index, page, pageSize, importIdForFallback = "") {
  const importToken = (item.import_id || importIdForFallback || "").replace(/^imp_/i, "").slice(-4).toUpperCase() || "GEN";
  if (item.source_row) return `${importToken}-${String(item.source_row).padStart(4, "0")}`;
  return `${importToken}-N${String((page - 1) * pageSize + index + 1).padStart(4, "0")}`;
}

export function parseCsvInput(value) {
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}

export function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function renderCell(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function extractPhones(item) {
  const raw = item?.raw_data || {};
  const values = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!/(手机|电话|联系方式|phone|mobile|tel)/i.test(String(key))) continue;
    if (Array.isArray(value)) values.push(...value);
    else values.push(value);
  }
  return [...new Set(values.map((x) => String(x ?? "").trim()).filter(Boolean))];
}