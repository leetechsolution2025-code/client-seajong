"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";

interface PolicyOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PolicyOffcanvas({ open, onClose, onSuccess }: PolicyOffcanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    docNo: "",
    status: "Hiệu lực",
    issueDate: "",
    issuer: "Giám đốc",
    summary: "",
    file: null as File | null
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData();
      form.append("name", formData.name);
      form.append("docNo", formData.docNo);
      form.append("status", formData.status);
      form.append("issueDate", formData.issueDate);
      form.append("issuer", formData.issuer);
      form.append("summary", formData.summary);
      if (formData.file) {
        form.append("file", formData.file);
      }

      const res = await fetch("/api/sales/policies", {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        setFormData({
          name: "",
          docNo: "",
          status: "Hiệu lực",
          issueDate: "",
          issuer: "Giám đốc",
          summary: "",
          file: null,
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert("Có lỗi xảy ra khi lưu chính sách.");
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  return createPortal(
    <>
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none" }}
        onClick={onClose}
      />

      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          maxWidth: "100%",
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <i className="bi bi-file-earmark-text fs-5" />
            </div>
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 15 }}>
              Thêm chính sách
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto custom-scrollbar">
          <form id="policy-form" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" style={labelStyle}>Tên chính sách <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tên chính sách..."
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <label className="form-label" style={labelStyle}>Số văn bản</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: 125/2026/CS-SJ"
                  value={formData.docNo}
                  onChange={e => setFormData({ ...formData, docNo: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div className="col-6">
                <label className="form-label" style={labelStyle}>Trạng thái</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Hiệu lực">Đang hiệu lực</option>
                  <option value="Hết hiệu lực">Hết hiệu lực</option>
                </select>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <label className="form-label" style={labelStyle}>Ngày ban hành</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.issueDate}
                  onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div className="col-6">
                <label className="form-label" style={labelStyle}>Người ban hành</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.issuer}
                  onChange={e => setFormData({ ...formData, issuer: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label" style={labelStyle}>Tóm tắt nội dung</label>
              <textarea
                className="form-control"
                placeholder="Nhập tóm tắt nội dung..."
                rows={3}
                value={formData.summary}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" style={labelStyle}>Tải tệp văn bản gốc</label>
              <input
                type="file"
                className="form-control"
                onChange={e => setFormData({ ...formData, file: e.target.files ? e.target.files[0] : null })}
                style={inputStyle}
              />
            </div>
          </form>
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <BrandButton
              variant="outline"
              className="flex-grow-1 py-2"
              onClick={onClose}
              style={{ fontSize: 13 }}
            >
              Sửa chữa
            </BrandButton>
            <BrandButton
              type="submit"
              form="policy-form"
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
        </div>
      </div>
    </>,
    document.body
  );
}
