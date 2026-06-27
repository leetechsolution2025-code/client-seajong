# Quy tắc tính ngày công, làm thêm giờ (OT) và tính lương (Lee Tech)

Tài liệu này quy định logic tính toán ngày công làm việc, giờ làm thêm (OT) và bảng lương tháng của nhân viên tại Công ty TNHH MTV Tư vấn và Cung cấp Giải pháp số LEE-TECH, được áp dụng đồng bộ trên toàn hệ thống phần mềm quản lý nhân sự (HRM).

---

## 1. Xác định công chuẩn tháng
*   **Công chuẩn tháng (N_std):** Được tính bằng tổng số ngày trong tháng hiện hành trừ đi số ngày Chủ nhật của tháng đó (không cố định là 26 ngày).
*   **Thứ Bảy:** Được tính là ngày làm việc bình thường (Full công).
*   **Chủ Nhật:** Mặc định nghỉ, tính **0.0 công** (Nếu đi làm sẽ tính vào làm thêm giờ - OT).

| Tháng | Số ngày trong tháng | Số ngày Chủ nhật | Công chuẩn thực tế (N_std) |
| :---: | :---: | :---: | :---: |
| **Ví dụ: Tháng 5/2026** | 31 ngày | 5 ngày Chủ nhật | 31 - 5 = **26 ngày công chuẩn** |
| **Ví dụ: Tháng 6/2026** | 30 ngày | 4 ngày Chủ nhật | 30 - 4 = **26 ngày công chuẩn** |
| **Ví dụ: Tháng 2/2026** | 28 ngày | 4 ngày Chủ nhật | 28 - 4 = **24 ngày công chuẩn** |

---

## 2. Nguyên tắc chấm công theo Ca/Buổi
Một ngày làm việc tiêu chuẩn được chia làm 2 ca độc lập (Sáng và Chiều). Mỗi ca làm việc trọn vẹn đóng góp tối đa **0.5 ngày công**. Giờ làm việc tiêu chuẩn được lấy tự động từ **Nội quy lao động** được cấu hình trên hệ thống.

| Ca làm việc | Giờ chuẩn Mùa hè (Mặc định) | Giờ chuẩn Mùa đông (Tháng 11 - Tháng 3) | Điểm công tối đa | Điều kiện tính công |
| :--- | :---: | :---: | :---: | :--- |
| **Ca Sáng** | 08:00 - 12:00 | 08:30 - 12:00 | **0.5 công** | Phải có đủ cả dữ liệu quẹt thẻ `Vào sáng` và `Ra sáng` |
| **Ca Chiều** | 13:30 - 17:30 | 13:00 - 17:00 | **0.5 công** | Phải có đủ cả dữ liệu quẹt thẻ `Vào chiều` và `Ra chiều` |

*   **Thiếu 1 trong 2 quẹt (Quên chấm công):** Tính **0.0 công** của ca đó.
*   **Thời gian làm việc tối thiểu:** Nếu có đủ 2 đầu dữ liệu vào/ra ca sáng hoặc chiều nhưng tổng thời gian làm việc thực tế của ca đó **ít hơn 60 phút**, ca đó sẽ **không được tính công** (0.0 công) và ngày đó ghi nhận trạng thái **"Không đủ thời gian làm việc"** (INSUFFICIENT).

---

## 3. Xử lý vi phạm đi muộn và về sớm
Số phút vi phạm của mỗi ca làm việc = (Giờ vào thực tế - Giờ vào chuẩn) + (Giờ ra chuẩn - Giờ ra thực tế) *(Chỉ tính các giá trị dương).*

### 3.1. Các mức phạt trừ công (Áp dụng nếu không có phép):
Tùy thuộc vào tổng số phút vi phạm trong một ca làm việc, tỷ lệ hưởng công của ca đó sẽ được điều chỉnh:

| Tổng số phút vi phạm (phút) | Phân nhóm | Tỷ lệ hưởng công của ca | Điểm công thực nhận |
| :--- | :--- | :---: | :---: |
| **Dưới hoặc bằng 30** | Hợp lệ (Cho phép) | **100%** | **0.500 công** |
| **Từ 31 đến 60** | Cảnh cáo (Phạt 25%) | **75%** | **0.375 công** |
| **Trên 60** | Vi phạm nặng (Phạt 50%) | **50%** | **0.250 công** |

### 3.2. Trường hợp được duyệt đơn Đăng ký đi muộn / Về sớm:
*   Khi nhân viên có yêu cầu đi muộn hoặc về sớm được phê duyệt chấp nhận (**APPROVED**), **mốc thời gian để chấm công của ca tương ứng sẽ được lấy theo mốc thời gian được ghi trong yêu cầu**.
*   Số phút vi phạm (nếu có) của nhân viên vẫn sẽ được tính toán dựa trên mốc thời gian yêu cầu mới này (thay vì mốc giờ chuẩn của công ty).
*   Ca làm việc đó được đánh dấu là **"Có phép"** trên hệ thống và nhân viên hưởng tỷ lệ công dựa trên số phút vi phạm so với mốc yêu cầu mới đó.

---

## 4. Ngày Lễ và Nghỉ phép
*   **Ngày Lễ / Tết (L):** Hệ thống tự động ghi nhận **1.0 công** (không cần dữ liệu quẹt thẻ chấm công thực tế).
*   **Phân loại chế độ Nghỉ phép và Công tác (khi được APPROVED):**

