"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StandardPage } from "@/components/layout/StandardPage";
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
  details?: string | null;
}

interface Department {
  id: string;
  code: string;
  nameVi: string;
}

const STEP_ITEMS: ModernStepItem[] = [
  { id: "pending", title: "Duyệt yêu cầu", icon: "bi-check2-circle", num: 1, desc: "Phê duyệt và xử lý" },
  { id: "history", title: "Lịch sử phê duyệt", icon: "bi-clock-history", num: 2, desc: "Tra cứu dữ liệu cũ" },
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
  "recruitment": { label: "Tuyển dụng", color: "#3b82f6" },
  "training": { label: "Đào tạo", color: "#06b6d4" },
  "promotion": { label: "Đề bạt & thuyên chuyển", color: "#8b5cf6" },
  "salary-adjustment": { label: "Điều chỉnh thu nhập", color: "#f43f5e" },
  "stationery": { label: "Văn phòng phẩm và dụng cụ", color: "#ec4899" },
};

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const currentUserId = (session?.user as any)?.id;
  const { success: toastSuccess, error: toastError } = useToast();

  const isHRManager = session?.user?.role === "SUPERADMIN" || session?.user?.role === "admin" || (
    session?.user?.departmentCode?.toLowerCase() === "hr" &&
    ((session?.user as any)?.positionName?.includes("Trưởng phòng") || (session?.user as any)?.position === "vtr-20260401-1964-sbmg")
  );

  useEffect(() => {
    if (session && !isHRManager) {
      router.push("/");
    }
  }, [session, isHRManager, router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<{ code: string, name: string }[]>([]);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejected: 0 });

  // UI State
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ open: boolean; id: string | null; isBatch?: boolean }>({ open: false, id: null });
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentStep, searchQuery, deptFilter, statusFilter, monthFilter]);

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const filteredData = useMemo(() => {
    let filtered = [...allRequests];

    if (activeTabId === "pending") {
      filtered = filtered.filter(r => r.status === "PENDING");
    } else if (activeTabId === "history") {
      filtered = filtered.filter(r => r.status !== "PENDING");
    }

    if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter);
    if (deptFilter) {
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

  const handleBatchAction = async (action: "APPROVE" | "REJECT" | "FORWARD_DIRECTOR", note?: string) => {
    setActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/hr/approvals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note }),
        })
      );
      
      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);
      
      if (allOk) {
        let msg = "Đã thực hiện hàng loạt";
        if (action === "APPROVE") msg = "Đã phê duyệt các yêu cầu đã chọn";
        else if (action === "REJECT") msg = "Đã từ chối các yêu cầu đã chọn";
        else if (action === "FORWARD_DIRECTOR") msg = "Đã trình lãnh đạo các yêu cầu đã chọn";
        
        toastSuccess(msg);
        setSelectedIds(new Set());
        setRejectionModal({ open: false, id: null, isBatch: false });
        setRejectionNote("");
        fetchData();
      } else {
        toastError("Có lỗi xảy ra khi xử lý một số yêu cầu");
        setSelectedIds(new Set());
        fetchData();
      }
    } catch (error) {
      toastError("Lỗi hệ thống");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredData.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
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
      header: (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input
            type="checkbox"
            className="form-check-input cursor-pointer"
            checked={filteredData.length > 0 && filteredData.every(r => selectedIds.has(r.id))}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        </div>
      ),
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input
            type="checkbox"
            className="form-check-input cursor-pointer"
            checked={selectedIds.has(r.id)}
            onChange={(e) => handleSelectRow(r.id, e.target.checked)}
          />
        </div>
      ),
      width: "40px",
      align: "center"
    },
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
        let displayType = config.label;
        if (r.details) {
          try {
            const parsed = JSON.parse(r.details);
            if (parsed.leaveType) displayType = `${config.label} (${parsed.leaveType})`;
            else if (parsed.requestType) displayType = `${config.label} (${parsed.requestType})`;
            else if (parsed.time) displayType = `${config.label} (${parsed.time})`;
          } catch (e) {}
        }
        return (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge rounded-pill" style={{ background: `${config.color}15`, color: config.color, fontSize: 10 }}>
                {displayType}
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
             label: r.type.toLowerCase() === "stationery" ? "Chưa xử lý" : (r.hrApproved ? "Trình lãnh đạo" : "Chờ duyệt"), 
             cls: r.type.toLowerCase() === "stationery" ? "bg-warning-subtle text-warning border-warning" : (r.hrApproved ? "bg-info-subtle text-info border-info" : "bg-warning-subtle text-warning border-warning") 
          },
          APPROVED: { 
             label: r.type.toLowerCase() === "stationery" ? "Văn phòng đang xử lý" : "Đã duyệt", 
             cls: r.type.toLowerCase() === "stationery" ? "bg-info-subtle text-info border-info" : "bg-success-subtle text-success border-success" 
          },
          DELIVERED: { label: "Đã cấp phát", cls: "bg-success-subtle text-success border-success" },
          REJECTED: { 
             label: r.type.toLowerCase() === "stationery" ? "Văn phòng đang xử lý" : "Từ chối", 
             cls: r.type.toLowerCase() === "stationery" ? "bg-info-subtle text-info border-info" : "bg-danger-subtle text-danger border-danger" 
          },
        };
        const m = map[r.status as keyof typeof map] || map.PENDING;
        return <span className={`badge border rounded-pill px-2 ${m.cls}`} style={{ fontSize: 10 }}>{m.label}</span>;
      },
      width: "120px",
      align: "center"
    },
    {
      header: "Thao tác",
      render: (r) => (
        <div className="d-flex justify-content-end gap-1" onClick={(e) => e.stopPropagation()}>
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
        </div>
      ),
      width: "120px",
      align: "right"
    }
  ];

  const ApprovalsBottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100 px-3" style={{ minHeight: 48 }}>
      {selectedIds.size > 0 ? (
        <div className="d-flex align-items-center gap-2">
          <span className="text-primary fw-bold" style={{ fontSize: 11 }}>Đã chọn {selectedIds.size} đề xuất:</span>
          {activeTabId === "pending" && (
            <>
              <button 
                className="btn btn-success btn-sm d-flex align-items-center gap-1 py-1 px-2 border-0 shadow-sm" 
                onClick={() => handleBatchAction("APPROVE")}
                disabled={actionLoading}
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                <i className="bi bi-check-lg" /> Duyệt
              </button>
              <button 
                className="btn btn-info btn-sm text-white d-flex align-items-center gap-1 py-1 px-2 border-0 shadow-sm" 
                onClick={() => handleBatchAction("FORWARD_DIRECTOR")}
                disabled={actionLoading}
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                <i className="bi bi-send" /> Trình sếp
              </button>
              <button 
                className="btn btn-danger btn-sm d-flex align-items-center gap-1 py-1 px-2 border-0 shadow-sm" 
                onClick={() => setRejectionModal({ open: true, id: null, isBatch: true })}
                disabled={actionLoading}
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                <i className="bi bi-x-lg" /> Từ chối
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2">
        <FilterSelect
          placeholder="Tất cả phòng ban"
          options={departments.map(d => ({ label: d.nameVi, value: d.nameVi }))}
          value={deptFilter}
          onChange={setDeptFilter}
          width={180}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <SearchInput
          placeholder="Tìm nhân viên, nội dung..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: 220 }}
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
    )}

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
        onConfirm={() => {
          if (rejectionModal.isBatch) {
            handleBatchAction("REJECT", rejectionNote);
          } else if (rejectionModal.id) {
            handleAction(rejectionModal.id, "REJECT", rejectionNote);
          }
        }}
        onCancel={() => { setRejectionModal({ open: false, id: null, isBatch: false }); setRejectionNote(""); }}
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
                    <div className="fw-bold text-primary">
                      {(() => {
                         const label = TYPE_MAP[selectedRequest.type.toLowerCase()]?.label || selectedRequest.type;
                         if (selectedRequest.details) {
                            try {
                               const parsed = JSON.parse(selectedRequest.details);
                               if (parsed.leaveType) return `${label} (${parsed.leaveType})`;
                               if (parsed.requestType) return `${label} (${parsed.requestType})`;
                               if (parsed.time) return `${label} (${parsed.time})`;
                            } catch (e) {}
                         }
                         return label;
                      })()}
                    </div>
                 </div>

                <div className="row g-2">
                   <div className="col-6">
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Trạng thái</div>
                        {(() => {
                            const map = {
                               PENDING: { 
                                  label: selectedRequest.type.toLowerCase() === "stationery" ? "Chưa xử lý" : (selectedRequest.hrApproved ? "Trình lãnh đạo" : "Chờ duyệt"), 
                                  cls: selectedRequest.type.toLowerCase() === "stationery" ? "text-warning" : (selectedRequest.hrApproved ? "text-info" : "text-warning") 
                               },
                               APPROVED: { 
                                  label: selectedRequest.type.toLowerCase() === "stationery" ? "Văn phòng đang xử lý" : "Đã duyệt", 
                                  cls: selectedRequest.type.toLowerCase() === "stationery" ? "text-info" : "text-success" 
                               },
                               DELIVERED: { label: "Đã cấp phát", cls: "text-success" },
                               REJECTED: { 
                                  label: selectedRequest.type.toLowerCase() === "stationery" ? "Văn phòng đang xử lý" : "Từ chối", 
                                  cls: selectedRequest.type.toLowerCase() === "stationery" ? "text-info" : "text-danger" 
                               },
                            };
                           const m = map[selectedRequest.status as keyof typeof map] || map.PENDING;
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
                    <div className="text-muted mb-2" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Nội dung chi tiết</div>
                    {(() => {
                       if (selectedRequest.details) {
                          try {
                             const details = JSON.parse(selectedRequest.details);
                             if (selectedRequest.type.toLowerCase() === "recruitment") {
                                return (
                                   <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                                      <div><strong>Vị trí tuyển dụng:</strong> {details.position}</div>
                                      <div><strong>Số lượng:</strong> {details.quantity}</div>
                                      <div><strong>Cấp bậc:</strong> {details.level}</div>
                                      <div><strong>Hình thức:</strong> {details.workType}</div>
                                      <div><strong>Mức lương:</strong> {details.salary}</div>
                                      {details.deadline && <div><strong>Hạn tuyển:</strong> {new Date(details.deadline).toLocaleDateString("vi-VN")}</div>}
                                      {selectedRequest.reason && (
                                         <div className="mt-2 border-top pt-2">
                                            <strong>Mô tả / Yêu cầu chi tiết:</strong>
                                            <div className="text-muted mt-1" style={{ whiteSpace: "pre-wrap" }}>
                                               {selectedRequest.reason.split("\nMô tả chi tiết:\n")[1] || selectedRequest.reason}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                );
                             }
                             if (selectedRequest.type.toLowerCase() === "training") {
                                return (
                                   <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                                      <div><strong>Chủ đề đào tạo:</strong> {details.topic}</div>
                                      <div><strong>Giảng viên:</strong> {details.trainer || "Chưa xác định"}</div>
                                      <div><strong>Địa điểm:</strong> {details.location || "Chưa xác định"}</div>
                                      <div><strong>Đối tượng tham gia:</strong> {details.participants || "Chưa xác định"}</div>
                                      {selectedRequest.reason && (
                                         <div className="mt-2 border-top pt-2">
                                            <strong>Nội dung đào tạo chi tiết:</strong>
                                            <div className="text-muted mt-1" style={{ whiteSpace: "pre-wrap" }}>
                                               {selectedRequest.reason.split("\nNội dung chi tiết:\n")[1] || selectedRequest.reason}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                );
                             }
                             if (selectedRequest.type.toLowerCase() === "promotion") {
                                return (
                                   <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                                      <div><strong>Nhân viên:</strong> {details.employee}</div>
                                      <div><strong>Loại đề xuất:</strong> {details.isTransfer ? "Thuyên chuyển công tác" : "Đề bạt thăng tiến"}</div>
                                      <div><strong>Bộ phận hiện tại:</strong> {details.currentRole}</div>
                                      {details.targetDepartment && <div><strong>Bộ phận đề xuất:</strong> {details.targetDepartment}</div>}
                                      {details.proposedRole && <div><strong>Vị trí đề xuất:</strong> {details.proposedRole}</div>}
                                      {selectedRequest.reason && (
                                         <div className="mt-2 border-top pt-2">
                                            <strong>Lý do thăng tiến / thuyên chuyển:</strong>
                                            <div className="text-muted mt-1" style={{ whiteSpace: "pre-wrap" }}>
                                               {selectedRequest.reason.split("\nLý do chi tiết:\n")[1] || selectedRequest.reason}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                );
                             }
                             if (selectedRequest.type.toLowerCase() === "salary-adjustment") {
                                return (
                                   <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                                      <div><strong>Nhân viên:</strong> {details.employee}</div>
                                      <div><strong>Loại điều chỉnh:</strong> {details.adjustmentType}</div>
                                      <div><strong>Lương hiện tại:</strong> {details.currentSalary}</div>
                                      <div><strong>Lương đề xuất mới:</strong> <span className="text-danger fw-bold">{details.proposedSalary}</span></div>
                                      {selectedRequest.reason && (
                                         <div className="mt-2 border-top pt-2">
                                            <strong>Lý do điều chỉnh chi tiết:</strong>
                                            <div className="text-muted mt-1" style={{ whiteSpace: "pre-wrap" }}>
                                               {selectedRequest.reason.split("\nLý do chi tiết:\n")[1] || selectedRequest.reason}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                );
                             }
                             if (selectedRequest.type.toLowerCase() === "stationery") {
                                return (
                                   <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                                      {details.note && <div><strong>Ghi chú / Lý do:</strong> {details.note}</div>}
                                      <div><strong>Tổng tiền dự kiến:</strong> <span className="text-danger fw-bold">{details.totalAmount?.toLocaleString("vi-VN")} đ</span></div>
                                      <div className="mt-2 border-top pt-2">
                                         <strong>Danh sách vật tư đề xuất:</strong>
                                         <div className="table-responsive mt-1">
                                            <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                                               <thead>
                                                  <tr className="bg-light">
                                                     <th>Tên vật tư</th>
                                                     <th style={{ width: 80 }} className="text-center">Đơn vị</th>
                                                     <th style={{ width: 80 }} className="text-center">Số lượng</th>
                                                  </tr>
                                               </thead>
                                               <tbody>
                                                  {details.items?.map((item: any, idx: number) => (
                                                     <tr key={idx}>
                                                        <td>{item.name}</td>
                                                        <td className="text-center">{item.unit}</td>
                                                        <td className="text-center fw-bold">{item.quantity}</td>
                                                     </tr>
                                                  ))}
                                               </tbody>
                                            </table>
                                         </div>
                                      </div>
                                   </div>
                                );
                             }
                          } catch (e) {}
                       }
                       return <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selectedRequest.reason || "Không có nội dung chi tiết."}</div>;
                    })()}
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
