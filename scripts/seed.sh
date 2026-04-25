#!/bin/bash
# =============================================================
# Client Seajong — Seed Script
# Tự động chạy migration + tất cả seed-*.{js,ts} trong prisma/
# Cách dùng: bash scripts/seed.sh
# =============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

cd "${APP_DIR}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       Client Seajong — Migrate & Seed            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Prisma generate + migrate ─────────────────────────────
info "Tạo Prisma Client..."
npx prisma generate --silent 2>/dev/null || true

if [ -d "prisma/migrations" ]; then
    npx prisma migrate deploy && log "Migration OK" || warn "Migration có lỗi — tiếp tục seed"
else
    npx prisma db push --accept-data-loss && log "DB Push OK" || warn "DB Push có lỗi — tiếp tục seed"
fi

echo ""

# ── Files cần bỏ qua hoặc xử lý đặc biệt ────────────────────
SKIP_FILES=(
    "check-depts.js"       # schema đã đổi, field clientId không còn
    "seed-companyInfo.js"  # seed LeeTech (sai công ty)
    "seed-all.js"          # conflict shortName với seed-admin.js
    "copy-logo-to-child.js" # Requires CLI arguments
    "fix-client-shortname.js" # Maintenance script
)

should_skip() {
    local f="$1"
    for skip in "${SKIP_FILES[@]}"; do
        [[ "$f" == "$skip" ]] && return 0
    done
    return 1
}

# ── 2. Auto-run prisma/*.{js,ts} theo thứ tự a-z ─────────────
info "Tìm seed files trong prisma/..."

SEED_FILES=$(ls "${APP_DIR}"/prisma/*.js "${APP_DIR}"/prisma/*.ts 2>/dev/null | sort)

if [ -z "${SEED_FILES}" ]; then
    warn "Không tìm thấy seed file nào"
    exit 0
fi

PASS=0; FAIL=0; SKIPPED=0
for FILE in ${SEED_FILES}; do
    BASENAME=$(basename "${FILE}")

    if should_skip "${BASENAME}"; then
        warn "Skip: ${BASENAME} (excluded)"
        SKIPPED=$((SKIPPED+1))
        continue
    fi

    info "Running: ${BASENAME}..."
    if [[ "${FILE}" == *.ts ]]; then
        npx tsx "${FILE}" \
            && { log "${BASENAME} ✅"; PASS=$((PASS+1)); } \
            || { warn "${BASENAME} ❌ (bỏ qua)"; FAIL=$((FAIL+1)); }
    else
        node "${FILE}" \
            && { log "${BASENAME} ✅"; PASS=$((PASS+1)); } \
            || { warn "${BASENAME} ❌ (bỏ qua)"; FAIL=$((FAIL+1)); }
    fi
    echo ""
done

echo -e "${GREEN}${BOLD}✅  Seed xong: ${PASS} thành công, ${FAIL} lỗi, ${SKIPPED} bỏ qua${NC}"
echo ""
