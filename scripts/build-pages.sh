#!/bin/bash

# Cloudflare Pages 静态导出构建脚本 (v4)
# 功能：彻底隔离非静态组件，确保静态导出成功
# 1. 将所有动态组件移出 src 目录
# 2. 导出前端静态产物
# 3. 完美还原

PROJECT_ROOT=$(pwd)
CONFIG_FILE="$PROJECT_ROOT/next.config.ts"
SRC_APP_DIR="$PROJECT_ROOT/src/app"
OUTSIDE_BACKUP="$PROJECT_ROOT/_build_temp_backup"

echo "🚀 Starting Cloudflare Pages static export build..."

# 创建外部备份目录
mkdir -p "$OUTSIDE_BACKUP"

# 定义安全迁移函数
buffer_move() {
    local folder_name="$1"
    local target="$SRC_APP_DIR/$folder_name"
    if [ -d "$target" ]; then
        echo "📦 Isolating: $folder_name..."
        mv "$target" "$OUTSIDE_BACKUP/"
    fi
}

# 1. 移出所有会导致静态导出失败的动态路由
buffer_move "api"
buffer_move "embed"
buffer_move "auth"

# 2. 备份并修改 next.config.ts
echo "📝 Enabling static export in next.config.ts..."
cp "$CONFIG_FILE" "$CONFIG_FILE.bak"
sed -i.bak '/const nextConfig: NextConfig = {/a \
    output: "export", \
    images: { unoptimized: true },' "$CONFIG_FILE"

# 3. 执行静态构建
echo "🏗️ Running next build..."
npm run build

BUILD_STATUS=$?

# 4. 彻底还原
echo "🧹 Restoring project integrity..."
[ -f "$CONFIG_FILE.bak" ] && mv "$CONFIG_FILE.bak" "$CONFIG_FILE"

# 将文件从外部备份移回 src
if [ -d "$OUTSIDE_BACKUP" ]; then
    cp -r "$OUTSIDE_BACKUP"/* "$SRC_APP_DIR/" 2>/dev/null
    rm -rf "$OUTSIDE_BACKUP"
fi

if [ $BUILD_STATUS -eq 0 ]; then
    echo "✨ Static export successful! Output is in 'out' directory."
else
    echo "❌ Static export failed!"
    exit 1
fi
