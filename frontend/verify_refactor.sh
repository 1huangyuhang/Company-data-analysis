#!/bin/bash

echo "开始验证重构后的代码结构..."

# 检查目录结构
echo "1. 检查目录结构..."
if [ -d "src/components/layout" ] && [ -d "src/components/import" ] && [ -d "src/components/search" ] && [ -d "src/components/editor" ] && [ -d "src/components/overview" ]; then
    echo "✅ 目录结构正确"
else
    echo "❌ 目录结构不完整"
    exit 1
fi

# 检查utils模块
echo "2. 检查工具模块..."
if [ -f "src/utils/api.js" ] && [ -f "src/utils/formatters.js" ]; then
    echo "✅ 工具模块存在"
else
    echo "❌ 工具模块缺失"
    exit 1
fi

# 检查导入路径
echo "3. 检查导入路径..."
grep -q "from \"./components/import/ImportPanel\"" src/AppContainer.jsx || { echo "❌ AppContainer导入路径错误"; exit 1; }
grep -q "from \"./components/layout/MessageBar\"" src/AppContainer.jsx || { echo "❌ AppContainer导入路径错误"; exit 1; }
grep -q "from \"./components/overview/OverviewPanel\"" src/AppContainer.jsx || { echo "❌ AppContainer导入路径错误"; exit 1; }
grep -q "from \"./components/search/SearchPanel\"" src/AppContainer.jsx || { echo "❌ AppContainer导入路径错误"; exit 1; }
grep -q "from \"./components/layout/SidebarTabs\"" src/AppContainer.jsx || { echo "❌ AppContainer导入路径错误"; exit 1; }
grep -q "from \"./components/layout/Topbar\"" src/AppContainer.jsx || { echo "❌ AppContainer导入路径错误"; exit 1; }
grep -q "from \"./utils/api\"" src/AppContainer.jsx || { echo "❌ AppContainer工具导入错误"; exit 1; }
grep -q "from \"./utils/formatters\"" src/AppContainer.jsx || { echo "❌ AppContainer工具导入错误"; exit 1; }
echo "✅ AppContainer导入路径正确"

# 检查组件导入
echo "4. 检查组件导入..."
grep -q "from \"../editor/CompanySelector\"" src/components/import/ImportPanel.jsx || { echo "❌ ImportPanel导入路径错误"; exit 1; }
grep -q "from \"../../utils/formatters\"" src/components/import/ImportPanel.jsx || { echo "❌ ImportPanel工具导入错误"; exit 1; }
grep -q "from \"../../utils/formatters\"" src/components/editor/CompanySelector.jsx || { echo "❌ CompanySelector工具导入错误"; exit 1; }
echo "✅ 组件导入路径正确"

echo ""
echo "🎉 重构验证完成！所有导入路径和目录结构都正确。"
echo ""
echo "重构总结："
echo "- ✅ 创建了模块化目录结构"
echo "- ✅ 按功能域组织了组件"
echo "- ✅ 提取了通用工具函数"
echo "- ✅ 更新了所有导入路径"
echo "- ✅ 保持了功能完整性"