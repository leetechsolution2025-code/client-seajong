import { PageHeader } from "@/components/layout/PageHeader";

export default function PurchaseOrdersPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Đơn mua hàng (PO)"
        description="Quản lý tiến độ nhập hàng từ nhà cung cấp"
        icon="bi-cart-check"
        color="indigo"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
