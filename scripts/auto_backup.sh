#!/bin/bash
# auto_backup.sh - Tự động sao lưu cơ sở dữ liệu Seajong và dọn dẹp file cũ

# 1. Chuyển đến thư mục gốc của dự án
cd "$(dirname "$0")/.." || exit 1

# 2. Định nghĩa thư mục backup
BACKUP_DIR="backup_data"
mkdir -p "$BACKUP_DIR"

# 3. Lấy tên file DB từ file .env (nếu có)
DB_FILE="prisma/prod.db" # Mặc định
if [ -f ".env" ]; then
    # Tìm dòng DATABASE_URL="file:./xxx.db" và trích xuất tên file
    DB_URL=$(grep "DATABASE_URL" .env | cut -d '"' -f 2)
    if [[ "$DB_URL" == file:./* ]]; then
        DB_NAME=${DB_URL#file:./}
        DB_FILE="prisma/$DB_NAME"
    fi
fi

# 4. Kiểm tra xem file DB có tồn tại không
if [ ! -f "$DB_FILE" ]; then
    echo "Lỗi: Không tìm thấy file cơ sở dữ liệu tại $DB_FILE"
    exit 1
fi

# 5. Tạo file sao lưu tự động với timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_PATH="$BACKUP_DIR/auto_backup_${TIMESTAMP}.db"

cp "$DB_FILE" "$BACKUP_PATH"
echo "Đã sao lưu thành công: $BACKUP_PATH"

# 6. Dọn dẹp: Xóa các file sao lưu tự động cũ hơn 7 ngày
# Lệnh find tìm các file bắt đầu bằng auto_backup_ và cũ hơn 7 ngày để xóa
find "$BACKUP_DIR" -name "auto_backup_*.db" -type f -mtime +7 -delete
echo "Đã dọn dẹp các bản sao lưu cũ hơn 7 ngày."
