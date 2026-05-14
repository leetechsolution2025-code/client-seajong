"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Table, TableColumn } from "@/components/ui/Table";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { SalaryAdjustmentOffcanvas } from "./components/SalaryAdjustmentOffcanvas";
import { ProposalSupportOffcanvas } from "./components/ProposalSupportOffcanvas";

const STEPS: ModernStepItem[] = [
  { num: 1, id: "RECEIVING", title: "Tiếp nhận", desc: "Rà soát chỉ tiêu", icon: "bi-envelope-check" },
  { num: 2, id: "APPROVAL", title: "Xét duyệt", desc: "Tờ trình & Phê duyệt", icon: "bi-file-earmark-person" },
  { num: 3, id: "COMPLETION", title: "Hoàn tất", desc: "Quyết định & Cập nhật", icon: "bi-check2-all" },
];

interface SalaryAdjustmentRequest {
  id: string;
  status: string;
  adjustmentType: string;
  currentBaseSalary: number | null;
  proposedBaseSalary: number | null;
  currentAllowances: string | null;
  proposedAllowances: string | null;
  reason: string;
  createdAt: string;
  employee?: {
    fullName: string;
    code: string;
    avatarUrl: string;
    departmentName: string;
    positionName?: string;
  };
  requester?: {
    fullName: string;
  };
}

