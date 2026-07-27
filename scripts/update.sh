#!/bin/bash
# =============================================================
# V-LeeTech — Update to VPS Server Script (Local-Build & Push)
# Build mã nguồn tại máy cá nhân, sau đó ném thành phẩm lên VPS
# =============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${APP_DIR}"

# ── Load cấu hình ───────────────────────────────────────────
if [ -f "scripts/config.sh" ]; then
    source scripts/config.sh
else
    err "Không tìm thấy scripts/config.sh!"
fi

# ── Kiểm tra cấu hình SSH ────────────────────────────────────
if [ -z "${SSH_HOST}" ]; then
    echo -e "${YELLOW}[!] Chưa cấu hình IP máy chủ (SSH_HOST) trong scripts/config.sh${NC}"
    read -p "Vui lòng nhập IP máy chủ VPS: " input_host
    if [ -z "${input_host}" ]; then
        err "IP máy chủ không được để trống!"
    fi
    SSH_HOST="${input_host}"
fi

SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o BatchMode=yes"

info "Bắt đầu cập nhật thông minh lên máy chủ ${SSH_USER}@${SSH_HOST}..."
info "Thư mục cài đặt trên máy chủ: ${SSH_DIR}"

# ── Bước 1: Build tại Local ────────────────────────────────
info "Bắt đầu biên dịch (Build) tại máy tính cá nhân..."
BUILD_START=$(date +%s)
echo "{\"version\": \"${BUILD_START}\"}" > public/version.json
npm run build
BUILD_END=$(date +%s)
log "Build xong trong $((BUILD_END - BUILD_START)) giây."

# ── Bước 2: Đồng bộ mã nguồn lên VPS bằng rsync ─────────────────────
# Lần này KHÔNG exclude .next, vì ta muốn đẩy kết quả build lên.
# Vẫn giữ nguyên DB, env và node_modules trên VPS, không push từ Local qua (tránh lỗi kiến trúc OS)
info "Đang đẩy thành phẩm (.next) và source code lên máy chủ (đồng bộ rsync)..."
rsync -avz --delete \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="storage" \
    --exclude="*.log" \
    --exclude="artifacts" \
    --exclude="scratch" \
    --exclude=".env" \
    --exclude=".env.local" \
    --exclude="scripts/config.sh" \
    --exclude="public/client-logo*" \
    --exclude="public/logo*" \
    --exclude="prisma/*.db" \
    --exclude="prisma/*.sqlite" \
    --exclude="prisma/*.db-journal" \
    -e "ssh ${SSH_OPTS}" . "${SSH_USER}@${SSH_HOST}:${SSH_DIR}/"

log "Mã nguồn và thư mục build (.next) đã đồng bộ thành công lên máy chủ!"

# ── Bước 3: Restart trên VPS qua SSH ────────────────────────
info "Đang cấu hình và Restart trên máy chủ..."
ssh ${SSH_OPTS} -t "${SSH_USER}@${SSH_HOST}" "
  export NVM_DIR=\"\$HOME/.nvm\"
  [ -s \"\$NVM_DIR/nvm.sh\" ] && source \"\$NVM_DIR/nvm.sh\"
  cd ${SSH_DIR}
  
  echo -e \"\033[0;34m[→]\033[0m Cài đặt thư viện mới nhất (nếu có)...\"
  npm install --prefer-offline

  echo -e \"\033[0;34m[→]\033[0m Tạo Prisma Client và đồng bộ DB...\"
  npx prisma generate
  npx prisma db push --accept-data-loss

  echo -e \"\033[0;34m[→]\033[0m Khởi động lại ứng dụng PM2...\"
  pm2 restart ${APP_NAME} || pm2 start npm --name ${APP_NAME} -- start
"

log "Cập nhật ứng dụng lên máy chủ thành công bằng phương pháp Smart Deploy!"
