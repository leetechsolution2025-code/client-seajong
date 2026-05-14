"use client";

import React, { useState, useEffect } from "react";
import { BrandButton } from "@/components/ui/BrandButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (data: { recipientId: string; message: string; priority: string }) => Promise<void>;
  loading: boolean;
  selectedEmployeeNames: string[];
}

export function PromotionApprovalOffcanvas({ 
  isOpen, 
  onClose, 
  selectedCount, 
  onConfirm, 
  loading,
  selectedEmployeeNames
}: Props) {
  const [formData, setFormData] = useState({
    message: "",
    priority: "Normal",
    recipientId: ""
  });
  
  const [directors, setDirectors] = useState<any[]>([]);
  const [loadingDirectors, setLoadingDirectors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const namesList = selectedEmployeeNames.join(", ");
      setFormData(prev => ({
        ...prev,
        message: `Kính gửi Ban Giám đốc,\n\nPhòng Nhân sự xin trình kết quả phỏng vấn và đề xuất cho ${selectedCount} nhân sự: ${namesList}.\n\nKính mong Ban Giám đốc xem xét và phê duyệt các đề xuất Đề bạt/Điều chuyển này.`
      }));
      
      fetchDirectors();
    }
  }, [isOpen, selectedCount, selectedEmployeeNames]);

  async function fetchDirectors() {
    setLoadingDirectors(true);
    try {
      // Re-using the logic from recruitment to find managers
      const res = await fetch(`/api/hr/interviewers?level=manager`);
      const data = await res.json();
      const filtered = (Array.isArray(data) ? data : []).filter(d => d.userId);
      setDirectors(filtered);
      if (filtered.length > 0 && !formData.recipientId) {
        setFormData(prev => ({ ...prev, recipientId: filtered[0].userId }));
      }
    } catch (error) {
      console.error("Error fetching directors:", error);
    } finally {
      setLoadingDirectors(true); // Wait, should be false
      setLoadingDirectors(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="offcanvas-backdrop fade show" style={{ zIndex: 1045 }} onClick={onClose} />
      <div className="offcanvas offcanvas-end show border-0 shadow-lg" style={{ width: "450px", zIndex: 1050, visibility: "visible" }}>
        <div className="offcanvas-header border-bottom py-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
              <i className="bi bi-send-check-fill fs-5"></i>
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold m-0">Trình Giám đốc duyệt</h5>
              <p className="text-muted small m-0">Phê duyệt đề bạt & điều chuyển</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body py-4">
          <div className="mb-4">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1">1. Người nhận phê duyệt</label>
            <div className="card border-0 bg-light p-3 rounded-4">
              {loadingDirectors ? (
                <div className="text-center py-2"><span className="spinner-border spinner-border-sm text-primary" /></div>
              ) : directors.length === 0 ? (
                <div className="small text-danger italic">Không tìm thấy nhân sự cấp quản lý</div>
              ) : (
                <select 
                  className="form-select border-0 shadow-sm" 
                  value={formData.recipientId}
                  onChange={e => setFormData(p => ({ ...p, recipientId: e.target.value }))}
                >
                  <option value="">Chọn người phê duyệt...</option>
                  {directors.map(d => (
                    <option key={d.id} value={d.userId}>{d.fullName} - {d.position}</option>
                  ))}
                </select>
              )}
              <div className="mt-3 d-flex align-items-center gap-2">
                <span className="small text-muted">Độ ưu tiên:</span>
                <div className="btn-group btn-group-sm flex-grow-1">
                  <button type="button" className={`btn btn-outline-secondary ${formData.priority === 'Normal' ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, priority: 'Normal' }))}>Thường</button>
                  <button type="button" className={`btn btn-outline-danger ${formData.priority === 'Urgent' ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, priority: 'Urgent' }))}>Khẩn cấp</button>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1">2. Nội dung trình ký</label>
            <textarea 
              className="form-control border-light rounded-4 bg-light p-3" 
              style={{ minHeight: "180px", fontSize: "14px", lineHeight: "1.6" }}
              value={formData.message}
              onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
              placeholder="Nhập nội dung gửi Giám đốc..."
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1">3. Danh sách nhân sự ({selectedCount})</label>
            <div className="overflow-auto border rounded-4 bg-light" style={{ maxHeight: "150px" }}>
              {selectedEmployeeNames.map((name, idx) => (
                <div key={idx} className="p-2 px-3 border-bottom small d-flex align-items-center gap-2">
                  <i className="bi bi-person-check text-success"></i>
                  <span className="fw-bold text-dark">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <BrandButton 
              className="w-100 py-3"
              onClick={() => onConfirm(formData)}
              loading={loading}
              disabled={!formData.recipientId || !formData.message}
              icon="bi-send-fill"
            >
              XÁC NHẬN TRÌNH DUYỆT
            </BrandButton>
            <button type="button" className="btn btn-link w-100 mt-2 text-muted text-decoration-none small" onClick={onClose}>Hủy bỏ</button>
          </div>
        </div>
      </div>
      
      <style>{`
        .letter-spacing-1 { letter-spacing: 0.5px; }
      `}</style>
    </>
  );
}
