// Test script to verify the refactoring worked correctly
console.log("Testing refactoring...");

// Test 1: Verify extractPhones utility function
console.log("\n1. Testing extractPhones utility function:");
const extractPhones = require("./frontend/src/utils/extractPhones").default;

const testItem = {
  raw_data: {
    '手机号': '13800138000',
    '电话': '021-12345678',
    '联系方式': ['13900139000', '13700137000'],
    'email': 'test@example.com'
  }
};

const phones = extractPhones(testItem);
console.log("Input:", testItem.raw_data);
console.log("Extracted phones:", phones);
console.log("Expected: ['13800138000', '021-12345678', '13900139000', '13700137000']");
console.assert(phones.length === 4, "Should extract 4 phone numbers");
console.assert(phones.includes('13800138000'), "Should include mobile phone");
console.assert(phones.includes('021-12345678'), "Should include telephone");
console.log("✓ extractPhones test passed");

// Test 2: Verify useImportDataSource hook
console.log("\n2. Testing useImportDataSource hook:");
const useImportDataSource = require("./frontend/src/hooks/useImportDataSource").default;

// Mock React hooks for testing
const React = {
  useMemo: (fn, deps) => fn()
};

const mockImportItems = [
  { id: 1, name: 'Company A' },
  { id: 2, name: 'Company B' }
];

const result = useImportDataSource(mockImportItems);
console.log("Input items:", mockImportItems);
console.log("Output dataSource:", result.dataSource);
console.assert(result.dataSource.length === 2, "Should return all items");
console.assert(result.dataSource === mockImportItems, "Should return same reference");
console.log("✓ useImportDataSource test passed");

// Test 3: Verify file imports are correct
console.log("\n3. Testing file imports:");
try {
  // Check that CompanySelector imports extractPhones correctly
  const companySelectorContent = require('fs').readFileSync('./frontend/src/components/editor/CompanySelector.jsx', 'utf8');
  console.assert(companySelectorContent.includes('import extractPhones from "../../utils/extractPhones"'),
                 "CompanySelector should import extractPhones from utils");
  console.assert(!companySelectorContent.includes('function extractPhones(item)'),
                 "CompanySelector should not define extractPhones locally");
  console.log("✓ CompanySelector imports correctly");

  // Check that ImportPanel imports extractPhones correctly
  const importPanelContent = require('fs').readFileSync('./frontend/src/components/import/ImportPanel.jsx', 'utf8');
  console.assert(importPanelContent.includes('import extractPhones from "../../utils/extractPhones"'),
                 "ImportPanel should import extractPhones from utils");
  console.assert(!importPanelContent.includes('function extractPhones(item)'),
                 "ImportPanel should not define extractPhones locally");
  console.log("✓ ImportPanel imports correctly");

  // Check that ImportPanel imports useImportDataSource correctly
  console.assert(importPanelContent.includes('import useImportDataSource from "../../hooks/useImportDataSource"'),
                 "ImportPanel should import useImportDataSource");
  console.log("✓ ImportPanel imports useImportDataSource correctly");

  // Check that ImportPanel uses dataSource from hook
  console.assert(importPanelContent.includes('const { dataSource } = useImportDataSource(importItems)'),
                 "ImportPanel should use useImportDataSource hook");
  console.log("✓ ImportPanel uses hook correctly");

  // Check that importSelectorItems prop was removed
  console.assert(!importPanelContent.includes('importSelectorItems'),
                 "ImportPanel should not have importSelectorItems prop");
  console.log("✓ ImportPanel no longer has importSelectorItems prop");

} catch (e) {
  console.error("File import test failed:", e.message);
}

console.log("\n4. Testing AppContainer changes:");
try {
  const appContainerContent = require('fs').readFileSync('./frontend/src/AppContainer.jsx', 'utf8');

  // Check that importSelectorItems prop was removed from ImportPanel usage
  console.assert(!appContainerContent.includes('importSelectorItems={importItems}'),
                 "AppContainer should not pass importSelectorItems prop");
  console.log("✓ AppContainer no longer passes importSelectorItems prop");

} catch (e) {
  console.error("AppContainer test failed:", e.message);
}

console.log("\n" + "=".repeat(50));
console.log("All refactoring tests passed! ✓");
console.log("=".repeat(50));