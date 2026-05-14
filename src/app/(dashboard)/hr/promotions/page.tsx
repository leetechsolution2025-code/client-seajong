"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableColumn } from "@/components/ui/Table";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { PromotionOffcanvas } from "./components/PromotionOffcanvas";
import { InterviewSupportOffcanvas } from "./components/InterviewSupportOffcanvas";
import { PromotionApprovalOffcanvas } from "./components/PromotionApprovalOffcanvas";
import { BrandButton } from "@/components/ui/BrandButton";
import { PromotionRequest, PromotionStatus } from "./types";

const STEPS: ModernStepItem[] = [
  { num: 1, id: "RECEIVING", title: "Tiếp nhận", desc: "Phòng nhân sự phê duyệt", icon: "bi-envelope-check" },
  { num: 2, id: "INTERVIEWING", title: "Phỏng vấn", desc: "Đánh giá và Trình giám đốc", icon: "bi-chat-quote" },
  { num: 3, id: "CONCLUSION", title: "Kết luận", desc: "Ban hành và Cập nhật dữ liệu", icon: "bi-file-earmark-check" },
];

export default function PromotionsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PromotionRequest | null>(null);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [departments, setDepartments] = useState<{code: string, name: string}[]>([]);
  const [positions, setPositions] = useState<{code: string, name: string}[]>([]);
  
  // New Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/promotions");
      const result = await res.json();
      if (Array.isArray(result)) {
        setData(result);
      }
      
      // Fetch departments for filter
      const empRes = await fetch("/api/hr/employees?pageSize=1");
      const empData = await empRes.json();
      if (empData.departments) {
        setDepartments(empData.departments);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d ?? []))
      .catch(() => {});
  }, []);

  // Reset status filter when step changes
  React.useEffect(() => {
    setStatusFilter("");
  }, [currentStep]);

  // Filter data based on current step and filters
  const filteredData = useMemo(() => {
    const statusMap: Record<number, PromotionStatus> = {
      1: "RECEIVING",
      2: "INTERVIEWING",
      3: "CONCLUSION"
    };
    
    return data.filter(item => {
      // Step filter logic:
      if (currentStep === 1) return item.status === "RECEIVING" || (item.status === "CONCLUSION" && item.hrApproved === false);
      if (currentStep === 2) return item.status === "INTERVIEWING" || (item.status === "CONCLUSION" && item.hrApproved === true && item.directorApproved === null);
      if (currentStep === 3) return item.status === "CONCLUSION" && item.directorApproved === true;
      
      // Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = 
          item.employeeName.toLowerCase().includes(s) || 
          item.employeeId.toLowerCase().includes(s) || 
          item.targetPos.toLowerCase().includes(s) ||
          item.currentPos.toLowerCase().includes(s);
        if (!match) return false;
      }
      
      // Department filter
      if (deptFilter && item.currentDept !== deptFilter && item.targetDept !== deptFilter) {
        return false;
      }
      
      // Status filter (Custom logic)
      if (statusFilter) {
        const info = getStatusInfo(item);
        if (info.label !== statusFilter) return false;
      }
      
      return true;
    });
  }, [data, currentStep, searchTerm, deptFilter, statusFilter]);

  const handleUpdateStatus = async (id: string, updates: Partial<PromotionRequest>) => {
    // Chỉ update local state (API đã được gọi từ Offcanvas)
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  const handleApiUpdate = async (id: string, updates: Partial<PromotionRequest>) => {
    try {
      const res = await fetch(`/api/hr/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
    }
  };

  const handleConfirmApproval = async (approvalData: { recipientId: string; message: string; priority: string }) => {
    setIsSubmittingApproval(true);
    try {
      const selectedRequests = data.filter(r => selectedIds.includes(r.id));
      
      // 1. Xử lý từng yêu cầu: Cập nhật trạng thái & Tạo hồ sơ phê duyệt
      await Promise.all(selectedRequests.map(async (row) => {
        // Cập nhật trạng thái trong bảng PromotionRequest
        await fetch(`/api/hr/promotions/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONCLUSION" })
        });

        // Tạo hồ sơ phê duyệt trong Trung tâm phê duyệt
        await fetch("/api/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: row.type, // PROMOTION hoặc TRANSFER
            entityId: row.id,
            entityCode: row.employeeId,
            entityTitle: `Phê duyệt ${row.type === 'PROMOTION' ? 'đề bạt' : 'điều chuyển'}: ${row.employeeName}`,
            priority: approvalData.priority.toLowerCase(),
            approverId: approvalData.recipientId,
            department: row.targetDept,
            message: approvalData.message
          })
        });
      }));

      // 2. Gửi thông báo tổng hợp cho Giám đốc (Optional - vì API approvals đã gửi thông báo lẻ từng hồ sơ)
      // Nếu muốn 1 thông báo tổng hợp duy nhất như Offcanvas hiện tại:
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: approvalData.priority === "Urgent" ? "🚩 KHẨN CẤP: Phê duyệt danh sách nhân sự" : "Trình duyệt danh sách nhân sự mới",
          content: approvalData.message,
          userId: approvalData.recipientId,
          type: "promotion_approval",
          attachments: [
            {
              name: `Xem Trung tâm phê duyệt (${selectedIds.length} hồ sơ)`,
              type: "link",
              url: "/board/approvals"
            }
          ]
        })
      });

      setSelectedIds([]);
      setIsApprovalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const getStatusInfo = (row: PromotionRequest) => {
    if (row.status === "CONCLUSION") {
      if (row.hrApproved === false) return { label: "Không chấp nhận", color: "#ef4444" };
      if (row.directorApproved === false) return { label: "Từ chối", color: "#ef4444" };
      if (!row.directorApproved) return { label: "Đang trình duyệt", color: "#f59e0b" };
      return { label: "Đã phê duyệt", color: "#10b981" };
    }
    if (row.status === "INTERVIEWING") {
      return { label: "Đã chấp nhận", color: "#3b82f6" };
    }
    return { label: "Mới", color: "#64748b" };
  };

  const columns = useMemo((): TableColumn<PromotionRequest>[] => {
    // Base columns for Step 1
    if (currentStep === 1) {
      return [
        {
          header: "Nhân viên",
          render: (row) => (
            <div className="d-flex align-items-center gap-3">
              <EmployeeAvatar 
                name={row.employeeName} 
                url={row.avatar}
                size={34} 
                borderRadius={10} 
                fontSize={12} 
              />
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: "14.5px" }}>{row.employeeName}</div>
                <div className="text-muted" style={{ fontSize: "11px", marginTop: "1px" }}>{row.employeeId}</div>
              </div>
            </div>
          ),
          width: "22%",
        },
        {
          header: "Loại yêu cầu và Lộ trình",
          render: (row) => {
            const labels: Record<string, string> = { PROMOTION: "Đề bạt", TRANSFER: "Điều chuyển", DEMOTION: "Miễn nhiệm" };
            const colors: Record<string, string> = { PROMOTION: "#8b5cf6", TRANSFER: "#3b82f6", DEMOTION: "#ef4444" };
            return (
              <div>
                <div className="mb-1">
                  <span className="small fw-bold text-uppercase" style={{ color: colors[row.type as keyof typeof colors], fontSize: "10px", letterSpacing: "0.5px" }}>
                    {labels[row.type as keyof typeof labels] || row.type}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2 small">
                  <span className="text-muted">{getPositionName(row.currentPos)}</span>
                  <i className="bi bi-arrow-right text-primary" style={{ fontSize: "12px" }}></i>
                  <span className="fw-bold text-dark">{getPositionName(row.targetPos)}</span>
                </div>
              </div>
            );
          },
          width: "28%"
        },
        {
          header: "Người đề xuất",
          render: (row) => (
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>{row.requesterName || "Hệ thống"}</div>
              <div className="text-muted" style={{ fontSize: "11px" }}>{getPositionName(row.requesterPos || "") || "Quản lý"}</div>
            </div>
          )
        },
        {
          header: "Ngày gửi",
          render: (row) => <span className="small text-muted">{new Date(row.createdAt).toLocaleDateString("vi-VN")}</span>,
        },
        {
          header: "Trạng thái",
          render: (row) => {
            const info = getStatusInfo(row);
            return (
              <span className="d-flex align-items-center gap-2 fw-600" style={{ color: info.color, fontSize: "13px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: info.color }}></span>
                {info.label}
              </span>
            );
          },
          align: "right"
        }
      ];
    }

    // Columns for Step 2: Phỏng vấn
    if (currentStep === 2) {
      return [
        {
          header: (
            <input 
              type="checkbox" 
              className="form-check-input"
              checked={selectedIds.length > 0 && selectedIds.length === filteredData.filter(r => r.interviewResult === 'PASS').length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(filteredData.filter(r => r.interviewResult === 'PASS').map(r => r.id));
                } else {
                  setSelectedIds([]);
                }
              }}
            />
          ),
          render: (row) => (
            <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-block" }}>
              <input 
                type="checkbox" 
                className="form-check-input"
                checked={selectedIds.includes(row.id)}
                disabled={row.interviewResult !== 'PASS'}
                onChange={(e) => {
                  if (e.target.checked) setSelectedIds(prev => [...prev, row.id]);
                  else setSelectedIds(prev => prev.filter(id => id !== row.id));
                }}
              />
            </div>
          ),
          width: "40px"
        },
        {
          header: "Tên nhân viên",
          render: (row) => {
            const getResultLabel = () => {
              if (row.interviewResult === 'PASS') return { label: "Đạt yêu cầu", color: "text-success" };
              if (row.interviewResult === 'FAIL') return { label: "Không đạt", color: "text-danger" };
              return { label: "Chưa phỏng vấn", color: "text-muted" };
            };
            const status = getResultLabel();
            return (
              <div className="d-flex align-items-center gap-2">
                <EmployeeAvatar name={row.employeeName} url={row.avatar} size={28} />
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{row.employeeName}</div>
                  <div className={`${status.color} fw-500`} style={{ fontSize: "10.5px", marginTop: "-1px" }}>
                    {status.label}
                  </div>
                </div>
              </div>
            );
          },
          width: "25%"
        },
        {
          header: "Loại yêu cầu",
          render: (row) => {
            const labels = { PROMOTION: "Đề bạt", TRANSFER: "Điều chuyển", DEMOTION: "Miễn nhiệm" };
            return <span className="small fw-500">{labels[row.type]}</span>;
          }
        },
        {
          header: "Lịch phỏng vấn",
          render: (row) => (
            <span className="small text-dark fw-500">
              {row.interviewDate ? new Date(row.interviewDate).toLocaleDateString("vi-VN") : "Chưa đặt lịch"}
            </span>
          )
        },
        {
          header: "Người phỏng vấn",
          render: (row) => (
            <span className={row.interviewerName ? "text-dark fw-500" : "text-muted small"}>
              {row.interviewerName || "—"}
            </span>
          )
        },

        {
          header: "Hành động",
          render: (row) => (
            <div className="d-flex gap-2 justify-content-end" onClick={(e) => e.stopPropagation()}>
              <button 
                className={`btn btn-sm btn-light border rounded-pill px-3 fw-bold text-success d-flex align-items-center gap-1 ${!row.interviewDate ? 'opacity-50' : ''}`}
                style={{ fontSize: "11px", cursor: !row.interviewDate ? "not-allowed" : "pointer" }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!row.interviewDate) return;
                  handleUpdateStatus(row.id, { interviewResult: 'PASS' }); // Update local state immediately
                  handleApiUpdate(row.id, { interviewResult: 'PASS' });
                  setSelectedIds(prev => prev.includes(row.id) ? prev : [...prev, row.id]);
                }}
                disabled={!row.interviewDate}
              >
                <i className="bi bi-check-circle"></i>
                Đạt yêu cầu
              </button>
              <button 
                className={`btn btn-sm btn-light border rounded-pill px-3 fw-bold text-danger d-flex align-items-center gap-1 ${!row.interviewDate ? 'opacity-50' : ''}`}
                style={{ fontSize: "11px", cursor: !row.interviewDate ? "not-allowed" : "pointer" }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!row.interviewDate) return;
                  handleUpdateStatus(row.id, { interviewResult: 'FAIL' }); // Update local state immediately
                  handleApiUpdate(row.id, { interviewResult: 'FAIL' });
                  setSelectedIds(prev => prev.filter(id => id !== row.id));
                }}
                disabled={!row.interviewDate}
              >
                <i className="bi bi-x-circle"></i>
                Không đạt
              </button>
            </div>
          ),
          align: "right"
        }
      ];
    }

    // Columns for Step 3: Kết luận
    if (currentStep === 3) {
      return [
        {
          header: "Tên nhân viên",
          render: (row) => (
            <div className="d-flex align-items-center gap-2">
              <EmployeeAvatar name={row.employeeName} url={row.avatar} size={28} />
              <span className="fw-bold text-dark">{row.employeeName}</span>
            </div>
          ),
          width: "25%"
        },
        {
          header: "Loại yêu cầu",
          render: (row) => {
            const labels = { PROMOTION: "Đề bạt", TRANSFER: "Điều chuyển", DEMOTION: "Miễn nhiệm" };
            return <span className="small fw-500">{labels[row.type]}</span>;
          }
        },
        {
          header: "Ý kiến của giám đốc",
          render: (row) => (
            <div className="small">
              {row.directorNote ? (
                <div className="text-dark italic">"{row.directorNote}"</div>
              ) : (
                <span className="text-muted">Chưa có ý kiến</span>
              )}
            </div>
          )
        },
        {
          header: "Hành động",
          render: (row) => {
            return (
              <div className="d-flex gap-2 justify-content-end">
                <button 
                  className="btn btn-sm btn-light border rounded-pill px-3 fw-bold text-primary d-flex align-items-center gap-1"
                  style={{ fontSize: "11px" }}
                  onClick={(e) => { e.stopPropagation(); /* Logic later */ }}
                >
                  <i className="bi bi-file-earmark-check"></i>
                  Ra quyết định
                </button>
                <button 
                  className="btn btn-sm btn-light border rounded-pill px-3 fw-bold text-success d-flex align-items-center gap-1"
                  style={{ fontSize: "11px" }}
                  onClick={(e) => { e.stopPropagation(); /* Logic later */ }}
                >
                  <i className="bi bi-megaphone"></i>
                  Thông báo
                </button>
              </div>
            );
          },
          align: "right"
        }
      ];
    }

    return [];
  }, [currentStep, positions, selectedIds, filteredData]);

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Điều chuyển và đề bạt"
        description="Quản lý lộ trình phát triển, thay đổi vị trí và thăng tiến"
        icon="bi-arrow-up-right-circle"
        color="rose"
      />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <WorkflowCard
          stepper={
            <ModernStepper 
              steps={STEPS} 
              currentStep={currentStep} 
              onStepChange={setCurrentStep} 
              paddingX={0} 
            />
          }
          toolbar={
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                {/* Search */}
                <div className="position-relative" style={{ width: "300px" }}>
                  <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: "13px" }}></i>
                  <input 
                    type="text" 
                    className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4"
                    style={{ height: 38, background: "var(--card)", fontSize: 13, border: "1px solid var(--border)" }}
                    placeholder="Tìm tên, mã nhân viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Department */}
                <select 
                  className="form-select border-0 shadow-sm rounded-pill px-3"
                  style={{ width: "auto", minWidth: "160px", fontSize: 13, height: 38, background: "var(--card)", border: "1px solid var(--border)" }}
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="">Tất cả phòng ban</option>
                  {departments.map(d => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                </select>

                {/* Status - Context Aware */}
                {currentStep === 1 && (
                  <select 
                    className="form-select border-0 shadow-sm rounded-pill px-3"
                    style={{ width: "auto", minWidth: "160px", fontSize: 13, height: 38, background: "var(--card)", border: "1px solid var(--border)" }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="Mới">Mới</option>
                    <option value="Đã chấp nhận">Đã chấp nhận</option>
                    <option value="Đang trình duyệt">Đang trình duyệt</option>
                    <option value="Đã phê duyệt">Đã phê duyệt</option>
                    <option value="Không chấp nhận">Không chấp nhận</option>
                    <option value="Từ chối">Từ chối</option>
                  </select>
                )}

                {currentStep === 2 && (
                  <select 
                    className="form-select border-0 shadow-sm rounded-pill px-3"
                    style={{ width: "auto", minWidth: "160px", fontSize: 13, height: 38, background: "var(--card)", border: "1px solid var(--border)" }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="Đã chấp nhận">Đã chấp nhận</option>
                  </select>
                )}

                {currentStep === 3 && (
                  <select 
                    className="form-select border-0 shadow-sm rounded-pill px-3"
                    style={{ width: "auto", minWidth: "160px", fontSize: 13, height: 38, background: "var(--card)", border: "1px solid var(--border)" }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="Đang trình duyệt">Đang trình duyệt</option>
                    <option value="Đã phê duyệt">Đã phê duyệt</option>
                    <option value="Không chấp nhận">Không chấp nhận</option>
                    <option value="Từ chối">Từ chối</option>
                  </select>
                )}

                {/* Create Request Button - Only in Step 1 */}
                {currentStep === 1 && (
                  <BrandButton 
                    icon="bi-plus-lg"
                    className="ms-1"
                    onClick={() => router.push("/my/hr-requests?tab=PROMOTION")}
                  >
                    Tạo yêu cầu
                  </BrandButton>
                )}

                {/* Step 2 Action Buttons */}
                {currentStep === 2 && (
                  <div className="d-flex align-items-center gap-2">
                    {selectedIds.length > 0 && (
                      <BrandButton 
                        icon="bi-send-check"
                        onClick={() => setIsApprovalOpen(true)}
                      >
                        Trình duyệt 
                        <span className="badge bg-white text-primary rounded-pill ms-2" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {selectedIds.length}
                        </span>
                      </BrandButton>
                    )}
                    <BrandButton 
                      variant="outline"
                      icon="bi-lightbulb-fill"
                      onClick={() => setIsSupportOpen(true)}
                    >
                      Hỗ trợ phỏng vấn
                    </BrandButton>
                  </div>
                )}
              </div>
              <div className="text-muted small ms-3 flex-shrink-0">Tổng số: <b>{filteredData.length}</b> bản ghi</div>
            </div>
          }
        >
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
        </WorkflowCard>
      </div>

      <PromotionOffcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          setSelectedItem(null);
        }}
        data={selectedItem}
        currentStep={currentStep}
        onUpdate={handleUpdateStatus}
        onRefresh={fetchData}
      />

      <InterviewSupportOffcanvas 
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        type={selectedItem?.type}
      />

      <PromotionApprovalOffcanvas
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        selectedCount={selectedIds.length}
        selectedEmployeeNames={data.filter(r => selectedIds.includes(r.id)).map(r => r.employeeName)}
        onConfirm={handleConfirmApproval}
        loading={isSubmittingApproval}
      />
    </div>
  );
}
