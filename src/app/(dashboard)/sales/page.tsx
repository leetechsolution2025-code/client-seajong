import { PageHeader } from "@/components/layout/PageHeader";

export default function SalesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Kinh doanh"
        description="Sales · Quản lý bán hàng & doanh thu"
        color="emerald"
        icon="bi-graph-up-arrow"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
