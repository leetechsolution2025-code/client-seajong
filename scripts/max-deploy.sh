#!/bin/bash
# =============================================================
# V-LeeTech — MAX DEPLOY SCRIPT (NGUY HIỂM - GHI ĐÈ DỮ LIỆU)
# Xóa sạch dữ liệu thật trên Server, thay thế bằng dữ liệu Local
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

echo -e "\n${RED}${BOLD}=================================================================${NC}"
echo -e "${RED}${BOLD}CẢNH BÁO TỐI CAO: BẠN ĐANG CHẠY LỆNH MAX-DEPLOY${NC}"
echo -e "${YELLOW}Kịch bản này sẽ XÓA SẠCH toàn bộ dữ liệu (Khách hàng, Đơn hàng, Tồn kho...)${NC}"
echo -e "${YELLOW}đang có trên máy chủ và thay thế bằng dữ liệu DEV của máy Local!${NC}"
echo -e "${RED}${BOLD}=================================================================${NC}\n"

read -p "Sếp có CHẮC CHẮN muốn tiếp tục? (Gõ 'yes' để xác nhận): " confirm_delete
if [ "$confirm_delete" != "yes" ]; then
    err "Đã hủy quá trình Max-Deploy để bảo toàn dữ liệu!"
fi

info "Bắt đầu cập nhật Toàn diện lên máy chủ ${SSH_USER}@${SSH_HOST}..."

# ── Bước 1: Build tại Local ────────────────────────────────
info "Bắt đầu biên dịch (Build) tại máy tính cá nhân..."
BUILD_START=$(date +%s)
echo "{\"version\": \"${BUILD_START}\"}" > public/version.json
npm run build
BUILD_END=$(date +%s)
log "Build xong trong $((BUILD_END - BUILD_START)) giây."

# ── Bước 2: Đồng bộ mã nguồn lên VPS bằng rsync ─────────────────────
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

log "Mã nguồn đã đồng bộ thành công!"

# ── Bước 3: ĐỒNG BỘ DỮ LIỆU DB NGUY HIỂM ────────────────────────
info "Đang chép đè CSDL Local (dev.db) lên Máy chủ (prod.db)..."
# Tạm dừng app trước khi ghi đè DB
ssh ${SSH_OPTS} -t "${SSH_USER}@${SSH_HOST}" "pm2 stop ${APP_NAME} || true"

# Ghi đè DB
scp ${SSH_OPTS} prisma/dev.db "${SSH_USER}@${SSH_HOST}:${SSH_DIR}/prisma/prod.db"
log "Đã chép đè CSDL thành công!"

# ── Bước 4: Khởi động lại trên VPS ────────────────────────
info "Đang khởi động lại hệ thống..."
ssh ${SSH_OPTS} -t "${SSH_USER}@${SSH_HOST}" "
  export NVM_DIR=\"\$HOME/.nvm\"
  [ -s \"\$NVM_DIR/nvm.sh\" ] && source \"\$NVM_DIR/nvm.sh\"
  cd ${SSH_DIR}
  
  npm install --prefer-offline
  npx prisma generate
  
  echo -e \"\033[0;34m[→]\033[0m Khởi động lại ứng dụng PM2...\"
  pm2 restart ${APP_NAME} || pm2 start npm --name ${APP_NAME} -- start
"

log "Max-Deploy hoàn tất! Máy chủ đã bị thay thế hoàn toàn bằng dữ liệu Local!"
