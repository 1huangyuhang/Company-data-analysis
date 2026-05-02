# 团队Git分支管理培训指南

## 🎓 培训目标
通过本次培训，团队成员将掌握：
- Git分支管理策略的核心概念
- 分支命名规范和工作流程
- 自动化脚本的使用方法
- 代码提交规范
- 分支保护规则和PR流程

## 📋 培训大纲

### 第一部分：基础概念（30分钟）
1. **Git分支管理的重要性**
2. **当前项目分支结构**
3. **各分支的作用和用途**

### 第二部分：工作流程实践（45分钟）
1. **创建特性分支**
2. **日常开发提交**
3. **创建Pull Request**
4. **代码审核流程**

### 第三部分：高级操作（30分钟）
1. **发布流程**
2. **冲突解决**
3. **回溯机制**

### 第四部分：最佳实践（15分钟）
1. **提交信息规范**
2. **分支管理习惯**
3. **团队协作要点**

## 🎯 实践操作指南

### 🚀 快速入门（5分钟）

#### 1. 给现有项目添加Git Hooks
```bash
# 进入项目目录
cd /path/to/your/project

# 运行Hooks安装脚本
./setup-hooks.sh

# 验证安装成功
ls -la .git/hooks/
```

#### 2. 测试Git Hooks
```bash
# 尝试错误的提交信息（应该被拒绝）
git commit -m "fix bug"

# 尝试正确的提交信息（应该通过）
git commit -m "fix: resolve login timeout issue"
```

### 📝 日常开发流程（15分钟）

#### 1. 开始新功能开发
```bash
# 从develop创建feature分支
./create-branch.sh feature "用户登录功能"

# 在feature分支上开发
cd frontend
# ... 编写代码 ...

# 提交代码
git add .
git commit -m "feat: add login form component"
git commit -m "feat: implement JWT authentication"
```

#### 2. 推送到远程仓库
```bash
git push origin feature/用户登录功能-20240115
```

#### 3. 创建Pull Request
1. 访问GitHub仓库
2. 点击"Pull requests"标签
3. 点击"New pull request"
4. 选择base分支：`develop`
5. 选择compare分支：`feature/用户登录功能-20240115`
6. 填写PR标题和描述
7. 点击"Create pull request"

#### 4. 代码审核流程
1. CI自动运行测试
2. 团队成员审查代码
3. 根据反馈进行修改
4. 审核通过后合并
5. 删除feature分支（或保留作为备份）

### 🔄 发布流程实践（10分钟）

#### 1. 准备发布
```bash
# 确保develop分支是最新的
git checkout develop
git pull origin develop

# 创建release分支
./release.sh v1.0.0

# 在release分支上进行最终测试
# ... 运行测试 ...
# ... 修复发现的Bug ...
```

#### 2. 部署到生产
```bash
# 运行部署脚本
./deploy.sh v1.0.0

# 脚本自动完成：
# 1. 合并到production分支
# 2. 创建版本标签
# 3. 推送更改
# 4. 合并回develop分支
# 5. 删除release分支
```

### 🧹 维护最佳实践（5分钟）

#### 1. 定期清理分支
```bash
# 清理已合并的feature分支
./cleanup.sh

# 手动清理特定分支
git branch -d feature/old-feature-20240101
```

#### 2. 同步develop分支
```bash
# 定期从远程获取最新代码
git checkout develop
git pull origin develop
```

## 📚 学习资源

### 📖 文档资源
1. **项目内部文档**
   - `BRANCH_MANAGEMENT_GUIDE.md` - 分支管理完整指南
   - `GIT_HOOKS_README.md` - Git Hooks配置说明
   - `GITHUB_PROTECTION_GUIDE.md` - GitHub保护配置指南

2. **在线资源**
   - [Git官方文档](https://git-scm.com/doc)
   - [GitHub Guides](https://guides.github.com/)
   - [Atlassian Git教程](https://www.atlassian.com/git/tutorials)

### 🎯 练习任务

#### 任务1: 环境设置（必做）
1. 克隆项目仓库
2. 安装Git Hooks
3. 测试提交信息验证

#### 任务2: 创建特性分支（必做）
1. 创建一个新的feature分支
2. 进行一些小改动
3. 提交并使用规范的提交信息
4. 推送到远程仓库

#### 任务3: 创建Pull Request（必做）
1. 在GitHub上创建PR
2. 填写PR模板
3. 请求同事审核
4. 审核通过后合并

#### 任务4: 发布流程（选做）
1. 参与一次发布流程
2. 使用release脚本
3. 使用deploy脚本
4. 验证发布结果

## 🎯 常见问题解答

### Q1: 为什么我的提交被拒绝了？
**可能原因：**
- 提交信息格式不正确
- 测试未通过
- 代码检查失败

**解决方法：**
- 检查提交信息格式：`<type>: <description>`
- 运行本地测试：`npm test`
- 查看错误信息并修复

### Q2: PR为什么无法合并？
**可能原因：**
- CI测试未通过
- 缺少代码审核
- 分支不是最新的
- 存在未解决的评论

**解决方法：**
- 等待CI通过
- 请求同事审核
- 更新分支：`git rebase origin/develop`
- 回复并解决所有评论

### Q3: 如何恢复误删的分支？
```bash
# 查看删除的分支记录
git reflog

# 恢复分支
git checkout -b branch-name <commit-hash>
```

### Q4: 如何处理冲突？
```bash
# 在feature分支上
git fetch origin
git rebase origin/develop
# 解决冲突
git add .
git rebase --continue
```

## 📞 技术支持

### 紧急问题
- **分支误删**: 立即联系项目负责人
- **发布失败**: 回滚到上一个稳定版本
- **权限问题**: 检查GitHub账户权限

### 常规问题
- **脚本使用**: 查看对应文档
- **流程疑问**: 参考培训材料
- **工具配置**: 查看README文件

### 最佳实践提醒
1. **频繁提交**: 每次提交只做一件事
2. **清晰信息**: 编写具体的提交信息
3. **及时同步**: 定期从develop同步代码
4. **代码审核**: 认真审查每一行代码
5. **备份重要**: 重要分支及时打tag

## 🎯 培训评估

### 知识测试
1. 分支命名规范是什么？
2. 如何创建特性分支？
3. PR合并需要哪些条件？
4. 提交信息的正确格式是什么？

### 实操测试
1. 成功创建一个feature分支
2. 提交符合规范的代码
3. 创建一个PR并合并
4. 完成一次发布流程

## 📅 培训跟进

### 第一周
- 观察团队成员使用情况
- 收集反馈和建议
- 解决遇到的问题

### 第一个月
- 评估流程效果
- 优化配置
- 更新文档

### 持续改进
- 定期回顾最佳实践
- 根据项目发展调整策略
- 分享新工具和技巧

---

**培训完成时间**: 约2小时
**维护责任人**: 项目负责人
**最后更新**: 2024-01-15