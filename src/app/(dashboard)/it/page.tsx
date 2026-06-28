import { PageHeader } from "@/components/layout/PageHeader";

export default function ITPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Công nghệ thông tin"
        description="Information Technology · Hạ tầng & hệ thống"
        color="indigo"
        icon="bi-cpu"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
