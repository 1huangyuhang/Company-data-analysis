#!/bin/bash
# 创建发布分支并准备发布

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh v1.2.0"
    exit 1
fi

# 验证版本格式
if ! echo "$VERSION" | grep -qE "^v[0-9]+\.[0-9]+\.[0-9]+$"; then
    echo "Invalid version format: $VERSION"
    echo "Format should be: vX.Y.Z (e.g., v1.2.0)"
    exit 1
fi

git checkout develop 2>/dev/null || git checkout -b develop
git pull origin develop 2>/dev/null || echo "No remote develop branch"
git checkout -b release/$VERSION
echo "Created release branch: release/$VERSION"
echo "Please update version numbers and run final tests."
echo "When ready to deploy, run: ./deploy.sh $VERSION"