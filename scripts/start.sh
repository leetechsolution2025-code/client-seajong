#!/bin/bash
# =============================================================
# V-LeeTech Client — Start Script (khởi động nhanh, không build lại)
# Cách dùng: bash scripts/start.sh
# =============================================================

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Load cấu hình deploy tập trung ──────────────────────
# shellcheck source=scripts/config.sh
source "${APP_DIR}/scripts/config.sh"

# ── Load NVM ─────────────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

if ! command -v npm &>/dev/null; then
    for CANDIDATE in /usr/local/bin/npm /usr/bin/npm "$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin/npm"; do
        [ -x "$CANDIDATE" ] && export PATH="$(dirname $CANDIDATE):$PATH" && break
    done
fi

command -v npm &>/dev/null || err "npm không tìm thấy! Hãy cài Node.js trước."

# ── Tự động cài PM2 nếu chưa có ─────────────────────────────
if ! command -v pm2 &>/dev/null; then
    warn "PM2 chưa được cài. Đang cài tự động..."
    npm install -g pm2
    export PATH="$(npm root -g)/../.bin:$PATH"
fi

command -v pm2 &>/dev/null || err "Không thể cài PM2."

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       V-LeeTech Client — Start App               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo -e "  Thư mục : ${APP_DIR}"
echo -e "  App name: ${APP_NAME}"
echo -e "  Port    : ${PORT}"
echo ""

cd "${APP_DIR}"

# ── Kiểm tra đã build chưa ───────────────────────────────────
[ -d ".next" ] || err "Chưa có thư mục .next — hãy chạy deploy.sh trước để build."
[ -f ".env"  ] || err "Không tìm thấy .env!"

# ── Tạo / cập nhật ecosystem.config.js ───────────────────────
cat > "${APP_DIR}/ecosystem.config.js" <<EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'npm',
    args: 'start',
    cwd: '${APP_DIR}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'production',
      PORT: ${PORT}
    }
  }]
}
EOF

# ── Start hoặc restart ───────────────────────────────────────
if pm2 list | grep -q "${APP_NAME}"; then
    info "App đang chạy — reload để áp dụng cấu hình mới..."
    pm2 reload "${APP_NAME}" --update-env
    log "App đã reload"
else
    info "Khởi động app lần đầu..."
    pm2 start ecosystem.config.js
    pm2 startup 2>/dev/null | grep "sudo" | bash || true
    pm2 save
    log "App đã khởi động"
fi

# ── Health check ─────────────────────────────────────────────
info "Chờ app sẵn sàng..."
for i in $(seq 1 10); do
    sleep 2
    if curl -sf "http://localhost:${PORT}" > /dev/null 2>&1; then
        log "App đang phản hồi tại http://localhost:${PORT} ✅"
        break
    fi
    [ "$i" -eq 10 ] && warn "App chưa phản hồi sau 20 giây — xem log: pm2 logs ${APP_NAME}"
done

echo ""
echo -e "${GREEN}${BOLD}✅  App đang chạy!${NC}"
echo ""
echo -e "  pm2 status               # Xem trạng thái"
echo -e "  pm2 logs ${APP_NAME}      # Xem log real-time"
echo -e "  pm2 restart ${APP_NAME}   # Restart"
echo -e "  bash scripts/stop.sh     # Dừng app"
echo ""
