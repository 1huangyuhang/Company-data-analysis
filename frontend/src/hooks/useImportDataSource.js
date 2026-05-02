import { useMemo } from "react";

/**
 * Custom hook to manage import data source
 * @param {Array} importItems - Primary import items
 * @returns {Object} Data source and related utilities
 */
export default function useImportDataSource(importItems) {
  // For now, just return importItems directly
  // Can be extended later to support filtering/selector functionality
  const dataSource = useMemo(() => importItems, [importItems]);

  return {
    dataSource
  };
}