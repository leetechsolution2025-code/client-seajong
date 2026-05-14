import { PageHeader } from "@/components/layout/PageHeader";
import { PartnerDashboard } from "@/components/sales/partners/PartnerDashboard";

export default function PartnersPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Danh sách đại lý"
        description="Quản lý phễu phát triển và danh sách đại lý chính thức"
        icon="bi-person-badge"
        color="blue"
      />
      
      <div className="flex-grow-1 overflow-y-auto">
        <PartnerDashboard />
      </div>
    </div>
  );
}
