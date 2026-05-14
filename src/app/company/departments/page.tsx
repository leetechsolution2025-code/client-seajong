"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Dept = { code: string; nameVi: string; nameEn: string; group: string; icon: string; sortOrder: number };

const GROUP_LABELS: Record<string, string> = {
  management: "Quản lý", core: "Cốt lõi", business: "Kinh doanh", support: "Vận hành",
};

const GROUP_COLORS: Record<string, string> = {
  management: "#6366f1", core: "#0ea5e9", business: "#10b981", support: "#f59e0b",
};

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/company/departments").then(r => r.json()).then(data => setDepts(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped = depts.reduce<Record<string, Dept[]>>((acc, d) => {
    if (!acc[d.group]) acc[d.group] = [];
    acc[d.group].push(d);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto", width: "100%" }}>

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Phòng ban</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
          Các phòng ban đang hoạt động trong hệ thống ({depts.length} phòng ban)
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 1s linear infinite", display: "block", marginBottom: 8 }} />Đang tải...
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: GROUP_COLORS[group] || "var(--muted-foreground)" }}>
              {GROUP_LABELS[group] || group} — {items.length} phòng ban
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {items.map(dept => (
                <div key={dept.code} style={{ background: "var(--card)", borderRadius: 14, padding: "16px 18px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${GROUP_COLORS[dept.group] || "#6366f1"} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`bi ${dept.icon}`} style={{ fontSize: 18, color: GROUP_COLORS[dept.group] || "#6366f1" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dept.nameVi}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>/{dept.code}</p>
                  </div>
                  <i className="bi bi-check-circle-fill" style={{ color: "#10b981", fontSize: 16, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </motion.div>
  );
}
