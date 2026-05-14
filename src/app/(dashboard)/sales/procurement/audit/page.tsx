import { PageHeader } from "@/components/layout/PageHeader";

export default function SupplierAuditPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Đối soát NCC"
        description="Kiểm tra sai lệch giữa đơn mua và thực nhập"
        icon="bi-clipboard-check"
        color="amber"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
