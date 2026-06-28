import { PageHeader } from "@/components/layout/PageHeader";

export default function BdPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Phát triển kinh doanh"
        description="Business Development · Đối tác, thị trường mới & cơ hội hợp tác"
        color="cyan"
        icon="bi-diagram-3"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
