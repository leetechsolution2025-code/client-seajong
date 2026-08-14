# Quy trình Mua hàng - Kiểm định - Xử lý lỗi - Nhập kho

Đây là quy trình chi tiết quản lý vòng đời mua sắm vật tư, nguyên liệu từ khi phát sinh nhu cầu đến khi nhập kho vật lý, kết hợp chặt chẽ với các chốt chặn kiểm định chất lượng (QA/QC) và kế toán công nợ.

## Bước 1: Khởi tạo Nhu cầu (Purchase Request)
- Các phòng ban lập **Phiếu yêu cầu mua hàng**.
- Các mặt hàng bên trong nằm ở trạng thái `Chờ xử lý`.

## Bước 2: Lập và Phê duyệt Đơn hàng (Purchase Order - PO)
- **Gom đơn:** Phòng Mua hàng gộp các mặt hàng theo Nhà cung cấp để tạo Đơn mua hàng (PO). Các mặt hàng chuyển sang trạng thái `Đã tạo đơn`.
- **Trình duyệt tự động:** Hệ thống tự động tạo **Yêu cầu phê duyệt** ưu tiên cao gửi sang Trưởng phòng Tài chính - Kế toán.
- **Huỷ/Xoá đơn an toàn:** Nếu phòng Mua hàng huỷ/xoá PO này, hệ thống sẽ tự động dọn dẹp sạch sẽ: Xoá yêu cầu phê duyệt đang chờ bên Kế toán và trả các mặt hàng về lại trạng thái `Chờ xử lý`.
- **Chốt đặt hàng:** Khi Kế toán duyệt, PO chuyển sang `Đã đặt hàng`. Hệ thống phát thông báo cho Kho vận (chuẩn bị đón hàng) và thông báo cho người tạo yêu cầu ban đầu.

## Bước 3: Nhận hàng & Chốt chặn Chất lượng (IQC)
- Khi hàng được chở đến kho, PO được nhân viên chuyển sang trạng thái `Đã nhận hàng`.
- Hệ thống lập tức phong toả lô hàng bằng cách **tự động sinh phiếu kiểm tra chất lượng đầu vào (IQC)**.
- Một thông báo khẩn được tự động ping cho phòng QA/QC xuống lấy mẫu kiểm định.

## Bước 4: Xử lý Kết quả, Hàng Lỗi & Giao thiếu (Defects & Shortage)
Khi QA/QC nhập kết quả kiểm tra:
- **Xử lý Hàng Lỗi (Defects):** Nếu có hàng lỗi (Failed Quantity > 0), mỗi mặt hàng lỗi được hệ thống tự động cấp một mã lỗi theo định dạng `ERR-YYYYMMDD-XX`, ghi nhận trạng thái `NEW` và khoá nguồn lỗi là `INTERNAL`. Tự động tạo lệnh công việc ưu tiên cao yêu cầu thủ kho nhập riêng phần hàng hỏng này vào kho cách ly **`KHO-LOI`**.
- **Xử lý Giao thiếu hàng (Shortage):** Hệ thống tự động đối chiếu lượng hàng thực nhận (Đạt + Lỗi) so với số lượng đặt hàng ban đầu trên PO. Nếu phát hiện nhà cung cấp giao thiếu:
  1. Cập nhật chính xác số lượng thực nhận vào hệ thống để ghi nhận chính xác dữ liệu nhập kho.
  2. Đổi trạng thái Đơn mua hàng (PO) sang **`Đang khiếu nại` (disputed)**.
  3. Bắn một thông báo khẩn cấp đỏ 🚨 riêng biệt cho phòng Mua hàng, liệt kê chi tiết tên mặt hàng, số lượng đặt, số lượng thực nhận và số lượng thiếu, để Mua hàng lập tức liên hệ nhà cung cấp xử lý bồi thường hoặc giao bù.

## Bước 5: Phân luồng Thông báo Thông minh (Smart Notifications)
Ngay khi phiếu QC hoàn tất, hệ thống tự động bắn tin báo cáo kết quả chéo cho 3 bên để đồng bộ luồng công việc:
1. **Đến Kho vận (Logistics):** Giao nhiệm vụ lập phiếu nhập kho số lượng hàng Đạt vào kho vật tư, và nhập hàng Lỗi vào `KHO-LOI`.
2. **Đến Kế toán (Finance):** Báo cáo số liệu Đạt/Lỗi chính xác để làm căn cứ cấn trừ công nợ, đảm bảo không thanh toán tiền cho lượng hàng bị hỏng.
3. **Đến Bộ phận liên đới trực tiếp:**
   - Nếu là hàng đầu vào (**IQC**), hệ thống báo động cho **phòng Mua hàng** để làm việc, yêu cầu nhà cung cấp đổi trả/bồi thường.
   - Nếu là thành phẩm/BTP (**OQC/PQC**), hệ thống báo động cho **phòng Sản xuất** để tính toán bù hao hụt.

## Bước 6: Nhập kho vật lý (Warehousing)
- Dựa trên các lệnh công việc đã nhận ở bước 5, thủ kho lập các **Phiếu nhập kho (Stock Movement)**.
- Chỉ khi các chứng từ Stock Movement này được lưu thành công, số lượng tồn kho vật lý (`soLuong`) trong cơ sở dữ liệu mới chính thức được cộng thêm. 
- Hệ thống tuân thủ nguyên tắc tuyệt đối: Các thao tác thay đổi trạng thái Đơn hàng, Phiếu yêu cầu hay Phiếu QC đều không làm thay đổi trực tiếp tồn kho.
