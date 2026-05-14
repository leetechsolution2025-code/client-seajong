"use client";

import React from "react";

interface Props {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Component dùng để mở Modal Tạo yêu cầu đào tạo từ bất cứ đâu.
 * Sử dụng Custom Event để giao tiếp với Layout chính.
 */
export const TrainingRequestTrigger = ({ className, style, children }: Props) => {
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Phát sự kiện để Layout nhận và mở Modal
    window.dispatchEvent(new CustomEvent("open-training-request-modal"));
  };

  return (
    <div 
      onClick={handleOpen} 
      className={className} 
      style={{ cursor: "pointer", ...style }}
    >
      {children || (
        <button className="btn btn-primary d-flex align-items-center gap-2 fw-bold" style={{ borderRadius: "10px", padding: "8px 16px" }}>
          <i className="bi bi-mortarboard-fill"></i>
          <span>Tạo yêu cầu đào tạo</span>
        </button>
      )}
    </div>
  );
};
