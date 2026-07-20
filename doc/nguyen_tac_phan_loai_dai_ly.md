# Nguyên tắc phân loại và đánh giá xếp hạng đại lý

Tài liệu này quy định các tiêu chí chấm điểm và tự động phân hạng đại lý (Kim cương, Vàng, Bạc) trong hệ thống quản lý của Seajong Faucet Việt Nam. Thuật toán này được chạy ngầm để đánh giá trạng thái "sức khỏe" kinh doanh của từng đại lý.

## 1. Tiêu chí đánh giá

Hệ thống dựa trên 3 tiêu chí cốt lõi để phân hạng:
1. **Tiến độ cam kết doanh số (YTD):** Tỷ lệ phần trăm doanh số thực tế so với doanh số cam kết năm (Tổng doanh số / Cam kết năm * 100).
2. **Tính ổn định của doanh thu:** Tần suất phát sinh giao dịch, sự liền mạch trong các tháng (không có hoặc ít tháng "trắng" doanh thu).
3. **Năng lực thanh toán & dòng tiền:** Tỷ lệ thanh toán đúng hạn và khả năng hấp thụ các chính sách chiết khấu thanh toán, mức độ nợ đọng.

---

## 2. Các cấp độ hạng đại lý

### 💎 Hạng Kim Cương (Diamond) - "Đối tác chiến lược"
* **Ký hiệu trong hệ thống:** `kim-cuong`
* **Tiến độ doanh số (YTD):** Luôn đạt **>= 100%** (hoặc bám sát tốc độ yêu cầu hằng tháng) so với cam kết năm.
* **Tính ổn định:** Biểu đồ doanh thu đi ngang ở mức cao hoặc đi lên, lấy hàng liên tục hằng tuần/tháng, không có tháng nào bị đứt gãy.
* **Năng lực thanh toán:** 100% thanh toán đúng hạn. Quét sạch công nợ ngay trong hạn mức, tận dụng tối đa gói "Chiết khấu thanh toán".

### 🥇 Hạng Vàng (Gold) - "Đối tác tiềm năng"
* **Ký hiệu trong hệ thống:** `vang`
* **Tiến độ doanh số (YTD):** Đạt từ **70% - 99%** so với tiến độ cam kết. Có khả năng về đích nếu được "push" vào cuối năm.
* **Tính ổn định:** Doanh thu có tính chu kỳ, có tháng tăng mạnh, tháng giảm nhẹ nhưng hiếm khi rơi về 0 quá 1-2 tháng liên tiếp.
* **Năng lực thanh toán:** Thanh toán khá tốt. Có thể còn nợ gối đầu nhưng luôn nằm trong hạn mức tín dụng cho phép, ít khi bị quá hạn.

### 🥈 Hạng Bạc (Silver) - "Đối tác rủi ro cao"
* **Ký hiệu trong hệ thống:** `bac`
* **Tiến độ doanh số (YTD):** Đạt **dưới 70%** (như trường hợp Đại lý chị Hương). Nguy cơ vỡ cam kết năm cực cao.
* **Tính ổn định:** Bán hàng bấp bênh, phụ thuộc vào công trình rải rác. Có những chuỗi tháng đứt gãy hoàn toàn.
* **Năng lực thanh toán:** Có thể thanh toán tốt theo từng đợt để lấy chiết khấu nhưng lại hay để rớt lại các khoản nợ lắt nhắt, cần kế toán đôn đốc thường xuyên.

---

## 3. Cơ chế tự động của hệ thống

- Hệ thống sẽ tự động tổng hợp **Doanh số thực tế** từ các đơn hàng phát sinh trong năm (từ 01/01 đến 31/12).
- So khớp với giá trị **Cam kết doanh số năm** ghi nhận từ các Hợp đồng đại lý hoặc Biên bản thỏa thuận.
- Tự động thay đổi hạng (rank) của đại lý trong Cơ sở dữ liệu và hiển thị nhãn dán tương ứng trên trang hồ sơ và các báo cáo hoạt động.
