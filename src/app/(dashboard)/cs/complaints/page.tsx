import { StandardPage } from "@/components/layout/StandardPage";

export default function ComplaintsPage() {
  return (
    <StandardPage
      title="Xử lý khiếu nại"
      description="CRM · Tiếp nhận, xử lý và giải quyết khiếu nại từ khách hàng"
      icon="bi-exclamation-circle"
      color="rose"
      useCard={true}
    >
      <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
        Chức năng <strong>Xử lý khiếu nại</strong> đang được cập nhật nội dung...
      </div>
    </StandardPage>
  );
}
