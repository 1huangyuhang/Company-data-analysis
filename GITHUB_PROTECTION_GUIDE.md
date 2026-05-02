# GitHub分支保护配置指南

## 🎯 概述
本指南说明如何在GitHub仓库中配置分支保护规则，确保代码质量和开发流程的规范性。

## 🔐 配置production分支保护

### 步骤1: 访问仓库设置
1. 打开GitHub仓库：`https://github.com/1huangyuhang/Company-data-analysis`
2. 点击顶部导航栏的 **Settings**
3. 在左侧菜单中选择 **Branches**

### 步骤2: 添加production分支保护规则
1. 在"Branch protection rules"部分，点击 **Add rule**
2. 在"Branch name pattern"中输入：`production`

### 步骤3: 配置保护选项
**必选设置：**
- ✅ **Require pull request reviews before merging** (合并前需要PR审核)
  - 设置"Required number of approvals"为 **1** (小团队建议1人审核)
- ✅ **Require status checks to pass before merging** (合并前需要状态检查通过)
  - 添加状态检查：`build`, `test`, `lint` (根据您的CI配置添加)
- ✅ **Require conversation resolution before merging** (合并前需要解决所有评论)
- ✅ **Require linear history** (要求线性历史)
- ✅ **Require branches to be up to date before merging** (要求分支最新)

**可选设置：**
- ✅ **Include administrators** (包含管理员，建议启用)
- ❌ **Allow force pushes** (禁止强制推送)
- ❌ **Allow deletions** (禁止删除分支)

### 步骤4: 保存设置
点击 **Create** 或 **Save changes** 保存配置

## ⚙️ 配置develop分支保护

### 步骤1: 添加develop分支保护规则
在同一个页面，点击 **Add rule**
在"Branch name pattern"中输入：`develop`

### 步骤2: 配置develop保护选项
**必选设置：**
- ✅ **Require pull request reviews before merging**
  - Required number of approvals: **1**
- ✅ **Require status checks to pass before merging**
  - 添加状态检查：`build`, `test`, `lint`
- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history**
- ✅ **Require branches to be up to date before merging**

**可选设置：**
- ❌ **Include administrators** (develop分支管理员可灵活处理)
- ❌ **Allow force pushes** (禁止强制推送)
- ❌ **Allow deletions** (禁止删除分支)

## 🔄 配置CODEOWNERS文件

### 步骤1: 创建CODEOWNERS文件
在项目根目录创建 `.github/CODEOWNERS` 文件：

```bash
mkdir -p .github
touch .github/CODEOWNERS
```

### 步骤2: 添加代码所有者配置
```plaintext
# 默认所有者
* @1huangyuhang

# 前端代码所有者
frontend/ @1huangyuhang
frontend/src/ @1huangyuhang

# 后端代码所有者
backend/ @1huangyuhang
backend/src/ @1huangyuhang

# 配置文件所有者
*.md @1huangyuhang
*.json @1huangyuhang
*.yaml @1huangyuhang
*.yml @1huangyuhang
```

## 🛡️ 配置GitHub Actions（CI/CD）

### 步骤1: 创建GitHub Actions工作流
```bash
mkdir -p .github/workflows
```

### 步骤2: 创建CI工作流文件
创建 `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ develop, production ]
  pull_request:
    branches: [ develop, production ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [14.x, 16.x, 18.x]

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}

    - name: Install dependencies
      run: npm install

    - name: Run tests
      run: npm test

    - name: Run lint
      run: npm run lint || echo "No lint script found"

  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x

    - name: Install dependencies
      run: npm install

    - name: Build project
      run: npm run build || echo "No build script found"
```

## 📋 PR模板配置

### 步骤1: 创建PR模板
```bash
mkdir -p .github
touch .github/pull_request_template.md
```

### 步骤2: 添加PR模板内容
```markdown
# 📋 Pull Request 模板

## 🎯 变更内容
**类型:**
- [ ] 新功能 (feat)
- [ ] Bug修复 (fix)
- [ ] 代码重构 (refactor)
- [ ] 文档更新 (docs)
- [ ] 测试相关 (test)
- [ ] 其他 (chore)

## 📝 描述
请详细说明本次变更的内容和目的：

## 🔍 测试步骤
1.
2.
3.

## ✅ 测试结果
- [ ] 所有测试通过
- [ ] 手动测试通过
- [ ] 代码检查通过

## 🎯 关联问题
Closes #<issue-number>
Related to #<issue-number>

## 📸 截图（如适用）
```

## 🔍 验证配置

### 测试1: 尝试直接推送production分支
```bash
git checkout production
echo "test" > test.txt
git add test.txt
git commit -m "test: direct push to production"
git push origin production
```

**预期结果**: 应该被拒绝

### 测试2: 通过PR合并到develop
```bash
./create-branch.sh feature "test-feature"
echo "test" > test.txt
git add test.txt
git commit -m "feat: add test feature"
git push origin feature/test-feature-20240115
```

**预期结果**:
1. 在GitHub创建PR
2. CI自动运行
3. 需要1人审核通过才能合并

## 🚨 故障排除

### 问题1: 分支保护不生效
- 检查是否启用了"Include administrators"
- 确认分支名称模式正确
- 检查是否有缓存，等待几分钟后重试

### 问题2: CI状态检查未显示
- 确认GitHub Actions工作流文件位置正确
- 检查工作流是否成功运行
- 在分支保护规则中添加正确的工作流名称

### 问题3: CODEOWNERS不生效
- 确认文件路径为 `.github/CODEOWNERS`
- 检查用户名是否正确
- 确认文件在默认分支上

## 📞 联系支持
如遇配置问题，请参考：
- [GitHub官方文档](https://docs.github.com/en/repositories/creating-and-managing-repositories)
- [GitHub分支保护](https://docs.github.com/en/repositories/creating-and-managing-repositories/protecting-branches)
- [GitHub Actions](https://docs.github.com/en/actions)