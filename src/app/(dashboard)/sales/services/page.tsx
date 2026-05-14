import { PageHeader } from "@/components/layout/PageHeader";

export default function ServicesPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Dịch vụ đi kèm"
        description="Quản lý phí vận chuyển và lắp đặt"
        icon="bi-plus-circle"
        color="emerald"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
