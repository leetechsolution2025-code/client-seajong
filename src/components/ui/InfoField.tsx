import React from "react";

export interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: string;
  className?: string;
}

export const InfoField = ({ label, value, icon, className = "col-6" }: InfoFieldProps) => {
  return (
    <div className={className}>
      <div className="bg-light p-2 rounded-2 border border-light-subtle h-100 d-flex flex-column justify-content-center">
        <div className="text-muted small fw-medium mb-1 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
          {icon && <i className={`bi bi-${icon} text-secondary`} style={{ fontSize: '12px' }} />}
          {label}
        </div>
        <div className="fw-semibold text-dark text-break" style={{ fontSize: '13px', lineHeight: '1.4' }}>
          {value || <span className="text-muted fw-normal fst-italic">Chưa cập nhật</span>}
        </div>
      </div>
    </div>
  );
};
