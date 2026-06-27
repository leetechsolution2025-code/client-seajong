"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateTrainingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const CreateTrainingRequestModal = ({ isOpen, onClose, onSuccess, initialData }: CreateTrainingRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    target: "",
    goal: "",
    duration: "",
    type: "PERIODIC",
    priority: "NORMAL",
    description: "",
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        topic: initialData.topic || "",
        target: initialData.target || "",
        goal: initialData.goal || "",
        duration: initialData.duration || "",
        type: initialData.type || "PERIODIC",
        priority: initialData.priority || "NORMAL",
        description: initialData.description || "",
      });
    } else if (isOpen) {
      setFormData({
        topic: "",
        target: "",
        goal: "",
        duration: "",
        type: "PERIODIC",
        priority: "NORMAL",
        description: "",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) return alert("Vui lòng nhập chủ đề đào tạo");
    
    setLoading(true);
    try {
      const url = initialData ? `/api/hr/training/requests/${initialData.id}` : "/api/hr/training/requests";
      const method = initialData ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || "Có lỗi xảy ra khi lưu dữ liệu");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi: " + error.message);
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
              width: "100%", maxWidth: "600px",
              background: "var(--background)", borderRadius: "20px", overflow: "hidden",
              display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">{initialData ? "Chỉnh sửa yêu cầu" : "Tạo yêu cầu đào tạo"}</h6>
              <button className="btn-close shadow-none" onClick={onClose}></button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label style={labelStyle}>Chủ đề đào tạo <span className="text-danger">*</span></label>
                  <input 
                    type="text" className="form-control shadow-none" style={inputStyle} 
                    value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} 
                    placeholder="VD: Kỹ năng giao tiếp khách hàng" 
                  />
                </div>
                
                <div className="col-md-6">
                  <label style={labelStyle}>Đối tượng đào tạo</label>
                  <input 
                    type="text" className="form-control shadow-none" style={inputStyle} 
                    value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} 
                    placeholder="VD: Nhân viên kinh doanh mới" 
                  />
                </div>

                <div className="col-md-6">
                  <label style={labelStyle}>Thời lượng dự kiến</label>
                  <input 
                    type="text" className="form-control shadow-none" style={inputStyle} 
                    value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} 
                    placeholder="VD: 4 buổi (16 giờ)" 
                  />
                </div>

                <div className="col-md-6">
                  <label style={labelStyle}>Phân loại</label>
                  <select 
                    className="form-select shadow-none" style={inputStyle} 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="PERIODIC">Định kỳ (Hàng năm)</option>
                    <option value="ADHOC">Phát sinh (Theo nhu cầu)</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={labelStyle}>Mức độ ưu tiên</label>
                  <select 
                    className="form-select shadow-none" style={inputStyle} 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="NORMAL">Bình thường</option>
                    <option value="HIGH">Quan trọng / Khẩn cấp</option>
                  </select>
                </div>

                <div className="col-12">
                  <label style={labelStyle}>Mục tiêu đào tạo</label>
                  <textarea 
                    className="form-control shadow-none" style={{ ...inputStyle, height: "80px" }} 
                    value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} 
                    placeholder="Mục tiêu sau khoá học ứng viên đạt được gì..."
                  ></textarea>
                </div>

                <div className="col-12">
                  <label style={labelStyle}>Mô tả chi tiết</label>
                  <textarea 
                    className="form-control shadow-none" style={{ ...inputStyle, height: "100px" }} 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Nội dung chính, giảng viên dự kiến, tài liệu..."
                  ></textarea>
                </div>
              </div>

              <div className="mt-4 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light px-4 fw-bold" onClick={onClose} style={{ borderRadius: "10px" }}>Hủy</button>
                <button 
                  type="submit" className="btn btn-primary px-4 fw-bold shadow-sm" 
                  style={{ borderRadius: "10px", background: "var(--primary)", border: "none" }} 
                  disabled={loading}
                >
                  {loading ? "Đang lưu..." : (initialData ? "Cập nhật" : "Tạo yêu cầu")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
