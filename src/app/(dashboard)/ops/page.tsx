import { PageHeader } from "@/components/layout/PageHeader";

export default function OpsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Vận hành"
        description="Operations · Quy trình, KPI & điều phối công việc"
        color="amber"
        icon="bi-gear-wide-connected"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
