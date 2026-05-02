#!/bin/bash

echo "==================================="
echo "Refactoring Verification Script"
echo "==================================="
echo

# Test 1: Verify extractPhones utility function exists
echo "1. Verifying extractPhones utility function..."
if [ -f "frontend/src/utils/extractPhones.js" ]; then
    echo "✓ extractPhones.js file exists"
else
    echo "✗ extractPhones.js file NOT found"
    exit 1
fi

# Check content
if grep -q "export default function extractPhones" "frontend/src/utils/extractPhones.js"; then
    echo "✓ extractPhones function is exported correctly"
else
    echo "✗ extractPhones function is not exported correctly"
    exit 1
fi
echo

# Test 2: Verify useImportDataSource hook exists
echo "2. Verifying useImportDataSource hook..."
if [ -f "frontend/src/hooks/useImportDataSource.js" ]; then
    echo "✓ useImportDataSource.js file exists"
else
    echo "✗ useImportDataSource.js file NOT found"
    exit 1
fi

# Check content
if grep -q "export default function useImportDataSource" "frontend/src/hooks/useImportDataSource.js"; then
    echo "✓ useImportDataSource function is exported correctly"
else
    echo "✗ useImportDataSource function is not exported correctly"
    exit 1
fi
echo

# Test 3: Verify CompanySelector imports extractPhones correctly
echo "3. Verifying CompanySelector component..."
if grep -q 'import extractPhones from "../../utils/extractPhones"' "frontend/src/components/editor/CompanySelector.jsx"; then
    echo "✓ CompanySelector imports extractPhones from utils"
else
    echo "✗ CompanySelector does NOT import extractPhones correctly"
    exit 1
fi

if ! grep -q "function extractPhones" "frontend/src/components/editor/CompanySelector.jsx"; then
    echo "✓ CompanySelector does NOT have duplicate extractPhones function"
else
    echo "✗ CompanySelector still has duplicate extractPhones function"
    exit 1
fi
echo

# Test 4: Verify ImportPanel imports extractPhones correctly
echo "4. Verifying ImportPanel component..."
if grep -q 'import extractPhones from "../../utils/extractPhones"' "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ ImportPanel imports extractPhones from utils"
else
    echo "✗ ImportPanel does NOT import extractPhones correctly"
    exit 1
fi

if ! grep -q "function extractPhones" "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ ImportPanel does NOT have duplicate extractPhones function"
else
    echo "✗ ImportPanel still has duplicate extractPhones function"
    exit 1
fi

# Check useImportDataSource import
if grep -q 'import useImportDataSource from "../../hooks/useImportDataSource"' "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ ImportPanel imports useImportDataSource hook"
else
    echo "✗ ImportPanel does NOT import useImportDataSource correctly"
    exit 1
fi
echo

# Test 5: Verify data source logic refactoring
echo "5. Verifying data source refactoring..."
if grep -q "const { dataSource } = useImportDataSource(importItems)" "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ ImportPanel uses useImportDataSource hook for data source"
else
    echo "✗ ImportPanel does NOT use useImportDataSource hook correctly"
    exit 1
fi

# Check that dataSource is used instead of inline conditional
if grep -q "items={dataSource}" "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ ImportPanel uses dataSource from hook for CompanySelector"
else
    echo "✗ ImportPanel does NOT use dataSource for CompanySelector"
    exit 1
fi
echo

# Test 6: Verify prop removal
echo "6. Verifying prop removal..."
if ! grep -q "importSelectorItems" "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ importSelectorItems prop has been removed from ImportPanel"
else
    echo "✗ importSelectorItems prop still exists in ImportPanel"
    exit 1
fi

if ! grep -q "importSelectorItems={importItems}" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer no longer passes importSelectorItems prop"
else
    echo "✗ AppContainer still passes importSelectorItems prop"
    exit 1
fi
echo

# Test 7: Verify import path fixes
echo "7. Verifying import path fixes..."
if grep -q 'import CompanySelector from "../editor/CompanySelector"' "frontend/src/components/import/ImportPanel.jsx"; then
    echo "✓ ImportPanel has correct import path for CompanySelector"
else
    echo "✗ ImportPanel has incorrect import path for CompanySelector"
    exit 1
fi
echo

echo "==================================="
echo "All verification tests passed! ✓"
echo "==================================="
echo
echo "Summary of refactoring changes:"
echo "1. ✓ extractPhones function extracted to utils/extractPhones.js"
echo "2. ✓ useImportDataSource hook created for data source management"
echo "3. ✓ ImportPanel refactored to use custom hook"
echo "4. ✓ Duplicate extractPhones functions removed from components"
echo "5. ✓ importSelectorItems prop removed to simplify data flow"
echo "6. ✓ Inline conditional logic replaced with hook usage"
echo "7. ✓ Import paths corrected"
echo
echo "Component coupling has been successfully reduced!"
exit 0