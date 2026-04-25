import { PageHeader } from "@/components/layout/PageHeader";

export default function LogisticsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Kho vận – Logistics"
        description="Logistics & Warehouse · Quản lý kho hàng & vận chuyển"
        color="blue"
        icon="bi-truck"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
