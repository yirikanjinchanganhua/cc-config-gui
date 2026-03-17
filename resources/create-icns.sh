#!/bin/bash
# 从 icon.png (512x512) 生成 icon.icns
# 用法: ./create-icns.sh
# 前置条件: 在 resources/ 目录下放置 icon.png（建议 1024x1024）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/icon.png"
ICONSET="$SCRIPT_DIR/icon.iconset"
OUTPUT="$SCRIPT_DIR/icon.icns"

if [ ! -f "$SRC" ]; then
  echo "错误: 未找到 $SRC"
  echo "请将 1024x1024 的 PNG 图标放置到 resources/icon.png"
  exit 1
fi

echo "正在生成 iconset..."
mkdir -p "$ICONSET"

sips -z 16 16     "$SRC" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$SRC" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$SRC" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$SRC" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$SRC" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$SRC" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$SRC" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$SRC" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$SRC" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png"

echo "正在生成 icon.icns..."
iconutil -c icns "$ICONSET" -o "$OUTPUT"

rm -rf "$ICONSET"
echo "完成: $OUTPUT"
