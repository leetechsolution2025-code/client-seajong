import { PageHeader } from "@/components/layout/PageHeader";

export default function SecurityPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Bảo vệ – An ninh"
        description="Security · Ca trực, kiểm soát ra vào & giám sát an ninh"
        color="indigo"
        icon="bi-shield-lock"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
