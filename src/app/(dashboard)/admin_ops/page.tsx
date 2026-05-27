import { PageHeader } from "@/components/layout/PageHeader";
import AdminOpsClient from "./AdminOpsClient";

export default function AdminOpsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Hành chính – Văn phòng"
        description="Administration & Office · Quản lý hành chính nội bộ"
        color="amber"
        icon="bi-clipboard2-check"
      />
      <div style={{ flex: 1, overflow: "auto" }}>
        <AdminOpsClient />
      </div>
    </div>
  );
}
