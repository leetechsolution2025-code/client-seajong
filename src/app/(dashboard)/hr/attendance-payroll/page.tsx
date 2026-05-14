export const dynamic = "force-dynamic";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceManagement } from "@/components/hr/AttendanceManagement";

export default function AttendancePayrollPage() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Chấm công và tính lương"
        description="Quản lý dữ liệu chấm công, tính toán bảng lương và chi trả thu nhập"
        icon="bi-calculator"
        color="rose"
      />
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
          <AttendanceManagement />
        </div>
      </div>
    </div>
  );
}
