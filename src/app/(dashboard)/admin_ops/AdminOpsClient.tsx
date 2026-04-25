"use client";

import React, { useState } from "react";
import CreateEmployeeModal from "@/components/hr/CreateEmployeeModal";
import { ToastContainer, useToast } from "@/components/Toast";

export default function AdminOpsClient() {
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  return (
    <>
      <div style={{ padding: "24px" }}>
        {/* Quick Actions */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)",
            letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12,
          }}>
            Tác vụ nhanh
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              id="admin-create-employee-btn"
              onClick={() => setShowCreate(true)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--primary)", color: "#fff",
                border: "none", borderRadius: 12,
                padding: "12px 20px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: "0 3px 10px color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
              }}
            >
              <i className="bi bi-person-plus-fill" style={{ fontSize: 16 }} />
              Thêm nhân viên mới
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateEmployeeModal
          departments={[]}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            toast.success(
              "Tạo nhân viên thành công!",
              "Nhân viên mới đã được thêm vào hệ thống.",
            );
          }}
        />
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
