"use client";

import React from "react";

const ACTIVITIES = [
  { id: 1, user: "Cao Thị Phượng", action: "đã phê duyệt yêu cầu nhân sự", target: "#102 Senior Frontend", time: "10 phút trước", icon: "bi-check2-circle", color: "#10b981" },
  { id: 2, user: "Lê Anh Văn", action: "đã thêm ứng viên mới", target: "Nguyễn Văn A", time: "2 giờ trước", icon: "bi-person-plus", color: "#3b82f6" },
  { id: 3, user: "Phòng IT", action: "đã đánh giá ứng viên", target: "Trần Thị B", time: "4 giờ trước", icon: "bi-star", color: "#f59e0b" },
  { id: 4, user: "Hệ thống", action: "đã gửi thư mời tự động cho", target: "Lê Văn C", time: "Hôm qua", icon: "bi-send", color: "#8b5cf6" },
  { id: 5, user: "CEO", action: "đã từ chối phiếu yêu cầu", target: "#105 Marketing", time: "Hôm qua", icon: "bi-x-circle", color: "#ef4444" },
];

export function ActivityView() {
  return (
    <div className="bg-card border rounded-4 p-4 shadow-sm h-100 overflow-auto custom-scrollbar">
      <h5 className="mb-4" style={{ fontWeight: 800 }}>Nhật ký hoạt động</h5>
      <div className="position-relative ps-4 border-start ms-2">
        {ACTIVITIES.map((act) => (
          <div key={act.id} className="mb-4 position-relative">
            {/* Timeline dot */}
            <div className="position-absolute" style={{ left: "-33px", top: "0", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", border: `3px solid ${act.color}`, zIndex: 2 }} />
            
            <div className="bg-light p-3 rounded-4" style={{ border: "1px solid var(--border)" }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span style={{ fontWeight: 700, fontSize: "13.5px" }}>{act.user}</span>
                <span className="text-muted" style={{ fontSize: "11px" }}>{act.time}</span>
              </div>
              <div style={{ fontSize: "13px" }}>
                {act.action} <span style={{ fontWeight: 700, color: act.color }}>{act.target}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
