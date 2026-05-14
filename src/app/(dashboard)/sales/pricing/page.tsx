import { PageHeader } from "@/components/layout/PageHeader";

export default function PricingPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Chính sách và bảng giá"
        description="Thiết lập bảng giá riêng biệt cho từng cấp đại lý"
        icon="bi-tags"
        color="violet"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
