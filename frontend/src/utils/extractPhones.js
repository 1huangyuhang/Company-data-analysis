/**
 * Extract phone numbers from raw_data object
 * @param {Object} item - Company data item with raw_data property
 * @returns {Array<string>} Unique array of phone numbers
 */
export default function extractPhones(item) {
  const raw = item?.raw_data || {};
  const values = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!/(手机|电话|联系方式|phone|mobile|tel)/i.test(String(key))) continue;
    if (Array.isArray(value)) values.push(...value);
    else values.push(value);
  }
  return [...new Set(values.map((x) => String(x ?? "").trim()).filter(Boolean))];
}