import { PageHeader } from "@/components/layout/PageHeader";

export default function RdPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Nghiên cứu & Phát triển"
        description="R&D · Sáng kiến, thử nghiệm & quản lý bằng sáng chế"
        color="violet"
        icon="bi-lightbulb"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
