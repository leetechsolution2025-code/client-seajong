# 0. Load cấu hình
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SCRIPT_DIR}/config.sh" ]; then
    source "${SCRIPT_DIR}/config.sh"
fi
PORT=${PORT:-3000}

clear
echo "=========================================================="
echo "   🚀 TIỆN ÍCH THIẾT LẬP WEBHOOK TUYỂN DỤNG (TOPCV)       "
echo "=========================================================="

# 1. Kiểm tra môi trường
echo "1. Đang kiểm tra môi trường local..."

# Kiểm tra ngrok
HAS_NGROK=false
if command -v ngrok &> /dev/null; then
    HAS_NGROK=true
fi

if [ "$HAS_NGROK" = true ]; then
    echo "✅ Ngrok đã sẵn sàng."
else
    echo "ℹ️ Không tìm thấy 'ngrok'. Đừng lo, chúng ta sẽ dùng 'localtunnel' qua npm."
fi

# 2. Hướng dẫn chạy
echo ""
echo "2. Hướng dẫn kết nối:"
echo "----------------------------------------------------------"
if [ "$HAS_NGROK" = true ]; then
    echo "CÁCH 1: Dùng Ngrok (Khuyên dùng)"
    echo "   Lệnh: ngrok http ${PORT}"
else
    echo "CÁCH: Dùng Localtunnel (Không cần cài đặt)"
    echo "   BƯỚC A: Mở một terminal mới và chạy lệnh sau:"
    echo "      npx localtunnel --port ${PORT}"
    echo ""
    echo "   BƯỚC B: Sau khi chạy, bạn sẽ nhận được link 'your url is: ...'"
    echo "           (VD: https://heavy-cows-jump.loca.lt)"
    echo ""
    echo "   BƯỚC C: Copy link đó dán vào TopCV:"
    echo "      URL Webhook: [Link-Của-Bạn]/api/hr/recruitment/webhook/topcv"
fi
echo "----------------------------------------------------------"

# 3. Chức năng chạy thử (Simulate)
echo ""
echo "3. Bạn có muốn gửi một ỨNG VIÊN GIẢ LẬP để kiểm tra ngay không? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
    echo "Nhập tên vị trí tuyển dụng muốn khớp (VD: Nhân viên bán hàng):"
    read -r position
    
    echo "🚀 Đang gửi dữ liệu giả lập tới localhost:${PORT}..."
    
    curl -X POST http://localhost:${PORT}/api/hr/recruitment/webhook/topcv \
    -H "Content-Type: application/json" \
    -d "{
      \"candidate_name\": \"Nguyễn Ứng Viên (Test)\",
      \"job_title\": \"$position\",
      \"phone\": \"0987654321\",
      \"email\": \"test_candidate@gmail.com\",
      \"cv_url\": \"https://topcv.vn/view-cv/example\",
      \"experience\": \"3 năm kinh nghiệm thực tế\",
      \"summary\": \"Đây là ứng viên được gửi từ công cụ test nội bộ.\"
    }"
    
    echo ""
    echo "✅ Đã gửi xong! Hãy kiểm tra tab 'Ứng viên' trên phần mềm."
fi

echo ""
echo "=========================================================="
echo "Tiện ích kết thúc. Chúc bạn tuyển dụng thành công! 🎯"
echo "=========================================================="
