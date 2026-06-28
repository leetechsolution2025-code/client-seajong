import { PageHeader } from "@/components/layout/PageHeader";

export default function ProductPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Sản phẩm"
        description="Product Management · Roadmap, tính năng & phản hồi khách hàng"
        color="indigo"
        icon="bi-box-seam"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
