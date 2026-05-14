"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateTrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: any;
}

export const CreateTrainingPlanModal = ({ isOpen, onClose, onSuccess, request }: CreateTrainingPlanModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    cost: "0",
    location: "",
    instructor: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        startDate: "",
        endDate: "",
        cost: "0",
        location: "",
        instructor: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate) return alert("Vui lòng chọn ngày bắt đầu");
    
    setLoading(true);
    try {
      const res = await fetch("/api/hr/training/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          requestId: request.id
        })
      });

      if (!res.ok) throw new Error("Có lỗi xảy ra khi lập kế hoạch");

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderRadius: "10px", padding: "10px 15px", border: "1.5px solid var(--border)",
    fontSize: "14px", transition: "all 0.2s", background: "var(--card)"
  };

  const labelStyle = {
    fontSize: "13px", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: "6px", display: "block"
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ 
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
            background: "rgba(0, 0, 0, 0.4)", zIndex: 2000, 
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            style={{ 
              width: "100%", maxWidth: "550px",
              background: "var(--background)", borderRadius: "20px", overflow: "hidden",
              display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">Lập kế hoạch đào tạo chi tiết</h6>
              <button className="btn-close shadow-none" onClick={onClose}></button>
            </div>

            <div className="p-4">
              <div className="bg-light p-3 rounded-3 mb-4 border">
                <div className="text-muted small">Yêu cầu đào tạo:</div>
                <div className="fw-bold">{request?.topic}</div>
                <div className="text-muted small mt-1">Đối tượng: {request?.target}</div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label style={labelStyle}>Ngày bắt đầu <span className="text-danger">*</span></label>
                    <input 
                      type="date" className="form-control shadow-none" style={inputStyle} 
                      value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>Ngày kết thúc</label>
                    <input 
                      type="date" className="form-control shadow-none" style={inputStyle} 
                      value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} 
                    />
                  </div>
                  <div className="col-12">
                    <label style={labelStyle}>Địa điểm tổ chức</label>
                    <input 
                      type="text" className="form-control shadow-none" style={inputStyle} 
                      value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} 
                      placeholder="VD: Phòng họp A hoặc Online qua Zoom" 
                    />
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>Giảng viên / Người phụ trách</label>
                    <input 
                      type="text" className="form-control shadow-none" style={inputStyle} 
                      value={formData.instructor} onChange={e => setFormData({...formData, instructor: e.target.value})} 
                      placeholder="Tên giảng viên" 
                    />
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>Chi phí dự kiến (VNĐ)</label>
                    <input 
                      type="number" className="form-control shadow-none" style={inputStyle} 
                      value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="mt-4 d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-light px-4 fw-bold" onClick={onClose} style={{ borderRadius: "10px" }}>Hủy</button>
                  <button 
                    type="submit" className="btn btn-primary px-4 fw-bold shadow-sm" 
                    style={{ borderRadius: "10px", background: "var(--primary)", border: "none" }} 
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Lưu kế hoạch & Trình duyệt"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