export function SalaryAdjustmentsContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SalaryAdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SalaryAdjustmentRequest | null>(null);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProposalOpen, setIsProposalOpen] = useState(false);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentStep]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/salary-adjustment");
      const result = await res.json();
      if (Array.isArray(result)) {
        setData(result);
        
        // Handle deep link
        if (requestId) {
          const item = result.find((x: SalaryAdjustmentRequest) => x.id === requestId);
          if (item) {
            setSelectedItem(item);
            setIsOffcanvasOpen(true);
            // Move to correct step based on status
            if (["PENDING", "REVIEWING", "REJECTED"].includes(item.status)) setCurrentStep(1);
            else if (["SUBMITTED", "APPROVED"].includes(item.status)) setCurrentStep(2);
            else if (["DECIDED", "COMPLETED"].includes(item.status)) setCurrentStep(3);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [requestId]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (currentStep === 1) return ["PENDING", "REVIEWING", "REJECTED"].includes(item.status);
      if (currentStep === 2) return ["SUBMITTED", "WAITING_APPROVAL"].includes(item.status);
      if (currentStep === 3) return ["APPROVED", "DECIDED", "COMPLETED"].includes(item.status);
      return true;
    });
  }, [data, currentStep]);

  const selectedItems = useMemo(() => {
    return data.filter(x => selectedIds.includes(x.id));
  }, [data, selectedIds]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string, color: string }> = {
      PENDING: { label: "Mới", color: "#64748b" },
      REVIEWING: { label: "Đã chấp nhận", color: "#3b82f6" },
      SUBMITTED: { label: "Đã chấp nhận", color: "#8b5cf6" },
      WAITING_APPROVAL: { label: "Đang trình duyệt", color: "#f59e0b" },
      APPROVED: { label: "Đã phê duyệt", color: "#10b981" },
      DECIDED: { label: "Đã ra quyết định", color: "#003087" },
      COMPLETED: { label: "Đã phê duyệt", color: "#16a34a" },
      REJECTED: { label: "Từ chối", color: "#ef4444" },
    };
    const s = config[status] || { label: status, color: "#64748b" };
    return (
      <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: s.color, fontSize: "12px" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }}></span>
        <span className="text-nowrap">{s.label}</span>
      </div>
    );
  };

  const columns: TableColumn<SalaryAdjustmentRequest>[] = [
    ...(currentStep === 2 ? [{
      header: (
        <input 
          type="checkbox" 
          className="form-check-input ms-2"
          checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
          onChange={(e) => {
            if (e.target.checked) setSelectedIds(filteredData.map(x => x.id));
            else setSelectedIds([]);
          }}
        />
      ),
      render: (row: SalaryAdjustmentRequest) => (
        <input 
          type="checkbox" 
          className="form-check-input ms-2"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) setSelectedIds(prev => [...prev, row.id]);
            else setSelectedIds(prev => prev.filter(id => id !== row.id));
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: 40,
    } as TableColumn<SalaryAdjustmentRequest>] : []),
    {
      header: "Nhân viên",
      render: (row) => (
        <div className="d-flex align-items-center gap-3">
          <EmployeeAvatar name={row.employee?.fullName || "N/A"} url={row.employee?.avatarUrl} size={34} borderRadius={10} />
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{row.employee?.fullName}</div>
            <div className="text-muted" style={{ fontSize: "11px" }}>
              {row.employee?.code} • {row.employee?.positionName || "N/A"} • {row.employee?.departmentName}
            </div>
          </div>
        </div>
      ),
      width: "30%",
    },
    {
      header: "Loại điều chỉnh",
      render: (row) => (
        <div className="badge bg-light text-dark border fw-medium" style={{ fontSize: "11px" }}>
          {row.adjustmentType === "INCREASE" ? "Tăng lương" : row.adjustmentType === "DECREASE" ? "Giảm lương" : "Tái cơ cấu"}
        </div>
      ),
    },
    {
      header: "Thu nhập (Trước → Sau)",
      render: (row) => {
        const curAllowances = row.currentAllowances ? JSON.parse(row.currentAllowances) : {};
        const propAllowances = row.proposedAllowances ? JSON.parse(row.proposedAllowances) : {};
        
        const curTotal = Number(row.currentBaseSalary || 0) + Object.values(curAllowances).reduce((acc: number, val: any) => acc + Number(val || 0), 0);
        const propTotal = Number(row.proposedBaseSalary || 0) + Object.values(propAllowances).reduce((acc: number, val: any) => acc + Number(val || 0), 0);
        
        return (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">{curTotal.toLocaleString()}</span>
            <i className="bi bi-arrow-right text-primary"></i>
            <span className="fw-bold text-dark small">{propTotal.toLocaleString()}</span>
          </div>
        );
      },
      width: "20%"
    },
    {
      header: "Người đề xuất",
      render: (row) => <span className="small text-dark">{row.requester?.fullName || "Hệ thống"}</span>,
    },
    {
      header: "Ngày gửi",
      render: (row) => <span className="small text-muted">{new Date(row.createdAt).toLocaleDateString("vi-VN")}</span>,
    },
    {
      header: "Trạng thái",
      render: (row) => getStatusBadge(row.status),
    }
  ];

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Điều chỉnh thu nhập"
        description="Xét duyệt tăng lương, thưởng và các khoản điều chỉnh khác"
        icon="bi-cash-stack"
        color="rose"
      />
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div className="px-4 py-2 border-bottom d-flex align-items-center justify-content-between">
            <div className="flex-grow-1">
              <ModernStepper 
                steps={STEPS} 
                currentStep={currentStep} 
                onStepChange={setCurrentStep} 
                paddingX={0} 
              />
            </div>
          </div>

          <div className="flex-grow-1 d-flex flex-column p-4" style={{ minHeight: 0 }}>
            <div className="flex-grow-1 overflow-auto custom-scrollbar">
              <Table
                rows={filteredData}
                columns={columns}
                loading={loading}
                compact={true}
                emptyText={`Không có yêu cầu nào đang ở bước ${STEPS.find(s => s.num === currentStep)?.title}`}
                rowKey={(r) => r.id}
                onRowClick={(row) => {
                  setSelectedItem(row);
                  setIsOffcanvasOpen(true);
                }}
              />
            </div>
          </div>

          {currentStep === 2 && selectedIds.length > 0 && (
            <div className="px-4 py-3 border-top bg-light rounded-bottom-4 d-flex align-items-center justify-content-between">
              <div className="small text-muted d-flex align-items-center gap-2">
                <i className="bi bi-info-circle"></i>
                Đã chọn <strong>{selectedIds.length}</strong> hồ sơ nhân sự để trình phê duyệt.
              </div>
              <BrandButton 
                icon="bi-file-earmark-plus" 
                onClick={() => setIsProposalOpen(true)}
              >
                Trình phê duyệt <span className="badge rounded-circle bg-white text-primary ms-2 d-inline-flex align-items-center justify-content-center" style={{ width: 20, height: 20, fontSize: 10 }}>{selectedIds.length}</span>
              </BrandButton>
            </div>
          )}
        </div>
      </div>

      <SalaryAdjustmentOffcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          setSelectedItem(null);
        }}
        data={selectedItem}
        onRefresh={fetchData}
      />

      <ProposalSupportOffcanvas
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
        selectedItems={selectedItems}
        onRefresh={fetchData}
      />
    </div>
  );
}

export default function SalaryAdjustmentsPage() {
  return (
    <Suspense fallback={<div style={{ height: "100%" }} />}>
      <SalaryAdjustmentsContent />
    </Suspense>
  );
}
