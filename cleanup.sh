#!/bin/bash
# 清理已合并的feature分支

echo "=== 开始清理已合并的分支 ==="

# 确保在develop分支上
git checkout develop 2>/dev/null || git checkout -b develop
git pull origin develop 2>/dev/null || echo "No remote develop branch"

# 获取已合并的分支列表
MERGED_BRANCHES=$(git branch --merged | grep -E "(feature|bugfix|refactor|test)" | grep -v "develop" | sed 's/^*//g' | sed 's/^ *//g')

if [ -z "$MERGED_BRANCHES" ]; then
    echo "没有需要清理的已合并分支"
    exit 0
fi

echo "找到以下已合并的分支："
echo "$MERGED_BRANCHES"
echo ""

read -p "是否要删除这些分支？(y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "取消清理操作"
    exit 0
fi

# 删除分支
echo "$MERGED_BRANCHES" | while read branch; do
    if [ ! -z "$branch" ]; then
        echo "删除分支: $branch"
        git branch -d "$branch"
    fi
done

echo ""
echo "=== 清理完成 ==="
echo "✅ 已删除所有已合并的特性分支"