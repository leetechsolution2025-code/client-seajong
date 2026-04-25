import { PageHeader } from "@/components/layout/PageHeader";

export default function QaPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Đảm bảo chất lượng"
        description="Quality Assurance · Kiểm tra, tiêu chuẩn & kiểm soát lỗi"
        color="emerald"
        icon="bi-patch-check"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
