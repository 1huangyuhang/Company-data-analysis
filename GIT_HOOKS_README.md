# Git Hooks配置说明

## 概述
Git Hooks是Git提供的脚本功能，可以在特定Git操作（如提交、推送等）发生时自动执行自定义脚本。

## 推荐的Hooks配置

### 1. pre-commit Hook
在提交前自动运行，用于：
- 运行代码测试
- 检查代码格式
- 验证文件完整性

### 2. commit-msg Hook
验证提交信息格式，确保符合规范：
- 格式：`<type>: <description>`（至少10个字符描述）
- 类型：feat, fix, refactor, docs, test, chore

## 安装方法

### 方法1：手动安装
1. 将以下脚本复制到 `.git/hooks/` 目录
2. 重命名文件（去掉 `.sample` 后缀）：
   - `pre-commit.sample` → `pre-commit`
   - `commit-msg.sample` → `commit-msg`
3. 确保文件有执行权限：`chmod +x .git/hooks/pre-commit .git/hooks/commit-msg`

### 方法2：自动安装
运行脚本自动配置：
```bash
./setup-hooks.sh
```

## 自定义配置

### 提交信息类型说明
- `feat`: 新功能特性
- `fix`: Bug修复
- `refactor`: 代码重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 其他杂项工作

### 示例提交信息
```
feat: add user authentication system
fix: resolve login timeout issue
refactor: improve database query performance
docs: update API documentation
test: add unit tests for user service
chore: update dependencies
```

## 禁用Hooks
如果需要临时禁用某个hook，可以：
1. 将hook文件改名（加上 `.backup` 后缀）
2. 或设置环境变量：`export SKIP_GIT_HOOKS=1`

## 项目特定的Hooks配置

### Node.js项目
- 运行 `npm test`
- ESLint代码检查
- Prettier格式检查

### Python项目
- 运行 `pytest`
- Flake8代码检查
- Black格式检查

### Java项目
- 运行 `mvn test`
- Checkstyle代码检查