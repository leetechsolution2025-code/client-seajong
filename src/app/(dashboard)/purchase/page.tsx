import { PageHeader } from "@/components/layout/PageHeader";

export default function PurchasePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Mua hàng"
        description="Purchasing · Quản lý nhà cung cấp, đơn mua & báo giá"
        color="amber"
        icon="bi-cart3"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
