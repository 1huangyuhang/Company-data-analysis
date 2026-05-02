#!/bin/bash
# 合并release分支到production

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./deploy.sh <version>"
    exit 1
fi

# 检查release分支是否存在
if ! git branch --list | grep -q "release/$VERSION"; then
    echo "Release branch release/$VERSION does not exist"
    exit 1
fi

echo "=== 开始部署版本 $VERSION ==="

# 合并到production
echo "1. 切换到production分支..."
git checkout production 2>/dev/null || git checkout -b production

echo "2. 拉取最新production代码..."
git pull origin production 2>/dev/null || echo "No remote production branch"

echo "3. 合并release/$VERSION到production..."
git merge --no-ff release/$VERSION -m "Release $VERSION"

echo "4. 创建版本标签..."
git tag -a $VERSION -m "Version $VERSION"

echo "5. 推送到远程仓库..."
git push origin production --tags

# 合并回develop
echo "6. 切换回develop分支..."
git checkout develop

echo "7. 合并release/$VERSION到develop..."
git merge --no-ff release/$VERSION -m "Merge release $VERSION back to develop"

# 删除release分支
echo "8. 删除release分支..."
git branch -d release/$VERSION
git push origin :release/$VERSION 2>/dev/null || echo "Remote release branch already deleted"

echo "=== 版本 $VERSION 部署完成 ==="
echo "✅ production分支已更新"
echo "✅ develop分支已同步"
echo "✅ 版本标签已创建: $VERSION"