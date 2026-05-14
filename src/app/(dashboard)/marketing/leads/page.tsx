"use client";
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/marketing/leads")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredLeads = leads.filter(l => 
    (l.fullName || "").toLowerCase().includes(filter.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(filter.toLowerCase()) ||
    (l.phone || "").toLowerCase().includes(filter.toLowerCase())
  );

  const exportCSV = () => {
    if (leads.length === 0) return;
    
    // Header
    const headers = ["ID", "Họ tên", "Email", "Số điện thoại", "Chiến dịch", "Nguồn", "Trạng thái", "Ngày tạo"];
    const rows = filteredLeads.map(l => [
      l.id,
      l.fullName || "N/A",
      l.email || "N/A",
      l.phone || "N/A",
      l.campaign?.name || "N/A",
      l.campaign?.platform || l.source || "N/A",
      l.status || "new",
      new Date(l.createdAt).toLocaleString("vi-VN")
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_lead_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stageLabels: Record<string, string> = {
    "new": "Mới",
    "contacted": "Tiếp cận",
    "demo": "Demo",
    "quoted": "Báo giá",
    "closed": "Chốt"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Quản lý Leads"
        description="Theo dõi và quản lý dữ liệu khách hàng tiềm năng"
        color="rose"
        icon="bi-person-plus"
      />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-4"
        style={{ flex: 1, overflowY: "auto" }}
      >
        <motion.div variants={item} className="app-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <div className="flex-grow-1" style={{ maxWidth: 400 }}>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-0 shadow-none" 
                  placeholder="Tìm kiếm theo tên, email, số điện thoại..." 
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button 
                onClick={exportCSV}
                className="btn btn-outline-success d-flex align-items-center gap-2"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                <i className="bi bi-file-earmark-excel" /> Tải về CSV
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="app-card overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3" style={{ width: 40 }}>#</th>
                  <th className="py-3">Họ và tên</th>
                  <th className="py-3">Thông tin liên hệ</th>
                  <th className="py-3">Chiến dịch / Nguồn</th>
                  <th className="py-3 text-center">Trạng thái</th>
                  <th className="py-3 text-end px-4">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted">Đang tải dữ liệu...</span>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox d-block mb-2" style={{ fontSize: 24, opacity: 0.5 }} />
                      Không tìm thấy dữ liệu lead nào
                    </td>
                  </tr>
                ) : filteredLeads.map((lead, idx) => (
                  <tr key={lead.id}>
                    <td className="px-4 text-muted">{idx + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-bg)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                          {(lead.fullName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="mb-0 fw-bold">{lead.fullName || "Khách ẩn danh"}</p>
                          <span className="text-muted" style={{ fontSize: 11 }}>ID: {lead.id.slice(-8).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="mb-0"><i className="bi bi-envelope me-2" />{lead.email || "N/A"}</p>
                      <p className="mb-0"><i className="bi bi-telephone me-2" />{lead.phone || "N/A"}</p>
                    </td>
                    <td>
                      <p className="mb-0 fw-600">{lead.campaign?.name || "N/A"}</p>
                      <span className="badge bg-light text-dark border fw-normal">{lead.campaign?.platform || lead.source || "N/A"}</span>
                    </td>
                    <td className="text-center">
                      <span className="badge" style={{ 
                        background: lead.status === "closed" ? "#ecfdf5" : lead.status === "new" ? "#f1f5f9" : "#eff6ff",
                        color: lead.status === "closed" ? "#059669" : lead.status === "new" ? "#64748b" : "#2563eb",
                        padding: "6px 12px",
                        borderRadius: 20
                      }}>
                        {stageLabels[lead.status] || "Mới"}
                      </span>
                    </td>
                    <td className="text-end px-4 text-muted">
                      {new Date(lead.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
