# Bước 4 – Giao diện Tuyển dụng & Báo cáo

## Mô tả

Màn hình tổng hợp toàn bộ ứng viên đã hoàn tất phỏng vấn (có ít nhất 1 phiếu `InterviewScorecard`), hỗ trợ trưởng bộ phận nhân sự soạn và xuất **Báo cáo Đề nghị Tuyển dụng** trình Giám đốc phê duyệt. Dữ liệu 100% từ DB thực tế.

## Bố cục giao diện đề xuất

### 1. Thanh công cụ trên (Top Toolbar)
- **Bộ lọc nhanh:** Lọc theo Vị trí (position) — lấy từ DB (Dropdown lấy danh sách distinct positions)
- **Badge thống kê:** Tổng ứng viên | Đề xuất nhận | Từ chối | Chờ quyết định
- **Nút "Xuất báo cáo":** Dropdown 2 lựa chọn:
  - Báo cáo theo vị trí đang lọc
  - Báo cáo tất cả vị trí

### 2. Bảng danh sách ứng viên (Main Table)
Mỗi row là một ứng viên kèm thông tin tổng hợp từ nhiều phiếu đánh giá:

| Cột | Nguồn dữ liệu |
|---|---|
| Tên ứng viên | `Candidate.name` |
| Vị trí ứng tuyển | `Candidate.position` |
| Số phiếu đánh giá | COUNT(`InterviewScorecard`) |
| Điểm TB | AVG(`totalScore`) |
| Quyết định đa số | MODE(`decision`) — HIRE/REJECT |
| Lương đề xuất TB | AVG(`salarySuggest`) |
| Thử việc | `probationSuggest` |
| Ngày phỏng vấn | `interviewTime` gần nhất |
| Trạng thái | Badge màu |
| Hành động | Xem chi tiết, Chọn vào báo cáo |

### 3. Drawer/Panel Chi tiết ứng viên (khi click vào row)
- Thông tin hồ sơ: tên, SĐT, email, nguồn, kinh nghiệm
- Danh sách **tất cả phiếu đánh giá** từ nhiều giám khảo (accordion)
- Mỗi phiếu: điểm chi tiết 5 tiêu chí, nhận xét, link ghi âm
- Ô nhập **"Quyết định cuối cùng"** (Nhận / Từ chối / Chờ thêm vòng)

### 4. Báo cáo xuất ra (PDF/HTML Print)
Cấu trúc báo cáo:
```
CÔNG TY LEE-TECH
BÁO CÁO ĐỀ NGHỊ TUYỂN DỤNG
Ngày: ... | Người lập: [session.user]
-----------------------------------------
STT | Tên | Vị trí | Điểm TB | Lương đề xuất | Quyết định | Ghi chú
1   | ... | ...    | 80/100  | 12.000.000    | Nhận       | ...
-----------------------------------------
Tổng: X ứng viên được đề nghị nhận / Y từ chối
Chữ ký người lập: ___
```

## API cần xây dựng

### [NEW] `GET /api/hr/recruitment/report-data`
Query tổng hợp:
```sql
SELECT 
  c.id, c.name, c.position, c.email, c.phone, c.experience, c.source,
  COUNT(s.id) as scorecardCount,
  AVG(s.totalScore) as avgScore,
  AVG(s.salarySuggest) as avgSalary,
  GROUP_CONCAT(s.decision) as decisions,
  MAX(s.interviewTime) as lastInterviewTime
FROM Candidate c
INNER JOIN InterviewScorecard s ON s.candidateId = c.id
GROUP BY c.id
ORDER BY avgScore DESC
```

## Open Questions

> [!IMPORTANT]
> **1. Quy trình phê duyệt:** Sau khi Báo cáo được lập, ai sẽ phê duyệt? Giám đốc có cần nhận notification hoặc có giao diện riêng để xem báo cáo và phê duyệt không?
>
> **2. Định dạng xuất báo cáo:** Bạn muốn xuất dạng **in thẳng từ trình duyệt (Print/PDF qua browser)** hay muốn tạo file **Excel/Word** thực sự?
>
> **3. Trạng thái ứng viên đủ điều kiện vào danh sách:** Tôi sẽ lấy tất cả ứng viên có ít nhất 1 `InterviewScorecard`, hay chỉ những ứng viên có trạng thái (`status`) cụ thể nào đó?
