#!/bin/bash
# =============================================================
# HaoNhai — Deploy Config
# File này được source bởi: deploy.sh, start.sh, stop.sh
# SỬA TẠI ĐÂY để thay đổi cấu hình deploy
# =============================================================

APP_NAME="seajong"
PORT=3000                                          # Port app chạy (nginx proxy 80/443 → PORT)
DOMAIN="seajong.leetech.vn"                        # VD: app.haonhai.vn — để trống nếu chỉ dùng IP
NGINX_CONF="/etc/nginx/sites-available/seajong"   # Nginx site config
