/**
 * 检查导入路径是否正确
 */

console.log("🔍 开始检查导入路径...");

const fs = require('fs');
const path = require('path');

// 需要检查的文件
const files = [
  'src/AppContainer.jsx',
  'src/main.jsx',
  'src/components/search/SearchPanel.jsx',
  'src/components/search/ExportPanel.jsx',
  'src/components/import/ImportPanel.jsx',
  'src/components/editor/CompanySelector.jsx',
  'src/utils/api.js',
  'src/utils/export.js',
  'src/utils/formatters.js'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} 存在`);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      // 检查导入语句
      const imports = content.match(/import\s+.*?\s+from\s+['"](.*?)['"]/g);
      if (imports) {
        imports.forEach(imp => {
          const importPath = imp.match(/['"](.*?)['"]/)[1];
          if (importPath.startsWith('.')) {
            const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
            if (fs.existsSync(resolvedPath) || fs.existsSync(resolvedPath + '.jsx') || fs.existsSync(resolvedPath + '.js')) {
              console.log(`  ✅ ${imp} 路径正确`);
            } else {
              console.log(`  ❌ ${imp} 路径可能错误`);
            }
          }
        });
      }
    } catch (error) {
      console.log(`❌ ${file} 读取失败: ${error.message}`);
    }
  } else {
    console.log(`❌ ${file} 不存在`);
  }
});

console.log("\n📋 检查完成");