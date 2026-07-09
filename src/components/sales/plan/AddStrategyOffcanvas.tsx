"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface AddStrategyOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
}

export function AddStrategyOffcanvas({ open, onClose, onAdd, onDelete, initialData }: AddStrategyOffcanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");

  const handleSave = () => {
    if (!name) return;
    onAdd?.({ name, detail });
    setName("");
    setDetail("");
    onClose();
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || "");
        setDetail(initialData.detail || "");
      } else {
        setName("");
        setDetail("");
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    setMounted(true);
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none", zIndex: 1040 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.4s cubic-bezier(0.05, 0.7, 0.1, 1), visibility 0.4s",
          background: "#fcfcfc",
          zIndex: 1045
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 bg-white sticky-top">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <i className="bi bi-lightbulb fs-5" />
            </div>
            <div>
              <h6 className="offcanvas-title fw-bold text-dark mb-0">
                {initialData ? "Cập nhật chiến lược" : "Thêm chiến lược hành động"}
              </h6>
              <small className="text-secondary" style={{ fontSize: 12 }}>
                Chi tiết kế hoạch triển khai
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn-close shadow-none"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>

        <div className="offcanvas-body p-4 custom-scrollbar d-flex flex-column gap-4">
          <div className="d-flex flex-column gap-2">
            <label className="fw-medium text-dark" style={{ fontSize: 13 }}>Mục tiêu chiến lược <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="form-control form-control-sm" 
                placeholder="Nhập mục tiêu..." 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
          </div>

          <div className="d-flex flex-column gap-2 flex-grow-1">
            <label className="fw-medium text-dark flex-shrink-0" style={{ fontSize: 13 }}>Hành động thực thi <span className="text-danger">*</span></label>
            <div className="position-relative flex-grow-1 w-100" style={{ minHeight: 0 }}>
              <textarea 
                className="form-control form-control-sm custom-scrollbar position-absolute top-0 start-0 w-100 h-100" 
                style={{ resize: "none" }} 
                placeholder="Nhập hành động cần làm..."
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="offcanvas-footer d-flex justify-content-between p-3 border-top bg-white">
          <button type="button" className="btn btn-sm btn-light px-4" onClick={onClose}>
            Hủy
          </button>
          <div className="d-flex gap-2">
            {initialData && (
              <button type="button" className="btn btn-sm btn-outline-danger px-3" onClick={() => { onDelete?.(); onClose(); }}>
                <i className="bi bi-trash"></i> Xóa
              </button>
            )}
            <button type="button" className="btn btn-sm btn-primary px-4" onClick={handleSave}>
              {initialData ? "Cập nhật" : "Tiếp tục"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
