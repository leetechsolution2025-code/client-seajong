import { PageHeader } from "@/components/layout/PageHeader";

export default function LegalPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Pháp chế"
        description="Legal & Compliance · Hợp đồng, tuân thủ & quản lý rủi ro"
        color="blue"
        icon="bi-shield-check"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
