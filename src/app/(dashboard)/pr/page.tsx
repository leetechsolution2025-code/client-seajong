import { PageHeader } from "@/components/layout/PageHeader";

export default function PrPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Quan hệ công chúng"
        description="Public Relations · Truyền thông, báo chí & quản lý khủng hoảng"
        color="rose"
        icon="bi-broadcast"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
