#!/bin/bash
# =============================================================
# V-LeeTech — VPS Setup Script (Chạy 1 lần đầu trên server)
# Hệ điều hành: Ubuntu 20.04 / 22.04
# Cách dùng:
#   1. Upload script này lên server
#   2. chmod +x setup-vps.sh && sudo bash setup-vps.sh
# =============================================================

set -e  # Dừng nếu có lỗi

# ── Màu sắc terminal ─────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
sep()  { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── Cấu hình — SỬA CÁC GIÁ TRỊ NÀY TRƯỚC KHI CHẠY ──────────
APP_USER="root"                                 # User chạy app (root hoặc tên user khác)
APP_DIR="/root/seajong"                       # Thư mục cài đặt
DOMAIN="seajong.leetech.vn"                                       # VD: app.seajong.vn (để trống nếu chỉ dùng IP)
NODE_VERSION="20"

# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     Client Seajong VPS Installer v1.0         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Kiểm tra quyền root ──────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Script này phải chạy bằng root. Dùng: sudo bash setup-vps.sh"

sep
info "Bước 1/7: Cập nhật hệ thống..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq git curl wget nano unzip build-essential
log "Hệ thống đã cập nhật"

sep
if [ "${APP_USER}" = "root" ]; then
    info "Bước 2/7: Dùng user root, bỏ qua tạo user mới..."
    warn "Đang chạy với quyền root. Đảm bảo server đã cấu hình SSH Key để bảo mật."
else
    info "Bước 2/7: Tạo user '${APP_USER}'..."
    if id "${APP_USER}" &>/dev/null; then
        warn "User '${APP_USER}' đã tồn tại, bỏ qua"
    else
        adduser --disabled-password --gecos "" "${APP_USER}"
        usermod -aG sudo "${APP_USER}"
        log "Đã tạo user '${APP_USER}'"
    fi
fi

sep
info "Bước 3/7: Cài Node.js ${NODE_VERSION} (NVM)..."
if [ "${APP_USER}" = "root" ]; then
    curl -s -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
    nvm install ${NODE_VERSION} --silent
    nvm alias default ${NODE_VERSION}
else
    sudo -u "${APP_USER}" bash -c "
        curl -s -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR=\$HOME/.nvm
        source \"\$NVM_DIR/nvm.sh\"
        nvm install ${NODE_VERSION} --silent
        nvm alias default ${NODE_VERSION}
        node -v
        npm -v
    "
fi
log "Node.js đã cài"

sep
info "Bước 4/7: Cài Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx
log "Nginx đã cài"

sep
info "Bước 5/7: Cài PM2 toàn cục..."
if [ "${APP_USER}" = "root" ]; then
    bash -ic "npm install -g pm2 --silent"
else
    sudo -u "${APP_USER}" bash -ic "npm install -g pm2 --silent"
fi
log "PM2 đã cài"


sep
info "Bước 6/7: Tạo swap (phòng trường hợp RAM thấp)..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Đã tạo swap 2GB"
else
    warn "Swap đã tồn tại, bỏ qua"
fi

sep
info "Bước 7/7: Cấu hình tường lửa (UFW)..."
if ! command -v ufw &>/dev/null; then
    apt-get install -y -qq ufw 2>/dev/null || true
fi

if command -v ufw &>/dev/null; then
    ufw --force enable
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw allow 3000
    log "Tường lửa đã cấu hình"
else
    warn "UFW không khả dụng — bỏ qua bước tường lửa (cấu hình thủ công sau)"
fi

# ── Tạo file .env mẫu nếu thư mục tồn tại ─────────────────────────────────────
sep
if [ -d "${APP_DIR}" ]; then
    info "Tạo file .env mẫu tại ${APP_DIR}/.env ..."
SECRET=$(openssl rand -base64 32)
if [ -n "${DOMAIN}" ]; then
    NEXTAUTH_URL="https://${DOMAIN}"
else
    NEXTAUTH_URL="http://$(curl -s ifconfig.me):3000"
fi

cat > "${APP_DIR}/.env" <<EOF
# ============================================================
# Client Seajong — Environment Variables (PRODUCTION)
# Tạo bởi setup-vps.sh — HÃY ĐIỀN ĐẦY ĐỦ TRƯỚC KHI BUILD
# ============================================================

DATABASE_URL="file:${APP_DIR}/prisma/prod.db"

NEXTAUTH_SECRET="${SECRET}"
NEXTAUTH_URL="${NEXTAUTH_URL}"

# Điền các Gemini API keys, cách nhau bằng dấu phẩy
GEMINI_API_KEYS="KEY_1,KEY_2,KEY_3"
EOF
    chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
    warn "File .env đã tạo — hãy mở và điền GEMINI_API_KEYS trước khi chạy deploy!"
    echo -e "    ${YELLOW}nano ${APP_DIR}/.env${NC}"
else
    warn "Thư mục ${APP_DIR} chưa tồn tại — upload code lên trước, sau đó chạy deploy.sh"
    warn "Thư mục upload code: ${APP_DIR}"
fi

# ── Cấu hình Nginx ───────────────────────────────────────────
sep
info "Cấu hình Nginx..."
SERVER_NAME="${DOMAIN:-$(curl -s ifconfig.me)}"
cat > /etc/nginx/sites-available/seajong <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    # Tăng timeout cho AI streaming
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    # Tăng giới hạn upload (Knowledge Base)
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/seajong /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx đã cấu hình"

# ── Cài certbot nếu có domain ────────────────────────────────
if [ -n "${DOMAIN}" ]; then
    sep
    info "Cài SSL cho domain ${DOMAIN}..."
    apt-get install -y -qq certbot python3-certbot-nginx
    certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m admin@${DOMAIN}
    log "SSL đã cài, tự gia hạn mỗi 90 ngày"
fi

# ── Tạo script backup ────────────────────────────────────────
sep
info "Cài backup tự động..."

# Cài cron nếu chưa có
if ! command -v crontab &>/dev/null; then
    apt-get install -y -qq cron
    systemctl enable cron
    systemctl start cron
fi

# Thư mục backup phụ thuộc vào user
if [ "${APP_USER}" = "root" ]; then
    BACKUP_HOME="/root"
else
    BACKUP_HOME="/home/${APP_USER}"
fi

mkdir -p "${BACKUP_HOME}/backup"
cat > "${BACKUP_HOME}/backup.sh" <<BACKUP
#!/bin/bash
BACKUP_DIR="${BACKUP_HOME}/backup"
DB_PATH="${APP_DIR}/prisma/prod.db"
DATE=\$(date +%Y%m%d_%H%M)

[ -f "\$DB_PATH" ] || exit 0
cp "\$DB_PATH" "\$BACKUP_DIR/prod-\$DATE.db"
find "\$BACKUP_DIR" -name "*.db" -mtime +30 -delete
echo "[\$(date)] Backup: prod-\$DATE.db"
BACKUP
chmod +x "${BACKUP_HOME}/backup.sh"

# Cài cron backup 2h sáng
if command -v crontab &>/dev/null; then
    if [ "${APP_USER}" = "root" ]; then
        (crontab -l 2>/dev/null; echo "0 2 * * * ${BACKUP_HOME}/backup.sh >> ${BACKUP_HOME}/backup.log 2>&1") | crontab -
    else
        (crontab -u "${APP_USER}" -l 2>/dev/null; echo "0 2 * * * ${BACKUP_HOME}/backup.sh >> ${BACKUP_HOME}/backup.log 2>&1") | \
            crontab -u "${APP_USER}" -
    fi
    log "Backup tự động 2h sáng mỗi ngày"
else
    warn "crontab không khả dụng — backup thủ công: bash ${BACKUP_HOME}/backup.sh"
fi

# ── Hoàn tất ─────────────────────────────────────────────────
sep
echo ""
echo -e "${GREEN}${BOLD}✅  Setup hoàn tất!${NC}"
echo ""
echo -e "  ${BOLD}Bước tiếp theo:${NC}"
echo -e "  1. Upload code lên server vào: ${YELLOW}${APP_DIR}${NC}"
echo -e "     (Dùng rsync, SFTP hoặc git clone)"
echo ""
echo -e "  2. Chỉnh sửa file .env (nếu đã có code):"
echo -e "     ${YELLOW}nano ${APP_DIR}/.env${NC}"
echo -e "     (Điền GEMINI_API_KEYS)"
echo ""
echo -e "  3. Chạy deploy:"
echo -e "     ${YELLOW}sudo -u ${APP_USER} bash ${APP_DIR}/scripts/deploy.sh${NC}"
echo ""
