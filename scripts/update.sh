#!/bin/bash

# Script cập nhật nhanh (Chỉ Pull code và Build lại)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}>>> Đang cập nhật logic nhanh...${NC}"

# Chuyển về thư mục gốc của dự án
cd "$(dirname "$0")/.."

# 1. Kéo code
git pull origin main

# 2. Build (Next.js sẽ sử dụng cache nên rất nhanh)
npm run build

# 3. Restart server
pm2 restart all

echo -e "${GREEN}>>> Cập nhật xong! Giao diện mới đã sẵn sàng.${NC}"
