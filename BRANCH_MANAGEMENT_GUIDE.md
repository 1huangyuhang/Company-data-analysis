# Git分支管理指南

## 🎯 概述
本文档描述了项目团队的分支管理策略和最佳实践，旨在提供清晰、高效的开发流程。

## 📊 分支结构

### 主分支
- **`production`**: 生产环境稳定分支，始终保持可部署状态
- **`develop`**: 开发集成分支，包含最新的开发成果

### 特性分支（从develop创建）
- **`feature/*`**: 新功能开发
- **`bugfix/*`**: Bug修复
- **`refactor/*`**: 代码重构
- **`test/*`**: 实验性功能

### 支持分支
- **`release/*`**: 发布准备分支

## 📝 命名规范

### 分支命名格式
```
<类型>/<描述>-<日期>
```

### 命名示例
- `feature/user-auth-20240115`
- `bugfix/login-error-20240116`
- `refactor/database-layer-20240117`
- `release/v1.2.0`

### 日期格式
使用 `YYYYMMDD` 格式，便于按时间排序

## 🔄 工作流程

### 1. 新功能开发流程
```bash
# 1. 创建feature分支
./create-branch.sh feature "user authentication system"

# 2. 在feature分支上开发
git add .
git commit -m "feat: add login form component"
git commit -m "feat: implement JWT authentication"
git commit -m "test: add auth unit tests"

# 3. 推送到远程
git push origin feature/user-authentication-system-20240115

# 4. 创建PR到develop分支
# 5. 代码审核通过后合并
# 6. 删除feature分支（或保留作为备份）
```

### 2. Bug修复流程
```bash
# 1. 创建bugfix分支
./create-branch.sh bugfix "login timeout issue"

# 2. 修复Bug
git add .
git commit -m "fix: resolve login timeout issue"

# 3. 测试验证
# 4. 合并到develop
```

### 3. 发布流程
```bash
# 1. 创建release分支
./release.sh v1.2.0

# 2. 在release分支上进行最终测试和修复
# 3. 更新版本号
# 4. 部署到生产
./deploy.sh v1.2.0

# 5. release分支会自动合并到production和develop
# 6. 自动删除release分支
```

## 🛠️ 实用脚本

### create-branch.sh
创建新的特性分支：
```bash
./create-branch.sh <type> <description>
# 类型: feature, bugfix, refactor, test
```

### release.sh
创建发布分支：
```bash
./release.sh <version>
# 版本格式: vX.Y.Z (e.g., v1.2.0)
```

### deploy.sh
部署到生产环境：
```bash
./deploy.sh <version>
```

### cleanup.sh
清理已合并的分支：
```bash
./cleanup.sh
```

## 🔐 分支保护规则

### production分支保护
- 需要Pull Request审核
- 需要CI测试通过
- 禁止强制推送
- 管理员可绕过（谨慎使用）

### develop分支保护
- 需要Pull Request审核
- 建议CI测试通过
- 禁止强制推送

## 📋 代码提交规范

### 提交信息格式
```
<type>: <description>
```

### 类型说明
- `feat`: 新功能特性
- `fix`: Bug修复
- `refactor`: 代码重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 其他杂项工作

### 示例
```
feat: add user authentication system
fix: resolve login timeout issue
refactor: improve database query performance
docs: update API documentation
test: add unit tests for user service
chore: update dependencies
```

## 🎯 最佳实践

### 1. 分支管理
- 保持production分支始终稳定
- develop分支作为集成测试环境
- 特性分支粒度适中，避免过大或过小
- 定期清理已合并的分支

### 2. 提交习惯
- 频繁提交，每次提交只做一件事
- 编写清晰、具体的提交信息
- 使用Git Hooks自动检查

### 3. 代码审核
- PR应该小而聚焦
- 提供清晰的说明和测试步骤
- 及时处理审核反馈

### 4. 回溯机制
- 重要功能分支可保留作为备份
- 使用tag标记重要版本
- 定期备份重要分支

## 🚨 常见问题解决

### 问题1: 分支冲突
```bash
# 在feature分支上
git fetch origin
git rebase origin/develop
# 解决冲突后
git add .
git rebase --continue
```

### 问题2: 误删分支
```bash
# 查看删除的分支
git reflog
# 恢复分支
git checkout -b branch-name <commit-hash>
```

### 问题3: 回退提交
```bash
# 查看提交历史
git log --oneline
# 回退到指定提交
git reset --hard <commit-hash>
```

## 📞 联系信息
如有疑问，请联系项目负责人或查看Git文档。

## 📄 版本历史
- v1.0.0 (2024-01-15): 初始版本
- v1.1.0 (2024-01-20): 添加脚本说明
- v1.2.0 (2024-01-25): 更新最佳实践