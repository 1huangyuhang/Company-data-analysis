#!/bin/bash
# Git Hooks自动安装脚本

echo "🔧 开始配置Git Hooks..."

# 创建自定义的pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# 在提交前运行基本检查

# 检查是否跳过hooks
if [ "$SKIP_GIT_HOOKS" = "1" ]; then
    echo "⏭️  Skipping git hooks"
    exit 0
fi

echo "🔍 Running pre-commit checks..."

# 检查是否有未提交的修改
if git diff --cached --quiet; then
    echo "⚠️  No changes staged for commit"
    exit 1
fi

# 根据项目类型运行测试
if [ -f "package.json" ]; then
    echo "📦 Node.js项目 - 运行npm test..."
    if command -v npm &> /dev/null; then
        npm test
        if [ $? -ne 0 ]; then
            echo "❌ Tests failed, commit aborted"
            exit 1
        fi
    else
        echo "⚠️  npm not found, skipping tests"
    fi
elif [ -f "requirements.txt" ]; then
    echo "🐍 Python项目 - 建议添加pytest测试"
    if command -v pytest &> /dev/null; then
        pytest
        if [ $? -ne 0 ]; then
            echo "❌ Tests failed, commit aborted"
            exit 1
        fi
    fi
elif [ -f "pom.xml" ]; then
    echo "☕ Maven项目 - 建议添加mvn test"
    if command -v mvn &> /dev/null; then
        mvn test
        if [ $? -ne 0 ]; then
            echo "❌ Tests failed, commit aborted"
            exit 1
        fi
    fi
fi

# 代码格式检查（如果存在相应工具）
if command -v eslint &> /dev/null && [ -f "package.json" ]; then
    echo "🎨 Running ESLint..."
    eslint $(git diff --cached --name-only -- '*.js' '*.ts' '*.jsx' '*.tsx' 2>/dev/null) 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "⚠️  ESLint found issues, but allowing commit (remove this check if you want to enforce)"
    fi
fi

if command -v black &> /dev/null && [ -f "requirements.txt" ]; then
    echo "🎨 Running Black format check..."
    black --check $(git diff --cached --name-only -- '*.py' 2>/dev/null) 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "⚠️  Black format issues found, but allowing commit"
    fi
fi

# 基础检查：不允许非ASCII文件名（可选）
if [ "$(git config --type=bool hooks.allownonascii)" != "true" ]; then
    if git rev-parse --verify HEAD >/dev/null 2>&1; then
        against=HEAD
    else
        against=$(git hash-object -t tree /dev/null)
    fi

    if test $(git diff-index --cached --name-only --diff-filter=A -z $against |
        LC_ALL=C tr -d '[ -~]\0' | wc -c) != 0; then
        echo "❌ 非ASCII文件名检测失败"
        echo "Error: Attempt to add a non-ASCII file name."
        echo "To be portable it is advisable to rename the file."
        exit 1
    fi
fi

echo "✅ Pre-commit checks passed"
EOF

# 创建自定义的commit-msg hook
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# 验证提交信息格式

# 检查是否跳过hooks
if [ "$SKIP_GIT_HOOKS" = "1" ]; then
    exit 0
fi

MSG_FILE=$1
MSG=$(cat $1)

# 提交信息格式检查
if ! echo "$MSG" | grep -qE "^(feat|fix|refactor|docs|test|chore): .{10,}"; then
    echo "❌ Invalid commit message format"
    echo ""
    echo "正确的格式: <type>: <description>"
    echo "类型: feat, fix, refactor, docs, test, chore"
    echo ""
    echo "示例:"
    echo "feat: add user authentication system"
    echo "fix: resolve login timeout issue"
    echo "refactor: improve database query performance"
    echo ""
    echo "当前提交信息:"
    echo "$MSG"
    exit 1
fi

# 检查是否有签off行重复（如果存在）
if grep -q '^Signed-off-by: ' "$1"; then
    if ! test "" = "$(grep '^Signed-off-by: ' "$1" | sort | uniq -c | sed -e '/^[ 	]*1[ 	]/d')"; then
        echo "⚠️  Duplicate Signed-off-by lines found, removing duplicates..."
        grep '^Signed-off-by: ' "$1" | sort -u > "$1.signoff"
        head -n 1 "$1.signoff" >> "$1"
        rm "$1.signoff"
    fi
fi

echo "✅ Commit message format is valid"
EOF

# 设置执行权限
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg

echo "✅ Git Hooks配置完成！"
echo ""
echo "已安装的Hooks："
echo "1. pre-commit - 提交前自动运行测试和代码检查"
echo "2. commit-msg - 验证提交信息格式"
echo ""
echo "使用方法："
echo "- 正常使用git commit，Hooks会自动触发"
echo "- 如需跳过Hooks：export SKIP_GIT_HOOKS=1"