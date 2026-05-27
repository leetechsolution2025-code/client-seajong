#!/bin/bash
# =============================================================
# V-LeeTech — Deploy Script (Chạy mỗi khi có code mới)
# Cách dùng:
#   bash scripts/deploy.sh
# =============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Load cấu hình deploy tập trung ──────────────────────
# shellcheck source=scripts/config.sh
source "${APP_DIR}/scripts/config.sh"

# ── Load NVM (cần thiết khi chạy non-interactive shell) ──────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Nếu npm vẫn không tìm thấy, thử tìm trong các vị trí phổ biến
if ! command -v npm &>/dev/null; then
    for CANDIDATE in /usr/local/bin/npm /usr/bin/npm "$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin/npm"; do
        [ -x "$CANDIDATE" ] && export PATH="$(dirname $CANDIDATE):$PATH" && break
    done
fi

command -v npm &>/dev/null || { echo -e "\033[0;31m[✗]\033[0m npm không tìm thấy! Hãy cài Node.js trước."; exit 1; }

# ── Tự động cài PM2 nếu chưa có ─────────────────────────────
if ! command -v pm2 &>/dev/null; then
    warn "PM2 chưa được cài. Đang cài tự động..."
    npm install -g pm2
    # Thêm npm global bin vào PATH
    export PATH="$(npm root -g)/../.bin:$PATH"
fi

command -v pm2 &>/dev/null || err "Không thể cài PM2. Hãy chạy: npm install -g pm2"
log "PM2 sẵn sàng ($(pm2 -v))"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     V-LeeTech Deploy Script v1.1          ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo -e "  Thư mục: ${APP_DIR}"
echo -e "  Thời gian: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd "${APP_DIR}"

# ── Kiểm tra file .env ───────────────────────────────────────
[ -f ".env" ] || err "Không tìm thấy .env! Hãy tạo file .env trước."
grep -q "GEMINI_API_KEYS=\"KEY_1" .env && err "Chưa điền GEMINI_API_KEYS trong .env!"
log "File .env hợp lệ"

# ── Pull code mới nhất ───────────────────────────────────────
info "Kéo code mới từ Git..."
# Reset package-lock.json để tránh conflict khi npm install đã thay đổi nó
git checkout -- package-lock.json 2>/dev/null || true
git pull --rebase
log "Code đã cập nhật ($(git log -1 --format='%h %s'))"

# ── Cài dependencies ─────────────────────────────────────────
info "Cài npm dependencies..."
npm install --prefer-offline
log "Dependencies đã cài"

# ── Prisma ───────────────────────────────────────────────────
info "Tạo Prisma Client..."
npx prisma generate

info "Chạy database migration..."
if [ -d "prisma/migrations" ]; then
    # Thử chạy migrate deploy, nếu lỗi P3005 và có 0_init thì tự động resolve
    if ! npx prisma migrate deploy; then
        if [ -d "prisma/migrations/0_init" ]; then
            warn "Phát hiện database đã có dữ liệu. Đang thực hiện baseline với 0_init..."
            npx prisma migrate resolve --applied 0_init
            npx prisma migrate deploy || warn "Deploy migration gặp lỗi, sẽ fallback qua db push."
        else
            err "Migration thất bại. Hãy kiểm tra log ở trên."
        fi
    fi
    # Đồng bộ ép buộc để tạo các cột bị thiếu (nếu có) sau khi baseline
    info "Kiểm tra và vá các cột còn thiếu (db push)..."
    npx prisma db push --accept-data-loss
else
    npx prisma db push --accept-data-loss
fi
log "Database đã migration và đồng bộ hoàn toàn"

# ── Seed database (chỉ khi DB trống) ─────────────────────────
info "Chạy seed database..."
bash "${APP_DIR}/scripts/seed.sh"

# ── Dừng app cũ trước khi build (tránh EADDRINUSE) ──────────
info "Dừng app cũ trước khi build..."
if pm2 list | grep -q "${APP_NAME}"; then
    pm2 stop "${APP_NAME}" 2>/dev/null || true
    log "App cũ đã dừng"
fi
# Kill orphan process đang chiếm port (phòng trường hợp pm2 không dừng kịp)
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 2

# ── Build ─────────────────────────────────────────────────────
info "Build production... (có thể mất 3-8 phút)"
BUILD_START=$(date +%s)
npm run build
BUILD_END=$(date +%s)
log "Build xong trong $((BUILD_END - BUILD_START)) giây"

# ── Khởi động / Restart PM2 ──────────────────────────────────
info "Khởi động app với PM2..."

# Ecosystem cập nhật PORT đúng
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

# Dùng delete + start thay vì reload để đảm bảo code mới được nạp hoàn toàn
if pm2 list | grep -q "${APP_NAME}"; then
    pm2 delete "${APP_NAME}" 2>/dev/null || true
