import { PageHeader } from "@/components/layout/PageHeader";

export default function CreditLimitPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Hạn mức công nợ"
        description="Quản lý ngưỡng nợ và phê duyệt lệnh xuất kho"
        icon="bi-shield-check"
        color="rose"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
