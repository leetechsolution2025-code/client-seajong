import { PageHeader } from "@/components/layout/PageHeader";

export default function CsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Chăm sóc khách hàng"
        description="Customer Service · Hỗ trợ, khiếu nại & đánh giá khách hàng"
        color="cyan"
        icon="bi-headset"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
