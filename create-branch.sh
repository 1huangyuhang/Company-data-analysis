#!/bin/bash
# 从develop创建新的特性分支

TYPE=$1
DESCRIPTION=$2
DATE=$(date +%Y%m%d)

if [ -z "$TYPE" ] || [ -z "$DESCRIPTION" ]; then
    echo "Usage: ./create-branch.sh <type> <description>"
    echo "Types: feature, bugfix, refactor, test"
    exit 1
fi

# 验证类型
if [[ "$TYPE" != "feature" && "$TYPE" != "bugfix" && "$TYPE" != "refactor" && "$TYPE" != "test" ]]; then
    echo "Invalid type: $TYPE"
    echo "Valid types: feature, bugfix, refactor, test"
    exit 1
fi

BRANCH_NAME="${TYPE}/${DESCRIPTION}-${DATE}"
git checkout develop 2>/dev/null || git checkout -b develop
git pull origin develop 2>/dev/null || echo "No remote develop branch, creating new"
git checkout -b $BRANCH_NAME
echo "Created branch: $BRANCH_NAME"
echo "当前分支: $(git branch --show-current)"