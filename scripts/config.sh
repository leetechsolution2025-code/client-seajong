#!/bin/bash
# =============================================================
# Cấu hình Deploy cho dự án: Công ty cổ phần Seajong Faucet Việt Nam
# =============================================================

APP_NAME="seajong"
PORT=3092
DOMAIN="seajong.leetech.vn"

# Nginx config path
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

# Log file
LOG_FILE="/var/log/deploy_${APP_NAME}.log"
