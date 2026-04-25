#!/bin/bash
# =============================================================
# Client Seajong — Stop Script
# Cách dùng: bash scripts/stop.sh
# =============================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Load cấu hình deploy tập trung ──────────────────────
# shellcheck source=scripts/config.sh
source "${SCRIPT_DIR}/config.sh"

echo ""
echo -e "${BOLD}Đang dừng ${APP_NAME}...${NC}"

if pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
    info "Dừng app qua PM2..."
    pm2 stop "${APP_NAME}"
    pm2 delete "${APP_NAME}"
    log "App đã dừng"
else
    warn "App '${APP_NAME}' không đang chạy trong PM2"
fi

echo ""
echo -e "${GREEN}${BOLD}✅  Đã dừng hoàn toàn.${NC}"
echo -e "  Để khởi động lại: ${YELLOW}bash scripts/start.sh${NC}"
echo ""


echo ""
echo -e "${BOLD}Đang dừng ${APP_NAME}...${NC}"

if pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
    info "Dừng app qua PM2..."
    pm2 stop "${APP_NAME}"
    pm2 delete "${APP_NAME}"
    log "App đã dừng"
else
    warn "App '${APP_NAME}' không đang chạy trong PM2"
fi

# Giải phóng cổng nếu còn tiến trình bám víu
PID=$(lsof -ti:${PORT} 2>/dev/null || true)
if [ -n "${PID}" ]; then
    info "Kill tiến trình đang chiếm cổng ${PORT} (PID: ${PID})..."
    kill -9 ${PID} 2>/dev/null || true
    log "Cổng ${PORT} đã giải phóng"
fi

echo ""
echo -e "${GREEN}${BOLD}✅  Đã dừng hoàn toàn.${NC}"
echo -e "  Để khởi động lại: ${YELLOW}bash scripts/deploy.sh${NC}"
echo ""