fi
pm2 start ecosystem.config.js
pm2 startup 2>/dev/null | grep "sudo" | bash || true
pm2 save
log "App đã khởi động với code mới"

# ── Thêm NVM vào .bashrc nếu chưa có (fix PATH vĩnh viễn) ────
if ! grep -q "NVM_DIR" ~/.bashrc 2>/dev/null; then
    echo '' >> ~/.bashrc
    echo '# Node Version Manager' >> ~/.bashrc
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
    log "Đã thêm NVM vào ~/.bashrc (có hiệu lực lần login sau)"
fi

# ── Cập nhật Nginx config ─────────────────────────────────
if command -v nginx &>/dev/null; then
    # Ưu tiên DOMAIN từ config.sh, fallback: server_name cũ hoặc IP
    if [ -z "${DOMAIN}" ] && [ -f "${NGINX_CONF}" ]; then
        DOMAIN=$(grep 'server_name' "${NGINX_CONF}" 2>/dev/null | awk '{print $2}' | tr -d ';' | grep -v '_' | head -1 || true)
    fi
    SERVER_NAME="${DOMAIN:-$(curl -s --max-time 3 ifconfig.me 2>/dev/null || echo '_')}"

    mkdir -p "$(dirname ${NGINX_CONF})"

    if [ -n "${DOMAIN}" ]; then
        # ── Cài certbot nếu chưa có ──────────────────────────
        if ! command -v certbot &>/dev/null; then
            info "Cài certbot..."
            apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null || \
                warn "Không cài được certbot — dùng HTTP tạm thời"
        fi

        # ── Viết config HTTP trước (certbot cần 80 để verify) ─
        info "Cấu hình Nginx HTTP cho domain ${DOMAIN}..."
        cat > "${NGINX_CONF}" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:${PORT};
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
NGINX
        ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${APP_NAME}" 2>/dev/null || true
        nginx -t && systemctl reload nginx || true

        # ── Lấy / gia hạn cert Let's Encrypt ─────────────────
        if command -v certbot &>/dev/null; then
            info "Lấy SSL cert cho ${DOMAIN}..."
            certbot --nginx -d "${DOMAIN}" \
                --non-interactive --agree-tos \
                --email "admin@${DOMAIN}" \
                --redirect 2>/dev/null \
                && log "HTTPS đã kích hoạt → https://${DOMAIN}" \
                || warn "certbot thất bại — vẫn chạy HTTP, kiểm tra DNS trỏ đúng IP"

            # ── Auto-renew: bật systemd timer (nếu có) ───────
            if systemctl list-timers 2>/dev/null | grep -q "certbot"; then
                systemctl enable certbot.timer 2>/dev/null || true
                systemctl start  certbot.timer 2>/dev/null || true
                log "Certbot systemd timer đã bật (tự renew 2 lần/ngày)"
            else
                # Fallback: cron job chạy 2 lần/ngày
                CRON_JOB="0 3,15 * * * certbot renew --quiet --nginx && systemctl reload nginx"
                if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
                    (crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -
                    log "Certbot cron job đã thêm (tự renew lúc 3h và 15h)"
                else
                    log "Certbot cron job đã tồn tại"
                fi
            fi
        fi
    else
        # ── Không có domain → HTTP với IP ─────────────────────
        info "Cấu hình Nginx HTTP (IP: ${SERVER_NAME})..."
        cat > "${NGINX_CONF}" <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};

    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:${PORT};
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
NGINX
        ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${APP_NAME}" 2>/dev/null || true
        nginx -t && systemctl reload nginx \
            && log "Nginx HTTP → http://${SERVER_NAME}" \
            || warn "Nginx config lỗi — kiểm tra: nginx -t"
    fi
else
    warn "Nginx chưa được cài — bỏ qua bước cập nhật Nginx"
fi


# ── Kiểm tra sức khoẻ ────────────────────────────────────────
info "Kiểm tra app đang chạy..."
sleep 5
if curl -sf "http://localhost:${PORT}" > /dev/null 2>&1; then
    log "App đang phản hồi tại http://localhost:${PORT} ✅"
else
    warn "App chưa phản hồi — xem log: pm2 logs ${APP_NAME}"
fi

# ── Hoàn tất ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  ✅  Deploy thành công!                    ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Lệnh hữu ích:${NC}"
echo -e "  pm2 status                # Xem trạng thái"
echo -e "  pm2 logs ${APP_NAME}     # Xem log real-time"
echo -e "  pm2 restart ${APP_NAME}  # Restart app"
echo ""
echo -e "  ${BOLD}Tài khoản mặc định:${NC}"
echo -e "  admin@${DOMAIN:-example.com}  / Admin@123"
echo ""
