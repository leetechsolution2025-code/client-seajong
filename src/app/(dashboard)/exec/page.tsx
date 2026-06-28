import { PageHeader } from "@/components/layout/PageHeader";

export default function ExecPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Văn phòng Tổng GĐ"
        description="Executive Office · Điều phối & thư ký điều hành"
        color="violet"
        icon="bi-person-badge"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
