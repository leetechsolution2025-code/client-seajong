import { PageHeader } from "@/components/layout/PageHeader";

export default function ProductionPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Sản xuất"
        description="Production · Lệnh sản xuất, dây chuyền & tiến độ"
        color="blue"
        icon="bi-tools"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
