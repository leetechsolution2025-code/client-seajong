"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { BrandButton } from "@/components/ui/BrandButton";

// ── Types ───────────────────────────────────────────────────────────────────
type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApprovalRequest {
  id: string;
  employeeId: string;
  employee: {
    fullName: string;
    code: string;
    avatarUrl: string | null;
    departmentName: string;
    userId: string | null;
    position: string;
  };
  type: string;
  startDate: string | null;
  endDate: string | null;
  reason: string | null;
  status: RequestStatus;
  hrApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Department {
  id: string;
  code: string;
  nameVi: string;
}

const STEP_ITEMS: ModernStepItem[] = [
  { id: "pending", title: "Duyệt yêu cầu", icon: "bi-check2-circle", num: 1, desc: "Phê duyệt và xử lý" },
  { id: "my_requests", title: "Đề xuất của tôi", icon: "bi-person-badge", num: 2, desc: "Theo dõi cá nhân" },
  { id: "history", title: "Lịch sử phê duyệt", icon: "bi-clock-history", num: 3, desc: "Tra cứu dữ liệu cũ" },
];

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  "leave": { label: "Nghỉ phép", color: "#6366f1" },
  "unpaid_leave": { label: "Nghỉ không lương", color: "#f59e0b" },
  "late": { label: "Đi muộn", color: "#ec4899" },
  "early": { label: "Về sớm", color: "#8b5cf6" },
  "overtime": { label: "Tăng ca", color: "#10b981" },
  "hr-request": { label: "Hành chính - Nhân sự", color: "#10b981" },
  "work": { label: "Công tác", color: "#f59e0b" },
  "business-trip": { label: "Công tác", color: "#f59e0b" },
};

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { success: toastSuccess, error: toastError } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<{ code: string, name: string }[]>([]);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejected: 0 });

  // UI State
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const activeTabId = useMemo(() => STEP_ITEMS.find(s => s.num === currentStep)?.id || "pending", [currentStep]);

  const monthOptions = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const options = [];
    for (let i = 1; i <= currentMonth; i++) {
      options.push({ label: `Tháng ${i}`, value: i.toString() });
    }
    return options;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, posRes] = await Promise.all([
        fetch(`/api/hr/approvals`),
        fetch(`/api/board/categories?type=position`)
      ]);

      if (res.ok) {
        const result = await res.json();
        setAllRequests(result.requests);
        setStats(result.stats);
        setDepartments(result.departments);
      }

      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(posData || []);
      }
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const filteredData = useMemo(() => {
    let filtered = [...allRequests];

    if (activeTabId === "pending") {
      filtered = filtered.filter(r => r.status === "PENDING" && r.employee.userId !== currentUserId);
    } else if (activeTabId === "my_requests") {
      filtered = filtered.filter(r => r.employee.userId === currentUserId);
    } else if (activeTabId === "history") {
      filtered = filtered.filter(r => r.status !== "PENDING" && r.employee.userId !== currentUserId);
    }

    if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter);
    if (activeTabId !== "my_requests" && deptFilter) {
       filtered = filtered.filter(r => r.employee.departmentName === deptFilter);
    }
    if (monthFilter) {
       filtered = filtered.filter(r => (new Date(r.createdAt).getMonth() + 1).toString() === monthFilter);
    }

    if (searchQuery) {
       const q = searchQuery.toLowerCase();
       filtered = filtered.filter(r => {
         const typeLabel = TYPE_MAP[r.type.toLowerCase()]?.label.toLowerCase() || "";
         return (
           r.employee.fullName.toLowerCase().includes(q) || 
           r.reason?.toLowerCase().includes(q) ||
           typeLabel.includes(q)
         );
       });
    }

    return filtered;
  }, [allRequests, activeTabId, statusFilter, deptFilter, monthFilter, searchQuery, currentUserId]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT" | "FORWARD_DIRECTOR", note?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (res.ok) {
        let msg = "Đã thực hiện";
        if (action === "APPROVE") msg = "Đã phê duyệt yêu cầu";
        else if (action === "REJECT") msg = "Đã từ chối yêu cầu";
        else if (action === "FORWARD_DIRECTOR") msg = "Đã trình lãnh đạo thành công";
        
        toastSuccess(msg);
        setRejectionModal({ open: false, id: null });
        setRejectionNote("");
        setSelectedRequest(null);
        fetchData();
      } else {
        const errMsg = await res.text();
        toastError(errMsg || "Lỗi xử lý");
      }
    } catch (error) {
      toastError("Lỗi hệ thống");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/hr/approvals/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        toastSuccess("Đã xóa yêu cầu thành công");
        setDeleteConfirm({ open: false, id: null });
        fetchData();
      } else {
        const errMsg = await res.text();
        toastError(errMsg || "Không thể xóa yêu cầu này");
      }
    } catch (error) {
      toastError("Lỗi hệ thống");
    } finally {
      setDeleteLoading(false);
    }
  };

  const requestColumns: TableColumn<ApprovalRequest>[] = [
    {
      header: "Người yêu cầu",
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <EmployeeAvatar name={r.employee.fullName} url={r.employee.avatarUrl} size={30} borderRadius={8} />
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: 12 }}>
              {r.employee.fullName} 
              {r.employee.userId === currentUserId && <span className="badge bg-primary-subtle text-primary border-0 ms-1" style={{ fontSize: 8 }}>Tôi</span>}
            </div>
            <div className="text-muted" style={{ fontSize: 10 }}>
              {getPositionName(r.employee.position)} • {r.employee.departmentName}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Nội dung đề xuất",
      render: (r) => {
        const config = TYPE_MAP[r.type.toLowerCase()] || { label: r.type, color: "#64748b" };
        return (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge rounded-pill" style={{ background: `${config.color}15`, color: config.color, fontSize: 10 }}>
                {config.label}
              </span>
              <span className="text-muted fw-medium" style={{ fontSize: 11 }}>
                {r.startDate ? new Date(r.startDate).toLocaleDateString("vi-VN") : "N/A"}
                {r.endDate && ` - ${new Date(r.endDate).toLocaleDateString("vi-VN")}`}
              </span>
            </div>
            <div className="text-muted text-truncate" style={{ fontSize: 11, maxWidth: 250 }}>{r.reason || "Không có lý do chi tiết"}</div>
          </div>
        );
      }
    },
    {
      header: "Ngày tạo",
      render: (r) => <span className="text-muted" style={{ fontSize: 11 }}>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>,
      width: "120px",
      align: "center"
    },
    {
      header: "Trạng thái",
      render: (r) => {
        const map = {
          PENDING: { 
             label: r.hrApproved ? "Trình lãnh đạo" : "Chờ duyệt", 
             cls: r.hrApproved ? "bg-info-subtle text-info border-info" : "bg-warning-subtle text-warning border-warning" 
          },
          APPROVED: { label: "Đã duyệt", cls: "bg-success-subtle text-success border-success" },
          REJECTED: { label: "Từ chối", cls: "bg-danger-subtle text-danger border-danger" },
        };
        const m = map[r.status] || map.PENDING;
        return <span className={`badge border rounded-pill px-2 ${m.cls}`} style={{ fontSize: 10 }}>{m.label}</span>;
      },
      width: "120px",
      align: "center"
    },
    {
      header: "Thao tác",
      render: (r) => (
        <div className="d-flex justify-content-end gap-1" onClick={(e) => e.stopPropagation()}>
          {activeTabId === "my_requests" ? (
             <button 
              className={`btn btn-light btn-sm border-0 ${r.status === "APPROVED" ? "opacity-50 cursor-not-allowed" : ""}`} 
              title={r.status === "APPROVED" ? "Không thể xóa đơn đã duyệt" : "Xóa yêu cầu"}
              disabled={r.status === "APPROVED"}
              onClick={() => setDeleteConfirm({ open: true, id: r.id })}
            >
              <i className="bi bi-trash3 text-danger" />
            </button>
          ) : (
            <>
              {activeTabId === "pending" && r.status === "PENDING" && !r.hrApproved && (
                <>
                  <button className="btn btn-light btn-sm border-0" title="Duyệt" onClick={() => handleAction(r.id, "APPROVE")}>
                    <i className="bi bi-check-lg text-success" />
                  </button>
                  <button className="btn btn-light btn-sm border-0" title="Trình lãnh đạo" onClick={() => handleAction(r.id, "FORWARD_DIRECTOR")}>
                    <i className="bi bi-send text-info" />
                  </button>
                  <button className="btn btn-light btn-sm border-0" title="Từ chối" onClick={() => setRejectionModal({ open: true, id: r.id })}>
                    <i className="bi bi-x-lg text-danger" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      ),
      width: "120px",
      align: "right"
    }
  ];

  const ApprovalsBottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100 px-3" style={{ minHeight: 48 }}>
      <div className="d-flex align-items-center gap-2">
        {activeTabId !== "my_requests" && (
          <FilterSelect
            placeholder="Tất cả phòng ban"
            options={departments.map(d => ({ label: d.nameVi, value: d.nameVi }))}
            value={deptFilter}
            onChange={setDeptFilter}
            width={180}
            className="border-0 shadow-sm hover-bg-light transition-all"
          />
        )}
        <SearchInput
          placeholder={activeTabId === "my_requests" ? "Tìm kiếm nội dung..." : "Tìm nhân viên, nội dung..."}
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: activeTabId === "my_requests" ? 300 : 220 }}
          className="border-0 shadow-sm transition-all"
        />
        <FilterSelect
          placeholder="Trạng thái"
          options={[
            { label: "Chờ duyệt", value: "PENDING" },
            { label: "Đã duyệt", value: "APPROVED" },
            { label: "Từ chối", value: "REJECTED" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          width={130}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <FilterSelect
          placeholder="Tháng"
          options={monthOptions}
          value={monthFilter}
          onChange={setMonthFilter}
          width={110}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="bg-white rounded-pill px-3 py-1 border shadow-sm d-flex gap-3" style={{ fontSize: 11 }}>
          <span className="text-warning fw-bold">{stats.pending} chờ</span>
          <span className="text-info fw-bold">{stats.approvedToday} duyệt</span>
          <span className="text-danger fw-bold">{stats.rejected} lỗi</span>
        </div>
        <div className="border-start ps-3 fw-bold text-muted" style={{ fontSize: 12 }}>Tổng: {filteredData.length}/{allRequests.length}</div>
      </div>
    </div>
  );

  return (
    <StandardPage
      title="Đề xuất và duyệt đề xuất"
      description="Quản lý và phê duyệt các yêu cầu từ nhân viên toàn công ty"
      icon="bi-check2-square"
      color="rose"
      useCard={false}
    >
      <div className="flex-grow-1 d-flex flex-column gap-3 overflow-hidden">
        
        {/* KPI Cards */}
        <div className="row g-3">
          <KPICard label="Chờ phê duyệt" value={loading ? "—" : stats.pending} icon="bi-clock-history" accent="#f59e0b" subtitle="Cần xử lý ngay" colClass="col-12 col-md-3" />
          <KPICard label="Đã duyệt hôm nay" value={loading ? "—" : stats.approvedToday} icon="bi-check-circle" accent="#10b981" subtitle="Hiệu suất xử lý" colClass="col-12 col-md-3" />
          <KPICard label="Vi phạm/Cảnh báo" value={loading ? "—" : 0} icon="bi-exclamation-triangle" accent="#ef4444" subtitle="Yêu cầu bất thường" colClass="col-12 col-md-3" />
          <KPICard label="Đề xuất cá nhân" value={loading ? "—" : allRequests.filter(r => r.employee.userId === currentUserId && r.status === "PENDING").length} icon="bi-person-badge" accent="#6366f1" subtitle="Đang chờ duyệt" colClass="col-12 col-md-3" />
        </div>

        <WorkflowCard
          contentPadding="p-0"
          toolbar={null}
          bottomToolbar={ApprovalsBottomToolbar}
          stepper={
            <ModernStepper steps={STEP_ITEMS} currentStep={currentStep} onStepChange={setCurrentStep} paddingX={0} />
          }
        >
          <div className="h-100 bg-white border-top overflow-auto">
            <Table
              rows={filteredData}
              columns={requestColumns}
              loading={loading}
              rowKey={(r) => r.id}
              onRowClick={setSelectedRequest}
              emptyText={`Không có dữ liệu trong mục ${STEP_ITEMS.find(s => s.num === currentStep)?.title}`}
              compact
              striped={false}
            />
          </div>
        </WorkflowCard>
      </div>

      {/* Rejection Note Modal */}
      <ConfirmDialog 
        open={rejectionModal.open}
        title="Lý do từ chối"
        message={
          <div className="mt-2">
            <textarea 
              className="form-control" 
              placeholder="Nhập lý do từ chối để nhân viên nắm bắt..."
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        }
        variant="warning"
        confirmLabel="Từ chối"
        loading={actionLoading}
        onConfirm={() => rejectionModal.id && handleAction(rejectionModal.id, "REJECT", rejectionNote)}
        onCancel={() => { setRejectionModal({ open: false, id: null }); setRejectionNote(""); }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog 
        open={deleteConfirm.open}
        title="Xác nhận xóa yêu cầu"
        message="Bạn có chắc chắn muốn xóa đề xuất này? Hành động này không thể hoàn tác."
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />

      {/* Request Detail Offcanvas */}
      {selectedRequest && (
        <div className="offcanvas offcanvas-end show" style={{ visibility: "visible", width: 400 }}>
          <div className="offcanvas-header border-bottom bg-light">
            <h6 className="offcanvas-title fw-bold">Chi tiết đề xuất</h6>
            <button type="button" className="btn-close" onClick={() => setSelectedRequest(null)} />
          </div>
          <div className="offcanvas-body pb-5">
             <div className="d-flex align-items-center gap-3 mb-4">
                <EmployeeAvatar name={selectedRequest.employee.fullName} url={selectedRequest.employee.avatarUrl} size={60} borderRadius={15} />
                <div>
                   <h6 className="fw-bold mb-1">{selectedRequest.employee.fullName}</h6>
                   <div className="text-muted" style={{ fontSize: 12 }}>{getPositionName(selectedRequest.employee.position)} • {selectedRequest.employee.departmentName}</div>
                </div>
             </div>

             <div className="d-flex flex-column gap-3">
                <div className="p-3 bg-light rounded-3 border">
                   <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Loại đề xuất</div>
                   <div className="fw-bold text-primary">{TYPE_MAP[selectedRequest.type.toLowerCase()]?.label || selectedRequest.type}</div>
                </div>

                <div className="row g-2">
                   <div className="col-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Trạng thái</div>
                        {(() => {
                           const map = {
                              PENDING: { 
                                 label: selectedRequest.hrApproved ? "Trình lãnh đạo" : "Chờ duyệt", 
                                 cls: selectedRequest.hrApproved ? "text-info" : "text-warning" 
                              },
                              APPROVED: { label: "Đã duyệt", cls: "text-success" },
                              REJECTED: { label: "Từ chối", cls: "text-danger" },
                           };
                           const m = map[selectedRequest.status] || map.PENDING;
                           return <div className={`fw-bold ${m.cls}`}>{m.label}</div>;
                        })()}
                      </div>
                   </div>
                   <div className="col-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Ngày gửi đơn</div>
                        <div className="fw-bold" style={{ fontSize: 13 }}>{new Date(selectedRequest.createdAt).toLocaleDateString("vi-VN")}</div>
                      </div>
                   </div>
                </div>

                <div className="row g-2">
                   <div className="col-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Từ ngày</div>
                        <div className="fw-bold">{selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString("vi-VN") : "—"}</div>
                      </div>
                   </div>
                   <div className="col-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Đến ngày</div>
                        <div className="fw-bold">{selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString("vi-VN") : "—"}</div>
                      </div>
                   </div>
                </div>

                <div className="p-3 bg-light rounded-3 border">
                   <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Lý do đề xuất</div>
                   <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6 }}>{selectedRequest.reason || "Không có nội dung chi tiết."}</div>
                </div>
             </div>
          </div>

          {activeTabId === "pending" && selectedRequest.status === "PENDING" && !selectedRequest.hrApproved && (
            <div className="offcanvas-footer p-3 border-top bg-white d-flex gap-2 position-absolute bottom-0 w-100">
               <BrandButton 
                  icon="bi-check-lg" 
                  className="flex-grow-1" 
                  onClick={() => handleAction(selectedRequest.id, "APPROVE")}
                  loading={actionLoading}
               >
                  Duyệt
               </BrandButton>
               <BrandButton 
                  icon="bi-send" 
                  variant="outline"
                  className="flex-grow-1" 
                  onClick={() => handleAction(selectedRequest.id, "FORWARD_DIRECTOR")}
                  loading={actionLoading}
               >
                  Trình sếp
               </BrandButton>
               <BrandButton 
                  icon="bi-x-lg" 
                  variant="outline"
                  className="flex-grow-1" 
                  onClick={() => setRejectionModal({ open: true, id: selectedRequest.id })}
               >
                  Từ chối
               </BrandButton>
            </div>
          )}
        </div>
      )}
      {selectedRequest && <div className="offcanvas-backdrop fade show" onClick={() => setSelectedRequest(null)} />}

      <style jsx global>{`
        .bg-light-subtle { background-color: #f8fafc !important; }
        .hover-bg-light:hover { background-color: #f8fafc !important; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .cursor-not-allowed { cursor: not-allowed !important; }
        .offcanvas.show { z-index: 1050; }
        .offcanvas-backdrop.show { z-index: 1040; }
      `}</style>
    </StandardPage>
  );
}
