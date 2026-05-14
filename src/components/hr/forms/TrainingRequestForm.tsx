"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

export interface TrainingFormRef {
  submit: () => void;
}

interface TrainingRequestFormProps {
  onSuccess: (title?: string, content?: string) => void;
  onCancel: () => void;
  initialData?: any;
  onLoadingChange?: (loading: boolean) => void;
}

export const TrainingRequestForm = forwardRef<TrainingFormRef, TrainingRequestFormProps>(
  ({ onSuccess, onCancel, initialData, onLoadingChange }, ref) => {
  const { data: session } = useSession();
  const { error: toastError } = useToast();
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

  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit(new Event('submit') as any)
  }));

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        topic: initialData.topic || "",
        target: initialData.target || "",
        goal: initialData.goal || "",
        duration: initialData.duration || "",
        type: initialData.type || "PERIODIC",
        priority: initialData.priority || "NORMAL",
        description: initialData.description || "",
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) return toastError("Lỗi", "Vui lòng nhập chủ đề đào tạo");
    
    setLoading(true);
    try {
      const url = initialData ? `/api/hr/training/requests/${initialData.id}` : "/api/hr/training/requests";
      const method = initialData ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, requesterId: (session?.user as any)?.id })
      });

      if (!res.ok) throw new Error("Có lỗi xảy ra");
      onSuccess(
        "Yêu cầu đào tạo mới",
        `Trưởng phòng **${session?.user?.name}** vừa gửi yêu cầu đào tạo với chủ đề **${formData.topic}**.`
      );
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderRadius: "12px", padding: "12px 15px", border: "2px solid #e2e8f0",
    fontSize: "15px", transition: "all 0.2s"
  };
  
  const labelStyle = {
    fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px", display: "block", textTransform: "uppercase" as const
  };

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column h-100 overflow-hidden">
      <div className="flex-grow-1 overflow-auto custom-scrollbar pe-2">
        <div className="row g-3">
          <div className="col-12">
            <label style={labelStyle}>Chủ đề đào tạo <span className="text-danger">*</span></label>
            <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} placeholder="VD: Kỹ năng giao tiếp khách hàng" />
          </div>
          <div className="col-md-6">
            <label style={labelStyle}>Đối tượng đào tạo</label>
            <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} placeholder="VD: Nhân viên mới" />
          </div>
          <div className="col-md-6">
            <label style={labelStyle}>Thời lượng dự kiến</label>
            <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="VD: 4 buổi" />
          </div>
          <div className="col-md-6">
            <label style={labelStyle}>Phân loại</label>
            <select className="form-select shadow-none" style={inputStyle} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="PERIODIC">Định kỳ</option><option value="ADHOC">Phát sinh</option>
            </select>
          </div>
          <div className="col-md-6">
            <label style={labelStyle}>Mức độ ưu tiên</label>
            <select className="form-select shadow-none" style={inputStyle} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
              <option value="NORMAL">Bình thường</option><option value="HIGH">Cao</option>
            </select>
          </div>
          <div className="col-12">
            <label style={labelStyle}>Mục tiêu & Mô tả</label>
            <textarea className="form-control shadow-none" style={{ ...inputStyle, height: "120px" }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Chi tiết nội dung..."></textarea>
          </div>
        </div>
      </div>
    </form>
  );
});
