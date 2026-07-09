#!/bin/bash
# =============================================================
# Cấu hình Deploy cho dự án: Công ty cổ phần Seajong Faucet Việt Nam
# =============================================================

APP_NAME="client-seajong"
PORT=3348
DOMAIN="seajong.leetech.vn"

# Nginx config path
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

# Log file
LOG_FILE="/var/log/deploy_${APP_NAME}.log"

# Cấu hình SSH để deploy từ máy cá nhân lên server (cho lệnh update.sh)
SSH_HOST="14.225.198.32"
SSH_USER="root"
SSH_DIR="/root/seajong"
