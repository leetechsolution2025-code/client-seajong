import { PageHeader } from "@/components/layout/PageHeader";

export default function ReservationPage() {
  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Giữ hàng (Reservation)"
        description="Quản lý số lượng hàng đã đặt cọc hoặc đang giữ chỗ"
        icon="bi-lock"
        color="indigo"
      />
      <div className="p-4 flex-grow-1">
        {/* Content will be implemented here */}
      </div>
    </div>
  );
}
