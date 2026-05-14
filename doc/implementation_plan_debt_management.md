# Implementation Plan: Module Quản lý Công nợ

## 1. Tổng quan
Xây dựng hệ thống quản lý công nợ tập trung bao gồm: Phải thu (AR), Phải trả (AP) và Nợ vay ngân hàng. Hệ thống hỗ trợ theo dõi tuổi nợ, lập kế hoạch thanh toán và thống kê dòng tiền.

## 2. Thiết kế Cơ sở dữ liệu (Prisma Schema)

Cần bổ sung model `Debt` vào `schema.prisma`:

```prisma
model Debt {
  id              String    @id @default(cuid())
  type            String    // "RECEIVABLE" (Phải thu), "PAYABLE" (Phải trả), "LOAN" (Vay)
  partnerName     String    // Tên khách hàng / Nhà cung cấp / Ngân hàng
  amount          Float     @default(0) // Số tiền gốc
  paidAmount      Float     @default(0) // Số tiền đã trả/thu
  dueDate         DateTime? // Ngày đến hạn
  interestRate    Float?    // Lãi suất (dành cho vay ngân hàng)
  status          String    @default("UNPAID") // UNPAID, PARTIAL, PAID, OVERDUE
  description     String?   // Nội dung / Ghi chú
  referenceId     String?   // Mã hóa đơn / Hợp đồng liên quan
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([type])
  @@index([status])
}
```

## 3. Xây dựng API Routes

- `GET /api/finance/debts`: Lấy danh sách công nợ kèm bộ lọc (loại, trạng thái, tìm kiếm).
- `POST /api/finance/debts`: Tạo mới một khoản nợ.
- `PUT /api/finance/debts/[id]`: Cập nhật thông tin nợ hoặc ghi nhận thanh toán một phần/toàn bộ.
- `DELETE /api/finance/debts/[id]`: Xóa khoản nợ (cần ConfirmDialog).

## 4. Giao diện (Frontend)

### 4.1. Trang chính (`/finance/debts/page.tsx`)
- **Layout:** Sử dụng `StandardPage`.
- **Top Stats:** 4 thẻ `KPICard` (Tổng thu, Tổng trả, Nợ ngân hàng, Tỷ lệ quá hạn).
- **Navigation:** Sử dụng `ModernStepper` với 3 bước:
    1. `Phải thu (AR)`: Danh sách khách hàng nợ.
    2. `Phải trả (AP)`: Danh sách nợ nhà cung cấp.
    3. `Nợ vay (Loan)`: Chi tiết các khoản vay ngân hàng.
- **Toolbar:** Tìm kiếm, Lọc theo thời gian, Nút "Thêm công nợ".

### 4.2. Thành phần (Components)
- `DebtTable`: Bảng hiển thị dữ liệu với các cột: Đối tác, Số tiền, Còn lại, Ngày hạn, Trạng thái (có Badge màu), Hành động.
- `DebtFormOffcanvas`: Form thêm/sửa công nợ.
- `PaymentFormOffcanvas`: Form ghi nhận thu tiền/trả tiền nhanh.
- `AgingChart`: Biểu đồ phân tích tuổi nợ (sử dụng Chart.js hoặc CSS progress bars).

## 5. Kế hoạch thực hiện
1. **Giai đoạn 1:** Cập nhật Schema và chạy `npx prisma db push`.
2. **Giai đoạn 2:** Viết API CRUD cơ bản.
3. **Giai đoạn 3:** Xây dựng giao diện danh sách và bộ lọc.
4. **Giai đoạn 4:** Hoàn thiện các Form nhập liệu và logic tính toán tuổi nợ.
5. **Giai đoạn 5:** Tích hợp thông báo và xuất báo cáo (Excel).
