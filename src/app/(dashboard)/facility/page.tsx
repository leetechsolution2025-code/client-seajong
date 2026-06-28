import { PageHeader } from "@/components/layout/PageHeader";

export default function FacilityPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Kỹ thuật – CSVC"
        description="Facility Management · Tài sản, bảo trì & cơ sở vật chất"
        color="amber"
        icon="bi-wrench-adjustable"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
