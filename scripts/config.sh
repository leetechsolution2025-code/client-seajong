#!/bin/bash
# =============================================================
# Cấu hình Deploy cho dự án: Công ty cổ phần Seajong Faucet Việt Nam
# =============================================================

APP_NAME="client-seajong"
PORT=3711
DOMAIN="seajong.vn"

# Nginx config path
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

# Log file
LOG_FILE="/var/log/deploy_${APP_NAME}.log"
