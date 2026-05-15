#!/bin/bash

# Hiển thị màu sắc cho thông báo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BẮT ĐẦU QUÁ TRÌNH CẬP NHẬT (DEPLOY) ===${NC}"

# 1. Kéo code mới nhất từ GitHub
echo -e "${GREEN}Step 1: Pulling latest code...${NC}"
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}Lỗi khi kéo code từ GitHub! Vui lòng kiểm tra lại.${NC}"
    exit 1
fi

# 2. Cài đặt các thư viện mới (nếu có)
echo -e "${GREEN}Step 2: Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Lỗi khi cài đặt thư viện!${NC}"
    exit 1
fi

# 3. Build ứng dụng Next.js
echo -e "${GREEN}Step 3: Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Lỗi khi build ứng dụng! Vui lòng kiểm tra log lỗi bên trên.${NC}"
    exit 1
fi

# 4. Restart ứng dụng bằng PM2
echo -e "${GREEN}Step 4: Restarting PM2...${NC}"
# Thử restart toàn bộ hoặc bạn có thể thay 'all' bằng tên app cụ thể
pm2 restart all

# 5. Dọn dẹp cache
echo -e "${GREEN}Step 5: Cleaning up...${NC}"
npm cache clean --force

echo -e "${BLUE}=== CẬP NHẬT THÀNH CÔNG! ===${NC}"
echo -e "Ứng dụng đã được cập nhật và khởi động lại."