| Loại đơn đăng ký | Cách tính công của công ty | Chế độ Lương & Bảo hiểm | Ghi chú & Quy định áp dụng |
| :--- | :---: | :--- | :--- |
| **Phép năm** | **1.0 công** | Hưởng 100% lương từ công ty | Giảm trừ trực tiếp vào quỹ phép năm của nhân viên. |
| **Nghỉ việc riêng có lương** | **1.0 công** | Hưởng 100% lương từ công ty | Áp dụng cho: Bản thân kết hôn (3 ngày), con kết hôn (1 ngày), tang chế người thân ruột thịt (3 ngày). |
| **Nghỉ ốm có BHXH** | **0.0 công** | Công ty không trả lương. Nhận trợ cấp 75% lương đóng BHXH từ cơ quan BHXH | Yêu cầu nhân viên nộp lại **Giấy chứng nhận nghỉ việc hưởng BHXH** (Mẫu C65-HD) hoặc Giấy ra viện hợp lệ. |
| **Nghỉ không lương** | **0.0 công** | Không hưởng lương | Nghỉ việc riêng lý do chính đáng được duyệt, không bị tính lỗi vi phạm kỷ luật chuyên cần. |
| **Công tác / Đi làm việc ngoài** | **1.0 công** | Hưởng 100% lương + Phụ cấp công tác (nếu có) | Tính công đầy đủ dựa trên thời gian ghi trên đơn đã duyệt. |
| **Nghỉ không phép (Tự ý vắng)** | **0.0 công** | Không hưởng lương | Vi phạm kỷ luật lao động. Bị giảm trừ KPI/chuyên cần và xử lý kỷ luật theo quy định. |

---

## 5. Làm thêm giờ (OT)
*   **Điều kiện tính OT:** Thời gian làm thêm sau giờ tan sở buổi chiều (`Ra chiều`) phải đạt tối thiểu từ **30 phút** trở lên.

| Ngày làm việc | Hệ số nhân OT | Công thức tính giờ OT quy đổi |
| :--- | :---: | :--- |
| **Ngày thường & Thứ Bảy (Thứ 2 - Thứ 7)** | **x1.5** | Giờ OT quy đổi = (Số phút làm thêm thực tế / 60) * 1.5 |
| **Chủ Nhật** | **x2.0** | Giờ OT quy đổi = (Số phút làm thêm thực tế / 60) * 2.0 |
| **Ngày Lễ / Tết** | **x3.0** | Giờ OT quy đổi = (Số phút làm thêm thực tế / 60) * 3.0 |

---

## 6. Quy tắc tính lương tháng (Payroll Formulas)
Bảng lương của nhân viên được tính toán tự động dựa trên tổng công, giờ làm thêm và các đãi ngộ tài chính đã thiết lập:

### 6.1. Các công thức tính thu nhập

| Khoản thu nhập | Công thức tính chi tiết | Chú thích |
| :--- | :--- | :--- |
| **1. Lương theo công thực tế (S_work)** | **S_work = (Lương cơ bản / N_std) * Tổng điểm công tháng** | *N_std là Số ngày công chuẩn của tháng hiện hành (Số ngày trong tháng - số ngày Chủ nhật).* |
| **2. Tổng phụ cấp (A_total)** | **A_total = Phụ cấp ăn trưa + Phụ cấp xăng xe + Phụ cấp điện thoại + Phụ cấp thâm niên** | *Các khoản phụ cấp cố định theo hợp đồng.* |
| **3. Lương làm thêm giờ (S_ot)** | **S_ot = Tổng giờ OT quy đổi * (Lương cơ bản / N_std / 8)** | *Tính trên lương giờ làm việc tiêu chuẩn.* |
| **4. Các khoản thưởng** | **Thưởng hiệu quả + Thưởng nóng** | *Nhập thủ công hoặc tính theo hiệu suất.* |

### 6.2. Các khoản khấu trừ và Lương thực nhận

| Khoản tính toán | Công thức tính chi tiết | Chú thích |
| :--- | :--- | :--- |
| **1. Khấu trừ bảo hiểm (D_ins)** | **D_ins = Lương cơ bản * 10.5%** | *BHXH, BHYT, BHTN do nhân viên tự đóng.* |
| **2. Khấu trừ thuế TNCN (D_pit)** | **Theo biểu thuế thu nhập cá nhân hiện hành** | *Tính dựa trên thu nhập chịu thuế.* |
| **3. Khấu trừ khác (D_misc)** | **Tạm ứng lương + Các khoản phạt vi phạm** | *Nhập thủ công trong kỳ.* |
| **LƯƠNG THỰC NHẬN (S_net)** | **S_net = S_work + A_total + Thưởng + S_ot - D_ins - D_pit - D_misc** | **Số tiền thực nhận chuyển khoản cho nhân viên.** |

---

## 7. Tổng chi phí doanh nghiệp phải chi trả

| Khoản chi phí | Công thức tính chi tiết | Chú thích |
| :--- | :--- | :--- |
| **1. Bảo hiểm doanh nghiệp đóng (I_corp)** | **I_corp = Lương cơ bản * 23.5%** | *BHXH, BHYT, BHTN do công ty đóng cho nhân viên.* |
| **2. Tổng chi phí nhân sự thực tế (C_total)** | **C_total = S_net + I_corp** | **Tổng ngân sách thực tế doanh nghiệp phải chi.** |
