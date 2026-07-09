#!/bin/bash
# =============================================================
# V-LeeTech — Update to VPS Server Script (Chạy từ máy local)
# Đẩy mã nguồn từ máy cá nhân lên VPS và chạy deploy.sh trên VPS
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

# Fallbacks if SSH_USER or SSH_DIR are empty
SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"

# SSH options: buộc dùng key, tắt hỏi password
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o BatchMode=yes"

info "Bắt đầu cập nhật lên máy chủ ${SSH_USER}@${SSH_HOST}..."
info "Thư mục cài đặt trên máy chủ: ${SSH_DIR}"

# ── Đồng bộ mã nguồn lên VPS bằng rsync ─────────────────────
# Giữ nguyên database, env, và config trên VPS
info "Đang tải mã nguồn lên máy chủ (đồng bộ rsync)..."
rsync -avz --delete \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude=".next" \
    --exclude="**/*.db*" \
    --exclude="prisma/migrations" \
    --exclude="*.log" \
    --exclude="artifacts" \
    --exclude="scratch" \
    --exclude=".env" \
    --exclude=".env.local" \
    --exclude="scripts/config.sh" \
    --exclude="public/client-logo*" \
    --exclude="public/logo*" \
    --exclude="package-lock.json" \
    -e "ssh ${SSH_OPTS}" . "${SSH_USER}@${SSH_HOST}:${SSH_DIR}/"

log "Mã nguồn đã đồng bộ thành công lên máy chủ!"

# ── Chạy kịch bản deploy trên VPS qua SSH ───────────────────
info "Đang chạy kịch bản cập nhật và restart trên máy chủ..."
ssh ${SSH_OPTS} -t "${SSH_USER}@${SSH_HOST}" "SKIP_GIT=1 bash ${SSH_DIR}/scripts/deploy.sh"

log "Cập nhật ứng dụng lên máy chủ thành công!"
