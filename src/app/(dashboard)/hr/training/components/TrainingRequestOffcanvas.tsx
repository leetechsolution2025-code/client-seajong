"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandButton } from "@/components/ui/BrandButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TrainingRequestOffcanvas = ({ isOpen, onClose, data, onApprove, onReject, onDelete }: Props) => {
  if (!data) return null;

  const labelStyle = { fontSize: "12px", color: "var(--muted-foreground)", fontWeight: 500, marginBottom: "4px" };
  const valueStyle = { fontSize: "14px", color: "var(--foreground)", fontWeight: 600, marginBottom: "16px" };

  const getStatusBadge = (status: string) => {
    const cfg: any = {
      APPROVED: { bg: "rgba(34, 197, 94, 0.1)", color: "#16a34a", label: "Đã duyệt" },
      PENDING: { bg: "rgba(234, 179, 8, 0.1)", color: "#ca8a04", label: "Chờ duyệt" },
      REJECTED: { bg: "rgba(239, 68, 68, 0.1)", color: "#dc2626", label: "Từ chối" },
    };
    const c = cfg[status] || { bg: "var(--muted)", color: "var(--muted-foreground)", label: status };
    return (
      <span style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "6px", backgroundColor: c.bg, color: c.color }}>
        {c.label}
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1040, backdropFilter: "blur(2px)" }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ 
              position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", 
              background: "var(--card)", zIndex: 1050, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
              display: "flex", flexDirection: "column"
            }}
          >
            {/* Header */}
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Chi tiết yêu cầu</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>

            {/* Content */}
            <div className="flex-grow-1 overflow-auto p-4">
              <div className="mb-4">
                <div style={labelStyle}>TRẠNG THÁI</div>
                <div>{getStatusBadge(data.status)}</div>
              </div>

              <div style={labelStyle}>CHỦ ĐỀ ĐÀO TẠO</div>
              <div style={valueStyle}>{data.topic}</div>

              <div style={labelStyle}>ĐỐI TƯỢNG</div>
              <div style={valueStyle}>{data.target}</div>

              <div style={labelStyle}>THỜI LƯỢNG DỰ KIẾN</div>
              <div style={valueStyle}>{data.duration}</div>

              <div style={labelStyle}>PHÂN LOẠI</div>
              <div style={valueStyle}>{data.type === "PERIODIC" ? "Định kỳ hàng năm" : "Phát sinh theo nhu cầu"}</div>

              <div style={labelStyle}>MỤC TIÊU ĐÀO TẠO</div>
              <div style={{ ...valueStyle, fontWeight: 400, whiteSpace: "pre-line" }}>{data.goal || "---"}</div>

              <div style={labelStyle}>MÔ TẢ CHI TIẾT</div>
              <div style={{ ...valueStyle, fontWeight: 400, whiteSpace: "pre-line" }}>{data.description || "---"}</div>
              
              <div style={labelStyle}>NGÀY TẠO</div>
              <div style={valueStyle}>{new Date(data.createdAt).toLocaleString("vi-VN")}</div>
            </div>

            {/* Footer */}
            <div className="p-3 border-top bg-light d-flex gap-2">
              <BrandButton 
                variant="outline" 
                style={{ borderColor: "#dc3545", color: "#dc3545" }}
                onClick={() => { if(confirm("Xác nhận xoá yêu cầu này?")) onDelete(data.id); }}
              >
                Xoá
              </BrandButton>
              
              <div className="ms-auto d-flex gap-2">
                <BrandButton 
                  variant="outline" 
                  style={{ borderColor: "#6c757d", color: "#6c757d" }}
                  onClick={() => onReject(data.id)}
                >
                  Từ chối
                </BrandButton>
                
                <BrandButton onClick={() => onApprove(data.id)}>
                  Duyệt
                </BrandButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
