# Quy tắc tính ngày công và OT (Lee Tech)

Tài liệu này quy định logic tính toán ngày công và giờ làm thêm (OT) thống nhất cho toàn hệ thống.

## 1. Xác định Công chuẩn tháng
- **Công chuẩn** = Tổng số ngày trong tháng - Các ngày Chủ Nhật.
- **Thứ 7** được tính là ngày làm việc bình thường (Full công).

## 2. Nguyên tắc chấm công theo Buổi
Một ngày làm việc được chia làm 2 buổi độc lập (Sáng và Chiều). Mỗi buổi tối đa **0.5 công**.

### Buổi Sáng:
- **Điều kiện:** Phải có đủ cặp dữ liệu `Vào sáng` và `Ra sáng`.
- **Thiếu 1 trong 2 quẹt:** 0 công sáng.
- **Cách tính:** 0.5 công * (Tỷ lệ hưởng công dựa trên vi phạm).

### Buổi Chiều:
- **Điều kiện:** Phải có đủ cặp dữ liệu `Vào chiều` và `Ra chiều`.
- **Thiếu 1 trong 2 quẹt:** 0 công chiều.
- **Cách tính:** 0.5 công * (Tỷ lệ hưởng công dựa trên vi phạm).

## 3. Xử lý Vi phạm (Đi muộn / Về sớm)
- **Số phút vi phạm** = `(Giờ vào thực tế - Giờ vào chuẩn)` + `(Giờ ra chuẩn - Giờ ra thực tế)`.
- **Các ngưỡng phạt (Áp dụng nếu không có phép):**
  - Vi phạm ≤ 30 phút: Hưởng **100%** công buổi đó (0.5).
  - Vi phạm 31 - 60 phút: Hưởng **75%** công buổi đó (0.375).
  - Vi phạm > 60 phút: Hưởng **50%** công buổi đó (0.25).
- **Trường hợp Có phép:** Nếu ngày đó được tích chọn "Có phép", nhân viên hưởng **100%** công bất kể số phút vi phạm.

## 4. Ngày Lễ và Nghỉ phép
- **Ngày Lễ/Tết (L):** Cộng **1.0 công** (mặc định, không cần dữ liệu quẹt thẻ).
- **Nghỉ phép (P):** Chỉ tính công cho các đơn xin nghỉ ở trạng thái **`APPROVED`**.

## 5. Làm thêm giờ (OT)
- **Điều kiện:** Thời gian làm thêm sau giờ tan sở (`Ra chiều`) phải ≥ **30 phút**.
- **Hệ số nhân:**
  - Ngày thường (T2-T6): **x1.5**
  - Thứ 7 & Chủ Nhật: **x2.0**
  - Ngày Lễ / Tết: **x3.0**
- **Cách tính:** `Giờ OT thực tế * Hệ số`.

## 6. Tổng hợp kết quả tháng
- **Tổng công hưởng lương** = Công đi làm thực tế + Công nghỉ lễ + Công nghỉ phép.
- **Tổng giờ OT** = Tổng giờ làm thêm đã nhân hệ số.
