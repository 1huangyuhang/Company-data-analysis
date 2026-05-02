#!/bin/bash

echo "==================================="
echo "API Optimization Verification Script"
echo "==================================="
echo

# Test 1: Verify API utility function
echo "1. Verifying API utility function..."
if [ -f "frontend/src/utils/api.js" ]; then
    echo "✓ api.js file exists"
else
    echo "✗ api.js file NOT found"
    exit 1
fi

# Check API_PATHS structure
if grep -q "API_PATHS = {" "frontend/src/utils/api.js"; then
    echo "✓ API_PATHS object exists"
else
    echo "✗ API_PATHS object NOT found"
    exit 1
fi

# Check resource-oriented paths
if grep -q "imports: {" "frontend/src/utils/api.js"; then
    echo "✓ Imports resource path exists"
else
    echo "✗ Imports resource path NOT found"
    exit 1
fi

if grep -q "companies: {" "frontend/src/utils/api.js"; then
    echo "✓ Companies resource path exists"
else
    echo "✗ Companies resource path NOT found"
    exit 1
fi
echo

# Test 2: Verify useApi hook
echo "2. Verifying useApi hook..."
if [ -f "frontend/src/hooks/useApi.js" ]; then
    echo "✓ useApi.js file exists"
else
    echo "✗ useApi.js file NOT found"
    exit 1
fi

# Check hook functions
if grep -q "queryImport" "frontend/src/hooks/useApi.js"; then
    echo "✓ queryImport function exists in hook"
else
    echo "✗ queryImport function NOT found in hook"
    exit 1
fi

if grep -q "createImport" "frontend/src/hooks/useApi.js"; then
    echo "✓ createImport function exists in hook"
else
    echo "✗ createImport function NOT found in hook"
    exit 1
fi

if grep -q "searchCompanies" "frontend/src/hooks/useApi.js"; then
    echo "✓ searchCompanies function exists in hook"
else
    echo "✗ searchCompanies function NOT found in hook"
    exit 1
fi

if grep -q "updateCompany" "frontend/src/hooks/useApi.js"; then
    echo "✓ updateCompany function exists in hook"
else
    echo "✗ updateCompany function NOT found in hook"
    exit 1
fi
echo

# Test 3: Verify AppContainer uses useApi hook
echo "3. Verifying AppContainer uses useApi hook..."
if grep -q "import { useApi }" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer imports useApi hook"
else
    echo "✗ AppContainer does NOT import useApi hook"
    exit 1
fi

if grep -q "const { queryImport: apiQueryImport, createImport, searchCompanies, updateCompany } = useApi(apiBase)" "frontend/src/AppContainer.jsx"; then
    echo "✓ AppContainer uses useApi hook correctly"
else
    echo "✗ AppContainer does NOT use useApi hook correctly"
    exit 1
fi
echo

# Test 4: Verify API calls updated in AppContainer
echo "4. Verifying API calls updated in AppContainer..."
if grep -q "await apiQueryImport(importId, page, importPageSize)" "frontend/src/AppContainer.jsx"; then
    echo "✓ queryImport call updated to use hook"
else
    echo "✗ queryImport call NOT updated to use hook"
    exit 1
fi

if grep -q "await createImport(uploadFile)" "frontend/src/AppContainer.jsx"; then
    echo "✓ createImport call updated to use hook"
else
    echo "✗ createImport call NOT updated to use hook"
    exit 1
fi

if grep -q "await updateCompany(selectedId" "frontend/src/AppContainer.jsx"; then
    echo "✓ updateCompany call updated to use hook"
else
    echo "✗ updateCompany call NOT updated to use hook"
    exit 1
fi

if grep -q "await searchCompanies(searchParams)" "frontend/src/AppContainer.jsx"; then
    echo "✓ searchCompanies call updated to use hook"
else
    echo "✗ searchCompanies call NOT updated to use hook"
    exit 1
fi
echo

# Test 5: Verify old request calls removed
echo "5. Verifying old request calls removed..."
if ! grep -q "async function request" "frontend/src/AppContainer.jsx"; then
    echo "✓ Old request function removed from AppContainer"
else
    echo "✗ Old request function still exists in AppContainer"
    exit 1
fi

if ! grep -q '/api/v1/companies/by-import/' "frontend/src/AppContainer.jsx"; then
    echo "✓ Old by-import API path removed"
else
    echo "✗ Old by-import API path still exists"
    exit 1
fi

if ! grep -q '/api/v1/import/excel' "frontend/src/AppContainer.jsx"; then
    echo "✓ Old import/excel API path removed"
else
    echo "✗ Old import/excel API path still exists"
    exit 1
fi
echo

# Test 6: Verify error handling
echo "6. Verifying error handling..."
if grep -q "try {" "frontend/src/utils/api.js" && grep -q "catch (error)" "frontend/src/utils/api.js"; then
    echo "✓ Error handling added to API utility"
else
    echo "✗ Error handling NOT added to API utility"
    exit 1
fi

if grep -q "console.error" "frontend/src/utils/api.js"; then
    echo "✓ Error logging added to API utility"
else
    echo "✗ Error logging NOT added to API utility"
    exit 1
fi
echo

echo "==================================="
echo "All API optimization tests passed! ✓"
echo "==================================="
echo
echo "Summary of API optimization changes:"
echo "1. ✓ Resource-oriented API paths implemented"
echo "2. ✓ useApi hook created for unified API management"
echo "3. ✓ AppContainer updated to use custom hook"
echo "4. ✓ All API calls updated to use hook functions"
echo "5. ✓ Old API request patterns removed"
echo "6. ✓ Enhanced error handling implemented"
echo
echo "API design has been successfully optimized to resource-oriented pattern!"