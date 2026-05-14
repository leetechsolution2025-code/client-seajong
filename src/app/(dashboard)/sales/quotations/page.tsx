import { PageHeader } from "@/components/layout/PageHeader";

export default function QuotationsPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Báo giá (Quotation)"
        description="Khởi tạo báo giá và chuyển đổi đơn hàng nhanh chóng"
        icon="bi-file-text"
        color="cyan"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
