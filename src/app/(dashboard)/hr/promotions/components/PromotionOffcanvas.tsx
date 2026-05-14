"use client";

import React, { useState, useEffect } from "react";
import { PromotionRequest } from "../types";
import { useToast } from "@/components/ui/Toast";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PromotionRequest | null;
  onUpdate: (id: string, updates: Partial<PromotionRequest>) => void;
  onRefresh?: () => void;
  currentStep: number;
}

export const PromotionOffcanvas = ({ isOpen, onClose, data, onUpdate, onRefresh, currentStep }: Props) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [interviewData, setInterviewData] = useState({
    date: "",
    location: "",
    interviewerId: "",
    note: "",
    competency: 5,
    suitability: 5
  });
  const [positions, setPositions] = useState<{code: string, name: string}[]>([]);
  const [employees, setEmployees] = useState<{id: string, code: string, fullName: string, position?: string, userId?: string | null}[]>([]);

  useEffect(() => {
    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d ?? []))
      .catch(() => {});

    fetch("/api/hr/employees?pageSize=1000")
      .then(r => r.json())
      .then(d => {
        const list = d.data || d.employees || [];
        setEmployees(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (data) {
      const initialInterviewer = data.interviewerId || "";
      
      setInterviewData({
        date: data.interviewDate ? new Date(data.interviewDate).toISOString().split("T")[0] : "",
        location: data.interviewLocation || "",
        interviewerId: initialInterviewer,
        note: data.interviewNote || "",
        competency: data.competencyScore || 5,
        suitability: data.suitabilityScore || 5
      });
    }
  }, [data]);

  // Effect to set default interviewer once employees are loaded
  useEffect(() => {
    if (isOpen && employees.length > 0 && !interviewData.interviewerId && currentStep === 2) {
      const hrManager = employees.find(e => 
        e.position?.toLowerCase().includes("trưởng phòng nhân sự") || 
        e.position === "TPNS"
      );
      if (hrManager) {
        setInterviewData(prev => ({ ...prev, interviewerId: hrManager.id }));
      }
    }
  }, [isOpen, employees, interviewData.interviewerId, currentStep]);

  const getPosName = (code?: string) => {
    if (!code) return "—";
    const p = positions.find(x => x.code === code);
    return p ? p.name : code;
  };

  if (!data) return null;

  const callApi = async (updates: Partial<PromotionRequest>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/promotions/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error();
      onUpdate(data.id, updates);
      onRefresh?.();
      return true;
    } catch {
      toastError("Lỗi", "Không thể cập nhật yêu cầu.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleHRApprove = async () => {
    const success = await callApi({ status: "INTERVIEWING", hrApproved: true });
    if (success) {
      toastSuccess("Thành công", `Yêu cầu đã được chuyển sang trạng thái "Đã xử lý" (Bước 2).`);
      onClose();
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/promotions/${data.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error();
      setShowDeleteConfirm(false);
      onRefresh?.();
      toastSuccess("Thành công", "Đã xoá yêu cầu.");
      onClose();
    } catch {
      toastError("Lỗi", "Không thể xoá yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterviewNotifications = async () => {
    if (!data) return;
    
    const interviewer = employees.find(e => e.id === interviewData.interviewerId);
    const candidate = employees.find(e => e.code === data.employeeId);
    
    const dateFormatted = interviewData.date ? new Date(interviewData.date).toLocaleDateString("vi-VN") : "chưa xác định";
    const locationText = interviewData.location || "chưa xác định";

    // 1. Thông báo cho người phỏng vấn
    if (interviewer?.userId) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Mời phỏng vấn đề bạt",
          content: `Bạn được mời tham gia phỏng vấn đề bạt cho nhân sự **${data.employeeName}**.\nThời gian: **${dateFormatted}**\nĐịa điểm: **${locationText}**`,
          type: "message",
          priority: "high",
          audienceType: "individual",
          audienceValue: interviewer.userId,
          attachments: [{
            type: "promotion_interview",
            promotionId: data.id,
            role: "interviewer",
            name: "Xác nhận tham gia phỏng vấn"
          }]
        })
      });
    }

    // 2. Thông báo cho nhân viên được đề bạt
    if (candidate?.userId) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Lịch phỏng vấn đề bạt",
          content: `Hệ thống đã sắp xếp lịch phỏng vấn đề bạt cho bạn.\nThời gian: **${dateFormatted}**\nĐịa điểm: **${locationText}**\nNgười phỏng vấn: **${interviewer?.fullName || "Chưa xác định"}**`,
          type: "message",
          priority: "high",
          audienceType: "individual",
          audienceValue: candidate.userId,
          attachments: [{
            type: "promotion_interview",
            promotionId: data.id,
            role: "employee",
            name: "Xác nhận lịch phỏng vấn"
          }]
        })
      });
    }
  };

  const handleSaveInterview = async () => {
    const success = await callApi({
      interviewDate: interviewData.date ? new Date(interviewData.date).toISOString() : undefined,
      interviewLocation: interviewData.location,
      interviewerId: interviewData.interviewerId || undefined,
      interviewNote: interviewData.note,
      competencyScore: interviewData.competency,
      suitabilityScore: interviewData.suitability
    });
    if (success) {
      await handleSendInterviewNotifications();
      toastSuccess("Thành công", "Thông tin phỏng vấn đã được lưu và gửi thông báo.");
    }
  };

  const handleFinalSync = async () => {
    const success = await callApi({ status: "CONCLUSION", directorApproved: true });
    if (success) {
      toastSuccess("Thành công", "Đã cập nhật dữ liệu nhân sự thành công!");
      onClose();
    }
  };

  const labelStyle = { fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 500, marginBottom: "2px", textTransform: "uppercase" as any };
  const valueStyle = { fontSize: "13px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" };

  return (
    <>
      {isOpen && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={onClose} 
          style={{ zIndex: 1040 }}
        />
      )}
      <div 
        className={`offcanvas offcanvas-end ${isOpen ? "show" : ""}`} 
        style={{ width: "400px", visibility: isOpen ? "visible" : "hidden", zIndex: 1050 }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">Chi tiết quy trình</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body p-4 custom-scrollbar">
          <div className="d-flex align-items-center gap-3 mb-4">
            <EmployeeAvatar name={data.employeeName} url={data.avatar} size={52} borderRadius={99} />
            <div>
              <h6 className="fw-bold mb-0">{data.employeeName}</h6>
              <p className="text-muted mb-0 small">Mã NV: {data.employeeId}</p>
            </div>
          </div>

          <div className="row g-2 mb-2">
            <div className="col-6">
              <div style={labelStyle}>LOẠI YÊU CẦU</div>
              <div style={valueStyle}>{data.type === "PROMOTION" ? "Đề bạt" : data.type === "TRANSFER" ? "Điều chuyển" : "Miễn nhiệm"}</div>
            </div>
            <div className="col-6">
              <div style={labelStyle}>NGÀY GỬI</div>
              <div style={valueStyle}>{new Date(data.createdAt).toLocaleDateString("vi-VN")}</div>
            </div>
          </div>

          <div className="row g-2 mb-2">
            <div className="col-6">
              <div style={labelStyle}>NGƯỜI YÊU CẦU</div>
              <div style={valueStyle}>{data.requesterName || "—"}</div>
            </div>
            <div className="col-6">
              <div style={labelStyle}>CHỨC VỤ</div>
              <div style={valueStyle}>{getPosName(data.requesterPos)}</div>
            </div>
          </div>

          <div className="mb-4">
            <div style={labelStyle}>LỘ TRÌNH ĐỀ XUẤT</div>
            <div className="p-3 bg-light rounded-3 border">
              <div className="small text-muted mb-1">Hiện tại: <strong>{getPosName(data.currentPos)}</strong> ({data.currentDept})</div>
              <div className="small text-primary">Đề xuất: <strong>{getPosName(data.targetPos)}</strong> ({data.targetDept})</div>
            </div>
          </div>

          <div className="mb-4">
            <div style={labelStyle}>LÝ DO ĐỀ XUẤT</div>
            <div className="small text-dark">{data.reason}</div>
          </div>

          {currentStep === 1 && (
            <div className="p-3 bg-light rounded-3 border mb-3">
              <h6 className="small fw-bold text-primary mb-2">Xử lý tiếp nhận</h6>
              {data.status === "RECEIVING" ? (
                <p className="small text-muted mb-0">Xác nhận yêu cầu để chuyển sang giai đoạn phỏng vấn và đánh giá.</p>
              ) : (
                <div className="alert alert-success small py-2 mb-0">Yêu cầu này đã được phê duyệt tiếp nhận và chuyển sang bước phỏng vấn.</div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="p-3 bg-light rounded-3 border mb-3">
              <h6 className="small fw-bold text-primary mb-3">Thông tin phỏng vấn</h6>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="small text-muted mb-1">Ngày phỏng vấn</label>
                  <input type="date" className="form-control form-control-sm" value={interviewData.date} onChange={e => setInterviewData({...interviewData, date: e.target.value})} />
                </div>
                <div className="col-6">
                  <label className="small text-muted mb-1">Người phỏng vấn</label>
                  <select className="form-select form-select-sm" value={interviewData.interviewerId} onChange={e => setInterviewData({...interviewData, interviewerId: e.target.value})}>
                    <option value="">Chọn...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-0">
                <label className="small text-muted mb-1">Địa điểm / Link họp</label>
                <input type="text" className="form-control form-control-sm" value={interviewData.location} onChange={e => setInterviewData({...interviewData, location: e.target.value})} placeholder="Phòng họp A, Zoom..." />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="p-3 bg-light rounded-3 border mb-3">
              <h6 className="small fw-bold text-primary mb-2">Kết luận và Ban hành</h6>
              {data.directorApproved ? (
                <div className="alert alert-success small py-2">Giám đốc đã phê duyệt đề xuất này.</div>
              ) : (
                <div className="alert alert-warning small py-2">Đang chờ ý kiến phê duyệt cuối cùng từ Giám đốc.</div>
              )}
            </div>
          )}
        </div>

        <div className="offcanvas-footer p-4 border-top">
          {currentStep === 1 && (
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-danger px-3"
                onClick={handleDelete}
                disabled={loading}
              >
                <i className="bi bi-trash"></i>
              </button>
              {data.status === "RECEIVING" && (
                <button 
                  className="btn btn-sm btn-primary flex-grow-1" 
                  style={{ background: "#003087", border: "none" }}
                  onClick={handleHRApprove}
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Duyệt yêu cầu"}
                </button>
              )}
            </div>
          )}
          {currentStep === 2 && (
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-primary flex-grow-1" 
                onClick={handleSaveInterview}
                disabled={loading}
              >
                Thông báo lịch phỏng vấn
              </button>
            </div>
          )}
          {currentStep === 3 && (
            <div className="d-flex flex-column gap-2">
              {!data.directorApproved && (
                <button 
                  className="btn btn-sm btn-success w-100" 
                  onClick={handleFinalSync}
                  disabled={loading}
                >
                  Phê duyệt và Ban hành (Giám đốc)
                </button>
              )}
              <button 
                className="btn btn-sm btn-light w-100 border" 
                onClick={onClose}
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog 
        open={showDeleteConfirm}
        title="Xác nhận xoá"
        message="Bạn có chắc chắn muốn xoá yêu cầu này? Hành động này không thể hoàn tác."
        variant="danger"
        loading={loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
