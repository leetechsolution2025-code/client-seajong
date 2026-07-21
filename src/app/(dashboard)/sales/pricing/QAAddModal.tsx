"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";

interface QAAddModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newId?: number) => void;
}

export function QAAddModal({ open, onClose, onSuccess }: QAAddModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: ""
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/soft-skills-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ question: "", answer: "" });
        if (onSuccess) onSuccess(data.id);
        onClose();
      } else {
        alert("Có lỗi xảy ra khi lưu câu hỏi.");
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 14, borderRadius: 8 };

  return createPortal(
    <>
      <div className={`modal-backdrop fade ${open ? "show" : ""}`} style={{ zIndex: 1050, display: open ? "block" : "none" }}></div>
      <div 
        className={`modal fade ${open ? "show d-block" : ""}`} 
        tabIndex={-1} 
        style={{ zIndex: 1051, display: open ? "block" : "none" }}
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-light border-bottom px-4 py-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary-subtle p-2 rounded-3 text-primary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                  <i className="bi bi-question-circle-fill fs-5" />
                </div>
                <h5 className="modal-title fw-bold mb-0" style={{ fontSize: 16 }}>
                  Thêm câu hỏi
                </h5>
              </div>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            <form id="qa-form" onSubmit={handleSubmit}>
              <div className="modal-body p-4">
                <div className="mb-4">
                  <label className="form-label" style={labelStyle}>Nội dung câu hỏi <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    placeholder="Nhập nội dung câu hỏi..."
                    required
                    rows={3}
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label" style={labelStyle}>Nội dung câu trả lời <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    placeholder="Nhập nội dung câu trả lời..."
                    required
                    rows={6}
                    value={formData.answer}
                    onChange={e => setFormData({ ...formData, answer: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              
              <div className="modal-footer bg-light border-top p-3 d-flex gap-2">
                <BrandButton
                  variant="outline"
                  className="flex-grow-1 py-2"
                  onClick={onClose}
                  style={{ fontSize: 13 }}
                  type="button"
                >
                  Hủy
                </BrandButton>
                <BrandButton
                  type="submit"
                  className="flex-grow-1 py-2"
                  style={{ fontSize: 13 }}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Đang lưu...</>
                  ) : (
                    "Thêm mới"
                  )}
                </BrandButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
