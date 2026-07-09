#!/bin/bash
# =============================================================
# V-LeeTech — Sync Database to VPS Server
# Script hỗ trợ đồng bộ dữ liệu (SQLite dev.db) từ local lên VPS (prod.db)
# Sử dụng ATTACH DATABASE để tránh lỗi tương thích SQLite (như lỗi unistr)
# =============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${APP_DIR}"

if [ ! -f "prisma/dev.db" ]; then
    err "Không tìm thấy file prisma/dev.db ở local!"
fi

# Load cấu hình
if [ -f "scripts/config.sh" ]; then
    source scripts/config.sh
else
    err "Không tìm thấy scripts/config.sh!"
fi

SSH_USER="${SSH_USER:-root}"
SSH_DIR="${SSH_DIR:-/root/${APP_NAME}}"
SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o BatchMode=yes"

if [ -z "${SSH_HOST}" ]; then
    read -p "Vui lòng nhập IP máy chủ VPS: " input_host
    if [ -z "${input_host}" ]; then
        err "IP máy chủ không được để trống!"
    fi
    SSH_HOST="${input_host}"
fi

echo -e "${YELLOW}====================================================${NC}"
echo -e "${BOLD}CÔNG CỤ ĐỒNG BỘ DỮ LIỆU TỪ LOCAL LÊN VPS${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo "Bạn đang muốn đồng bộ dữ liệu gì lên VPS?"
echo "1) CHỈ CÁC BẢNG MASTER (Danh mục, Kho, Sản phẩm, Định mức...)"
echo "   (Giữ nguyên các dữ liệu giao dịch: Đơn hàng, Users, v.v. trên VPS)"
echo ""
echo "2) TOÀN BỘ DATABASE (GHI ĐÈ PROD.DB)"
echo "   (CẢNH BÁO: Sẽ xoá toàn bộ dữ liệu hiện có trên VPS và thay bằng bản local)"
echo "===================================================="
read -p "Chọn (1/2): " sync_choice

if [ "$sync_choice" == "2" ]; then
    warn "CẢNH BÁO: BẠN SẼ GHI ĐÈ TOÀN BỘ DATABASE TRÊN VPS BẰNG LOCAL DEV.DB!"
    read -p "Bạn có chắc chắn? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        err "Đã huỷ."
    fi

    info "Đang backup file prod.db hiện tại trên VPS..."
    ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "cp ${SSH_DIR}/prisma/prod.db ${SSH_DIR}/prisma/prod.db.bak.\$(date +%s) 2>/dev/null || true"

    info "Đang upload file dev.db mới lên VPS thành prod.db..."
    scp ${SSH_OPTS} prisma/dev.db "${SSH_USER}@${SSH_HOST}:${SSH_DIR}/prisma/prod.db"
    
    info "Khởi động lại ứng dụng..."
    ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "pm2 restart ${APP_NAME} || true"

    log "Đồng bộ TOÀN BỘ DATABASE thành công!"
    exit 0
elif [ "$sync_choice" == "1" ]; then
    info "Chế độ đồng bộ các bảng Master sử dụng ATTACH DATABASE."
    TABLES=(
        "Category" "CategoryTypeDef" "SeajongCategory" "InventoryCategory" "DepartmentCategory" "SupplierCategory"
        "Warehouse" "InventoryItem" "MaterialItem" "ManufacturedProduct" "SeajongProduct"
        "DinhMuc" "DinhMucVatTu"
    )

    info "Đang backup file prod.db hiện tại trên VPS..."
    ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "cp ${SSH_DIR}/prisma/prod.db ${SSH_DIR}/prisma/prod.db.bak.\$(date +%s) 2>/dev/null || true"

    info "Đang upload file dev.db (local) lên VPS dưới dạng dev_local.db tạm thời..."
    scp ${SSH_OPTS} prisma/dev.db "${SSH_USER}@${SSH_HOST}:${SSH_DIR}/prisma/dev_local.db"

    info "Đang thực thi đồng bộ dữ liệu trên VPS..."
    
    # Tạo script SQL
    SQL_SCRIPT="PRAGMA foreign_keys=OFF; BEGIN TRANSACTION; ATTACH DATABASE 'prisma/dev_local.db' AS localDB; "
    for tbl in "${TABLES[@]}"; do
        SQL_SCRIPT+="DELETE FROM \"${tbl}\"; INSERT INTO \"${tbl}\" SELECT * FROM localDB.\"${tbl}\"; "
    done
    SQL_SCRIPT+="COMMIT; PRAGMA foreign_keys=ON; DETACH DATABASE localDB;"

    # Thực thi script trên VPS
    ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "cd ${SSH_DIR} && sqlite3 prisma/prod.db \"${SQL_SCRIPT}\" && rm prisma/dev_local.db"

    info "Khởi động lại ứng dụng..."
    ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "pm2 restart ${APP_NAME} || true"

    log "Đồng bộ CÁC BẢNG MASTER thành công!"
    exit 0
else
    err "Lựa chọn không hợp lệ."
fi
