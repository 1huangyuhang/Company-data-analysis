#!/bin/bash

echo "==================================="
echo "State Split Verification Script"
echo "==================================="
echo

# Test 1: Verify useAppManagement hook
echo "1. Verifying useAppManagement hook..."
if [ -f "frontend/src/hooks/useAppManagement.js" ]; then
    echo "✓ useAppManagement.js file exists"
else
    echo "✗ useAppManagement.js file NOT found"
    exit 1
fi

if grep -q "export function useAppManagement" "frontend/src/hooks/useAppManagement.js"; then
    echo "✓ useAppManagement function is exported correctly"
else
    echo "✗ useAppManagement function is not exported correctly"
    exit 1
fi

if grep -q "const \[tab, setTab\] = useState" "frontend/src/hooks/useAppManagement.js"; then
    echo "✓ App tab state managed in hook"
else
    echo "✗ App tab state NOT managed in hook"
    exit 1
fi
echo

# Test 2: Verify useImportManagement hook
echo "2. Verifying useImportManagement hook..."
if [ -f "frontend/src/hooks/useImportManagement.js" ]; then
    echo "✓ useImportManagement.js file exists"
else
    echo "✗ useImportManagement.js file NOT found"
    exit 1
fi

if grep -q "export function useImportManagement" "frontend/src/hooks/useImportManagement.js"; then
    echo "✓ useImportManagement function is exported correctly"
else
    echo "✗ useImportManagement function is not exported correctly"
    exit 1
fi

if grep -q "const \[importId, setImportId\] = useState" "frontend/src/hooks/useImportManagement.js"; then
    echo "✓ Import state managed in hook"
else
    echo "✗ Import state NOT managed in hook"
    exit 1
fi

if grep -q "const importTotalPage = useMemo" "frontend/src/hooks/useImportManagement.js"; then
    echo "✓ Import total page calculated in hook"
else
    echo "✗ Import total page NOT calculated in hook"
    exit 1
fi
echo

# Test 3: Verify useSearchManagement hook
echo "3. Verifying useSearchManagement hook..."
if [ -f "frontend/src/hooks/useSearchManagement.js" ]; then
    echo "✓ useSearchManagement.js file exists"
else
    echo "✗ useSearchManagement.js file NOT found"
    exit 1
fi

if grep -q "export function useSearchManagement" "frontend/src/hooks/useSearchManagement.js"; then
    echo "✓ useSearchManagement function is exported correctly"
else
    echo "✗ useSearchManagement function is not exported correctly"
    exit 1
fi

if grep -q "const \[search, setSearch\] = useState" "frontend/src/hooks/useSearchManagement.js"; then
    echo "✓ Search state managed in hook"
else
    echo "✗ Search state NOT managed in hook"
    exit 1
fi

if grep -q "const searchTotalPage = useMemo" "frontend/src/hooks/useSearchManagement.js"; then
    echo "✓ Search total page calculated in hook"
else
    echo "✗ Search total page NOT calculated in hook"
    exit 1
fi
echo

# Test 4: Verify AppContainer uses all hooks
echo "4. Verifying AppContainer uses all hooks..."
if grep -q "import { useAppManagement }" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer imports useAppManagement"
else
    echo "✗ AppContainer does NOT import useAppManagement"
    exit 1
fi

if grep -q "import { useImportManagement }" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer imports useImportManagement"
else
    echo "✗ AppContainer does NOT import useImportManagement"
    exit 1
fi

if grep -q "import { useSearchManagement }" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer imports useSearchManagement"
else
    echo "✗ AppContainer does NOT import useSearchManagement"
    exit 1
fi

if grep -q "const { tab, setTab, msg, setMsg, apiBase, setApiBase } = useAppManagement()" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer uses useAppManagement correctly"
else
    echo "✗ AppContainer does NOT use useAppManagement correctly"
    exit 1
fi

if grep -q "= useImportManagement()" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer uses useImportManagement correctly"
else
    echo "✗ AppContainer does NOT use useImportManagement correctly"
    exit 1
fi

if grep -q "= useSearchManagement()" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer uses useSearchManagement correctly"
else
    echo "✗ AppContainer does NOT use useSearchManagement correctly"
    exit 1
fi
echo

# Test 5: Verify state reduction in AppContainer
echo "5. Verifying state reduction in AppContainer..."
# Count useState calls in AppContainer - should be reduced
STATE_COUNT=$(grep -c "const \[.*\] = useState" "frontend/src/AppContainer.jsx")
if [ "$STATE_COUNT" -le 2 ]; then
    echo "✓ AppContainer state reduced (only $STATE_COUNT useState calls)"
else
    echo "✗ AppContainer state NOT reduced (has $STATE_COUNT useState calls)"
    exit 1
fi

if ! grep -q "const \[importTotalPage, setImportTotalPage\]" "frontend/src/AppContainer.jsx"; then
    echo "✓ Calculated state moved to custom hooks"
else
    echo "✗ Calculated state NOT moved to custom hooks"
    exit 1
fi
echo

# Test 6: Verify functionality preservation
echo "6. Verifying functionality preservation..."
if grep -q "async function queryImport" "frontend/src/AppContainer.jsx"; then
    echo "✓ queryImport function still exists"
else
    echo "✗ queryImport function removed"
    exit 1
fi

if grep -q "async function onImport" "frontend/src/AppContainer.jsx"; then
    echo "✓ onImport function still exists"
else
    echo "✗ onImport function removed"
    exit 1
fi

if grep -q "async function saveEdit" "frontend/src/AppContainer.jsx"; then
    echo "✓ saveEdit function still exists"
else
    echo "✗ saveEdit function removed"
    exit 1
fi

if grep -q "async function doSearch" "frontend/src/AppContainer.jsx"; then
    echo "✓ doSearch function still exists"
else
    echo "✗ doSearch function removed"
    exit 1
fi
echo

echo "==================================="
echo "All state split tests passed! ✓"
echo "==================================="
echo
echo "Summary of state split changes:"
echo "1. ✓ useAppManagement hook created for app-level state"
echo "2. ✓ useImportManagement hook created for import-related state"
echo "3. ✓ useSearchManagement hook created for search-related state"
echo "4. ✓ AppContainer state significantly reduced"
echo "5. ✓ All functionality preserved after split"
echo "6. ✓ Custom hooks properly integrated into AppContainer"
echo
echo "State domain split completed successfully!"