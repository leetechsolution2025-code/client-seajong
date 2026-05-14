"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecruitmentRequestForm, RecruitmentFormRef } from "@/components/hr/forms/RecruitmentRequestForm";
import { TrainingRequestForm, TrainingFormRef } from "@/components/hr/forms/TrainingRequestForm";
import SalaryAdjustmentRequestForm, { SalaryAdjustmentFormRef } from "@/components/hr/forms/SalaryAdjustmentRequestForm";
import { useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Suspense } from "react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type TabType = "RECRUITMENT" | "TRAINING" | "PROMOTION" | "SALARY";

const TABS = [
  { id: "RECRUITMENT", label: "Tuyển dụng", icon: "bi-person-plus" },
  { id: "TRAINING", label: "Đào tạo", icon: "bi-mortarboard" },
  { id: "PROMOTION", label: "Đề bạt và thuyên chuyển", icon: "bi-arrow-left-right" },
  { id: "SALARY", label: "Điều chỉnh thu nhập", icon: "bi-cash-stack" },
];

function HRRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabType;

  const [activeTab, setActiveTab] = useState<TabType>(tabParam || "RECRUITMENT");
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const recruitmentRef = useRef<RecruitmentFormRef>(null);
  const trainingRef = useRef<TrainingFormRef>(null);
  const promotionRef = useRef<HTMLFormElement>(null);
  const salaryRef = useRef<SalaryAdjustmentFormRef>(null);

  const [recruitmentStep, setRecruitmentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ open: boolean; type: "delete" | "recall" | null; title: string; message: string; variant: "danger" | "warning" } | null>(null);

  // Promotion Form State
  const [promotionForm, setPromotionForm] = useState({
    employeeId: "",
    type: "PROMOTION",
    targetDept: "",
    targetPos: "",
    reason: "",
    effectiveDate: "",
  });

  useEffect(() => {
    fetchEmployees();

    // Fetch all requests
    Promise.all([
          fetch("/api/hr/recruitment").then(r => r.json()).catch(() => []),
      fetch("/api/hr/training/requests").then(r => r.json()).catch(() => []),
      fetch("/api/hr/promotions").then(r => r.json()).catch(() => []),
      fetch("/api/hr/salary-adjustment").then(r => r.json()).catch(() => [])
    ]).then(([recData, traData, proData, salData]) => {
      let combined: any[] = [];
      const currentUserName = session?.user?.name;

      if (Array.isArray(recData)) {
        recData.filter((item: any) => item.requestedBy === currentUserName || item.requester?.name === currentUserName).forEach((item: any) => {
          combined.push({
            id: item.id,
            displayType: "Tuyển dụng",
            tabType: "RECRUITMENT",
            title: item.position || "Yêu cầu tuyển dụng",
            status: item.status,
            createdAt: item.createdAt,
            raw: item
          });
        });
      }

      if (Array.isArray(traData)) {
         traData.filter((item: any) => item.requesterId === (session?.user as any)?.id || item.requester?.name === currentUserName).forEach((item: any) => {
           combined.push({
             id: item.id,
             displayType: "Đào tạo",
             tabType: "TRAINING",
             title: item.topic || "Yêu cầu đào tạo",
             status: item.status,
             createdAt: item.createdAt,
             raw: item
           });
         });
      }

      if (Array.isArray(proData)) {
        proData.filter((item: any) => item.requesterName === currentUserName || item.requester?.name === currentUserName).forEach((item: any) => {
          combined.push({
             id: item.id,
             displayType: item.type === 'PROMOTION' ? 'Thăng tiến' : item.type === 'TRANSFER' ? 'Điều chuyển' : 'Bãi nhiệm',
             tabType: "PROMOTION",
             title: item.employeeName || "Nhân sự",
             status: item.status,
             createdAt: item.createdAt,
             raw: item
          });
        });
      }

      if (Array.isArray(salData)) {
        salData.filter((item: any) => 
          item.requesterId === (session?.user as any)?.employeeId || 
          item.requester?.fullName === currentUserName ||
          item.requester?.name === currentUserName
        ).forEach((item: any) => {
          combined.push({
            id: item.id,
            displayType: item.adjustmentType === 'INCREASE' ? 'Tăng lương' : item.adjustmentType === 'DECREASE' ? 'Giảm lương' : 'Tái cơ cấu',
            tabType: "SALARY",
            title: `ĐC Thu nhập: ${item.employee?.fullName || 'N/A'}`,
            status: item.status,
            createdAt: item.createdAt,
            raw: item
          });
        });
      }

      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyRequests(combined.slice(0, 10));
    });

    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d ?? []))
      .catch(() => { });

    // Fetch all employees to find HR Manager for notifications
    fetch("/api/hr/employees?pageSize=1000")
      .then(r => r.json())
      .then(d => {
        if (d.employees) setAllEmployees(d.employees);
      })
      .catch(() => { });
  }, [session]);

  const fetchEmployees = async () => {
    if (!session?.user) return;
    setLoadingEmployees(true);
    try {
      const deptCode = (session?.user as any)?.departmentCode;
      const url = `/api/hr/employees?department=${deptCode || ""}&pageSize=100`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.employees) setEmployees(data.employees);
      if (data.departments) setDepartments(data.departments);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handlePromotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotionForm.employeeId) return toastError("Lỗi", "Vui lòng chọn nhân viên");

    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find(emp => emp.id === promotionForm.employeeId);
      const isEditing = editingItem && editingItem.tabType === "PROMOTION";
      const url = isEditing ? `/api/hr/promotions/${editingItem.id}` : "/api/hr/promotions";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...promotionForm,
          currentDept: selectedEmp?.departmentName || "",
          currentPos: selectedEmp?.position || "",
        })
      });

      if (res.ok) {
        success("Thành công", "Gửi đề xuất thành công!");
        router.back();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Có lỗi xảy ra");
      }
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const resetForms = () => {
    setEditingItem(null);
    setPromotionForm({
      employeeId: "",
      type: "PROMOTION",
      targetDept: "",
      targetPos: "",
      reason: "",
      effectiveDate: "",
    });
  };

  const handleSuccess = (title?: string, content?: string) => {
    success(title || "Thành công", content || "Gửi yêu cầu thành công!");
    resetForms();
    // Re-fetch to show new request in the list
    Promise.all([
      fetch("/api/hr/recruitment").then(r => r.json()).catch(() => []),
      fetch("/api/hr/training/requests").then(r => r.json()).catch(() => []),
      fetch("/api/hr/promotions").then(r => r.json()).catch(() => []),
      fetch("/api/hr/salary-adjustment").then(r => r.json()).catch(() => [])
    ]).then(([recData, traData, proData, salData]) => {
      let combined: any[] = [];
      const currentUserName = session?.user?.name;

      if (Array.isArray(recData)) {
        recData.filter((item: any) => item.requestedBy === currentUserName || item.requester?.name === currentUserName).forEach((item: any) => {
          combined.push({ id: item.id, displayType: "Tuyển dụng", tabType: "RECRUITMENT", title: item.position || "Yêu cầu tuyển dụng", status: item.status, createdAt: item.createdAt, raw: item });
        });
      }
      if (Array.isArray(traData)) {
        traData.filter((item: any) => item.requesterId === (session?.user as any)?.id || item.requester?.name === currentUserName).forEach((item: any) => {
          combined.push({ id: item.id, displayType: "Đào tạo", tabType: "TRAINING", title: item.topic || "Yêu cầu đào tạo", status: item.status, createdAt: item.createdAt, raw: item });
        });
      }
      if (Array.isArray(proData)) {
        proData.filter((item: any) => item.requesterName === currentUserName || item.requester?.name === currentUserName).forEach((item: any) => {
          combined.push({ id: item.id, displayType: item.type === 'PROMOTION' ? 'Thăng tiến' : item.type === 'TRANSFER' ? 'Điều chuyển' : 'Bãi nhiệm', tabType: "PROMOTION", title: item.employeeName || "Nhân sự", status: item.status, createdAt: item.createdAt, raw: item });
        });
      }
      if (Array.isArray(salData)) {
        salData.filter((item: any) => 
          item.requesterId === (session?.user as any)?.employeeId || 
          item.requester?.fullName === currentUserName || 
          item.requester?.name === currentUserName
        ).forEach((item: any) => {
          combined.push({ id: item.id, displayType: item.adjustmentType === 'INCREASE' ? 'Tăng lương' : item.adjustmentType === 'DECREASE' ? 'Giảm lương' : 'Tái cơ cấu', tabType: "SALARY", title: `ĐC Thu nhập: ${item.employee?.fullName || 'N/A'}`, status: item.status, createdAt: item.createdAt, raw: item });
        });
      }
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyRequests(combined.slice(0, 10));
    });
  };

  const handleBackOrCancel = () => {
    resetForms();
    router.back();
  };

  const executeDelete = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      let url = "";
      if (activeTab === "RECRUITMENT") url = `/api/hr/recruitment/${editingItem.id}`;
      else if (activeTab === "TRAINING") url = `/api/hr/training/requests/${editingItem.id}`;
      else if (activeTab === "SALARY") url = `/api/hr/salary-adjustment/${editingItem.id}`;
      else if (activeTab === "PROMOTION") url = `/api/hr/promotions/${editingItem.id}`;
      
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi khi xóa yêu cầu");
      
      success("Thành công", "Đã xóa yêu cầu thành công!");
      
      setMyRequests(prev => prev.filter(req => req.id !== editingItem.id));
      resetForms();
      setConfirmConfig(null);
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRecall = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hr/requests/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          type: editingItem.tabType,
          title: editingItem.title,
          requester: session?.user?.name || "Hệ thống"
        })
      });
      if (!res.ok) throw new Error("Lỗi khi gửi yêu cầu thu hồi");
      
      success("Thành công", "Đã gửi yêu cầu thu hồi tới Trưởng phòng nhân sự!");
      resetForms();
      setConfirmConfig(null);
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = () => {
    setConfirmConfig({ open: true, type: "delete", title: "Xóa yêu cầu", message: "Bạn có chắc chắn muốn xóa yêu cầu này?", variant: "danger" });
  };

  const handleRecallRequest = () => {
    setConfirmConfig({ open: true, type: "recall", title: "Thu hồi yêu cầu", message: "Bạn có chắc chắn muốn gửi yêu cầu thu hồi tới Trưởng phòng nhân sự?", variant: "warning" });
  };

  const handleEditRequest = (req: any) => {
    setEditingItem(req);
    setActiveTab(req.tabType);
    if (req.tabType === "PROMOTION") {
      // API có thể trả về employeeId là mã nhân viên (code) thay vì UUID, cần đối chiếu với danh sách employees
      const rawEmpId = req.raw.employeeId;
      const empMatch = employees.find((e: any) => e.code === rawEmpId || e.id === rawEmpId);

      setPromotionForm({
        employeeId: empMatch ? empMatch.id : rawEmpId || "",
        type: req.raw.type || "PROMOTION",
        targetDept: req.raw.targetDept || "",
        targetPos: req.raw.targetPos || "",
        reason: req.raw.reason || "",
        effectiveDate: req.raw.effectiveDate ? new Date(req.raw.effectiveDate).toISOString().split('T')[0] : "",
      });
    }
  };

  const handleNextOrSubmit = () => {
    if (activeTab === "RECRUITMENT") {
      recruitmentRef.current?.submit();
    } else if (activeTab === "TRAINING") {
      trainingRef.current?.submit();
    } else if (activeTab === "SALARY") {
      salaryRef.current?.submit();
    } else {
      if (promotionRef.current) {
        promotionRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  };

  return (
    <div className="row mt-2 flex-grow-1 overflow-hidden align-items-stretch" style={{ height: 0 }}>
      <div className="col-lg-3 d-flex flex-column h-100 pb-4">
        <div className="card border-0 shadow-sm p-2 mb-3" style={{ borderRadius: "20px", background: "var(--card)" }}>
          <div className="px-3 py-2 mt-1">
            <h6 className="fw-bold mb-0" style={{ fontSize: "15px" }}>Loại yêu cầu</h6>
          </div>
          <div className="p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as TabType); resetForms(); }}
                className={`btn w-100 d-flex align-items-center gap-2 px-3 py-2.5 mb-1 border-0 transition-all ${activeTab === tab.id ? "bg-primary text-white shadow-sm" : "text-muted"}`}
                style={{ borderRadius: "12px", textAlign: "left", fontSize: "14px" }}
              >
                <i className={`bi ${tab.icon}`} style={{ fontSize: "16px" }}></i>
                <span className="fw-500">{tab.label}</span>
                {activeTab === tab.id && <i className="bi bi-chevron-right ms-auto" style={{ fontSize: "12px" }}></i>}
              </button>
            ))}
          </div>
        </div>

        <div className="card border-0 shadow-sm flex-grow-1 d-flex flex-column overflow-hidden" style={{ borderRadius: "20px", background: "var(--card)", minHeight: 0 }}>
          <div className="px-4 py-3 border-bottom bg-light bg-opacity-10">
            <h6 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ fontSize: "15px" }}>
              <i className="bi bi-clock-history text-primary"></i>
              Yêu cầu gần đây
            </h6>
          </div>
          <div className="flex-grow-1 overflow-auto custom-scrollbar p-1">
            {myRequests.length > 0 ? (
              myRequests.map((req, idx) => (
                <div key={req.id} 
                     className={`px-2 py-2 mx-1 ${idx !== myRequests.length - 1 ? 'border-bottom' : ''}`} 
                     style={{ transition: "all 0.2s", cursor: "pointer" }}
                     onClick={() => handleEditRequest(req)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold text-truncate me-2" style={{ fontSize: "12.5px", maxWidth: "130px" }}>{req.title}</span>
                    <span className="badge rounded-pill" style={{
                      fontSize: "9.5px",
                      padding: "3px 7px",
                      background: ['RECEIVING', 'Pending', 'PENDING', 'New'].includes(req.status) ? '#EEF2FF' : 
                                  ['INTERVIEWING', 'Interviewing', 'WAITING_APPROVAL', 'Submitting', 'REVIEWING', 'Recruiting', 'Screened', 'CONCLUSION'].includes(req.status) ? '#FFFBEB' : 
                                  ['REJECTED', 'Rejected', 'REJECTED_BY_HR', 'REJECTED_BY_DIRECTOR'].includes(req.status) ? '#FEF2F2' : '#F0FDF4',
                      color: ['RECEIVING', 'Pending', 'PENDING', 'New'].includes(req.status) ? '#4F46E5' : 
                             ['INTERVIEWING', 'Interviewing', 'WAITING_APPROVAL', 'Submitting', 'REVIEWING', 'Recruiting', 'Screened', 'CONCLUSION'].includes(req.status) ? '#D97706' : 
                             ['REJECTED', 'Rejected', 'REJECTED_BY_HR', 'REJECTED_BY_DIRECTOR'].includes(req.status) ? '#DC2626' : '#16A34A',
                      border: `1px solid ${['RECEIVING', 'Pending', 'PENDING', 'New'].includes(req.status) ? '#C7D2FE' : 
                                           ['INTERVIEWING', 'Interviewing', 'WAITING_APPROVAL', 'Submitting', 'REVIEWING', 'Recruiting', 'Screened', 'CONCLUSION'].includes(req.status) ? '#FDE68A' : 
                                           ['REJECTED', 'Rejected', 'REJECTED_BY_HR', 'REJECTED_BY_DIRECTOR'].includes(req.status) ? '#FECACA' : '#BBF7D0'}`
                    }}>
                      {
                        (() => {
                          const status = req.status;
                          const raw = req.raw || {};
                          
                          if (['RECEIVING', 'Pending', 'PENDING', 'New'].includes(status)) return 'Mới';
                          if (status === 'REVIEWING' || (req.tabType === 'RECRUITMENT' && status === 'Approved')) return 'Đã chấp nhận';
                          if (status === 'Recruiting') return 'Đang tìm ứng viên';
                          if (status === 'Interviewing') return 'Chờ phỏng vấn';
                          if (status === 'WAITING_APPROVAL' || status === 'Submitting') return 'Đang trình duyệt';
                          if (status === 'REJECTED_BY_HR') return 'Không chấp nhận';
                          if (['REJECTED', 'Rejected', 'REJECTED_BY_DIRECTOR'].includes(status)) return 'Từ chối';
                          if (status === 'Hired') return 'Đã tuyển dụng';
                          if (['APPROVED', 'Approved'].includes(status)) return 'Đã phê duyệt';
                          if (status === 'Completed') return 'Hoàn thành';
                        })()
                      }
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: "11px" }}>
                    <span>{req.displayType}</span>
                    <span className="opacity-50">|</span>
                    <span>{new Date(req.createdAt).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-5 text-center text-muted small">
                <i className="bi bi-inbox d-block mb-2" style={{ fontSize: "24px", opacity: 0.3 }}></i>
                Chưa có yêu cầu nào
              </div>
            )}
          </div>
          {myRequests.length > 0 && (
            <div className="p-2 text-center border-top">
              <button className="btn btn-link btn-sm text-decoration-none p-0 fw-bold" style={{ fontSize: "12px", color: "var(--primary)" }}>
                Xem tất cả
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="col-lg-9 d-flex flex-column h-100 pb-3">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-0 shadow-sm p-0 h-100 d-flex flex-column"
          style={{ borderRadius: "24px", background: "var(--card)", overflow: "hidden" }}
        >
          <div className="p-4 p-md-5 pb-3">
            <h4 className="fw-bold mb-1" style={{ fontSize: "20px" }}>{TABS.find(t => t.id === activeTab)?.label}</h4>
          </div>

          <div className="flex-grow-1 overflow-hidden d-flex flex-column px-4 px-md-5 pb-4">
            <AnimatePresence mode="wait">
              {activeTab === "RECRUITMENT" && (
                <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-100">
                  <RecruitmentRequestForm 
                    ref={recruitmentRef}
                    initialData={editingItem?.tabType === "RECRUITMENT" ? editingItem.raw : undefined}
                    onSuccess={handleSuccess} 
                    onCancel={() => router.back()} 
                    onStepChange={setRecruitmentStep}
                    onLoadingChange={setIsSubmitting}
                  />
                </motion.div>
              )}

              {activeTab === "TRAINING" && (
                <motion.div key="tra" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-100">
                  <TrainingRequestForm 
                    ref={trainingRef}
                    initialData={editingItem?.tabType === "TRAINING" ? editingItem.raw : undefined}
                    onSuccess={handleSuccess} 
                    onCancel={() => router.back()} 
                    onLoadingChange={setIsSubmitting}
                  />
                </motion.div>
              )}

              {activeTab === "SALARY" && (
                <motion.div key="sal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-100">
                  <SalaryAdjustmentRequestForm
                    ref={salaryRef}
                    employees={employees}
                    initialData={editingItem?.tabType === "SALARY" ? editingItem.raw : undefined}
                    editingItem={editingItem?.tabType === "SALARY" ? editingItem : undefined}
                    onSuccess={handleSuccess}
                    onLoadingChange={setIsSubmitting}
                  />
                </motion.div>
              )}

              {activeTab === "PROMOTION" && (
                <motion.div key="pro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-100">
                  <form ref={promotionRef} onSubmit={handlePromotionSubmit} className="d-flex flex-column h-100">
                    <div className="flex-grow-1 overflow-auto custom-scrollbar pe-2">
                      <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">Nhân sự thực hiện</label>
                      <select
                        className="form-select form-select-lg border-2 shadow-none"
                        style={{ borderRadius: "12px", fontSize: "15px" }}
                        value={promotionForm.employeeId}
                        onChange={e => setPromotionForm({ ...promotionForm, employeeId: e.target.value })}
                        required
                      >
                        <option value="">Chọn nhân viên trong phòng</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName} - {getPositionName(emp.position)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">Loại hình thay đổi</label>
                      <select
                        className="form-select form-select-lg border-2 shadow-none"
                        style={{ borderRadius: "12px", fontSize: "15px" }}
                        value={promotionForm.type}
                        onChange={e => setPromotionForm({ ...promotionForm, type: e.target.value })}
                      >
                        <option value="PROMOTION">Thăng tiến (Promotion)</option>
                        <option value="TRANSFER">Điều chuyển (Transfer)</option>
                        <option value="DEMOTION">Bãi nhiệm (Demotion)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">Phòng ban đích</label>
                      <select
                        className="form-select form-select-lg border-2 shadow-none"
                        style={{ borderRadius: "12px", fontSize: "15px" }}
                        value={promotionForm.targetDept}
                        onChange={e => setPromotionForm({ ...promotionForm, targetDept: e.target.value })}
                        required
                      >
                        <option value="">Chọn phòng ban</option>
                        {departments.map(d => (
                          <option key={d.code} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">Vị trí đích</label>
                      <input
                        type="text" className="form-control form-control-lg border-2 shadow-none"
                        style={{ borderRadius: "12px", fontSize: "15px" }}
                        placeholder="Nhập chức danh mới..."
                        value={promotionForm.targetPos}
                        onChange={e => setPromotionForm({ ...promotionForm, targetPos: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-bold small text-muted mb-1">Lý do đề xuất</label>
                      <textarea
                        className="form-control border-2 shadow-none"
                        style={{ borderRadius: "12px", height: "100px", fontSize: "14px" }}
                        placeholder="Ghi rõ lý do và căn cứ đề xuất..."
                        value={promotionForm.reason}
                        onChange={e => setPromotionForm({ ...promotionForm, reason: e.target.value })}
                        required
                      ></textarea>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">Ngày hiệu lực dự kiến</label>
                      <input
                        type="date" className="form-control form-control-lg border-2 shadow-none"
                        style={{ borderRadius: "12px", fontSize: "15px" }}
                        value={promotionForm.effectiveDate}
                        onChange={e => setPromotionForm({ ...promotionForm, effectiveDate: e.target.value })}
                        required
                      />
                    </div>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center bg-white" style={{ padding: "1rem 2.5rem" }}>
            <div>
              {!!editingItem && !['CONCLUSION', 'Approved', 'APPROVED', 'Rejected', 'REJECTED'].includes(editingItem.status) && (
                ['RECEIVING', 'Pending', 'PENDING'].includes(editingItem.status) ? (
                  <button 
                    type="button" 
                    className="btn btn-outline-danger px-4 fw-bold" 
                    style={{ borderRadius: "12px", fontSize: "14px", padding: "10px 20px" }}
                    onClick={handleDeleteRequest}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-trash3 me-2"></i>Xóa yêu cầu
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-outline-warning px-4 fw-bold text-dark" 
                    style={{ borderRadius: "12px", fontSize: "14px", padding: "10px 20px", borderColor: "#f59e0b" }}
                    onClick={handleRecallRequest}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-arrow-counterclockwise me-2"></i>Thu hồi yêu cầu
                  </button>
                )
              )}
            </div>

            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-light px-4 fw-bold" 
                style={{ borderRadius: "12px", fontSize: "14px", padding: "10px 20px" }} 
                onClick={handleBackOrCancel}
              >
                Hủy
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary px-5 fw-bold shadow-sm" 
                style={{ borderRadius: "12px", background: "linear-gradient(90deg, #003087 0%, #0056b3 100%)", border: "none", fontSize: "14px", padding: "10px 20px" }} 
                onClick={handleNextOrSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xử lý..." : !!editingItem ? "Cập nhật thông tin" : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {confirmConfig && (
        <ConfirmDialog
          open={confirmConfig.open}
          title={confirmConfig.title}
          message={confirmConfig.message}
          variant={confirmConfig.variant}
          confirmLabel="OK"
          cancelLabel="Hủy"
          loading={isSubmitting}
          onConfirm={confirmConfig.type === "delete" ? executeDelete : executeRecall}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}

export default function HRRequestsPage() {
  return (
    <div className="container-fluid pb-0 px-4 pt-0 d-flex flex-column h-100" style={{ background: "var(--background)", overflow: "hidden" }}>
      <PageHeader
        title="Trung tâm tạo yêu cầu nhân sự"
        description="Gửi các yêu cầu tuyển dụng, đào tạo hoặc thăng tiến cho bộ phận của anh/chị"
        icon="bi-person-gear"
        color="blue"
      />
      <Suspense fallback={
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      }>
        <HRRequestsContent />
      </Suspense>
    </div>
  );
}
