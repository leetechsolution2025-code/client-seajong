"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KpiCard } from "@/components/marketing/KpiCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { Table, TableColumn } from "@/components/ui/Table";
import { StandardPage } from "@/components/layout/StandardPage";
import * as XLSX from "xlsx";

interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  source: string;
  campaign: {
    name: string;
    platform: string;
  };
  notes?: string;
  formValues?: string;
}

export default function LeadDistributionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();

    // Tự động làm mới dữ liệu ngầm mỗi 5 giây
    const interval = setInterval(() => {
      fetch("/api/marketing/leads")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setLeads(data);
        })
        .catch(err => console.error("Silent refresh error:", err));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/leads");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!filteredLeads.length) return;

    const exportData = filteredLeads.map((lead, index) => ({
      "STT": index + 1,
      "Họ tên": lead.fullName || "Ẩn danh",
      "Số điện thoại": lead.phone || "",
      "Email": lead.email || "",
      "Nguồn": lead.source,
      "Chiến dịch": lead.campaign?.name || "N/A",
      "Nền tảng": lead.campaign?.platform || "N/A",
      "Trạng thái": getStatusColor(lead.status).label,
      "Ngày tạo": new Date(lead.createdAt).toLocaleString('vi-VN'),
      "Địa chỉ": (() => {
        try {
          const vals = JSON.parse(lead.formValues || "{}");
          return vals.address || vals.dia_chi || vals.city || vals.location || "";
        } catch { return ""; }
      })(),
      "Ghi chú": lead.notes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách Lead");
    XLSX.writeFile(wb, `Danh_sach_Lead_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/marketing/leads", {
        method: "PATCH",
        body: JSON.stringify({ id, status: newStatus }),
      });
      fetchLeads();
      setSelectedLead(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.includes(searchTerm) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return { bg: "#dcfce7", color: "#15803d", label: "Mới" };
      case "contacted": return { bg: "#dbeafe", color: "#1d4ed8", label: "Đã LH" };
      case "qualified": return { bg: "#fef9c3", color: "#a16207", label: "Tiềm năng" };
      case "converted": return { bg: "#f0fdf4", color: "#16a34a", label: "Chốt đơn" };
      case "lost": return { bg: "#fee2e2", color: "#b91c1c", label: "Thất bại" };
      default: return { bg: "#f3f4f6", color: "#374151", label: status };
    }
  };

  return (
    <StandardPage
      title="Phân phối Lead"
      description="Quản lý và chuyển giao khách hàng tiềm năng từ các chiến dịch"
      color="rose"
      icon="bi-share"
      useCard={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
        {/* ── Compact Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KpiCard label="Tổng Leads" value={leads.length.toString()} icon="bi-people" color="#6366f1" />
          <KpiCard label="Leads mới" value={leads.filter(l => l.status === "new").length.toString()} icon="bi-star" color="#f59e0b" />
          <KpiCard label="Đang chăm sóc" value={leads.filter(l => l.status === "contacted").length.toString()} icon="bi-telephone-outbound" color="#ec4899" />
          <KpiCard
            label="Tỷ lệ chốt"
            value={leads.length > 0 ? `${Math.round((leads.filter(l => l.status === "converted").length / leads.length) * 100)}%` : "0%"}
            icon="bi-trophy" color="#10b981"
            progress={{ cur: leads.filter(l => l.status === "converted").length, max: leads.length || 100 }}
          />
        </div>

        <div className="app-card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden", boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)" }}>
          {/* ── Toolbar ── */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(var(--foreground-rgb), 0.01)" }}>
            <div style={{ display: "flex", gap: 10, flex: 1, maxWidth: 650 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
                <input
                  type="text" className="app-input" placeholder="Tìm tên khách hàng, SĐT, email..."
                  style={{ paddingLeft: 36, width: "100%", height: 36, borderRadius: 8, background: "var(--muted)", border: "1px solid transparent", fontSize: 13 }}
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ position: "relative", width: 160 }}>
                <i className="bi bi-filter" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", zIndex: 1, fontSize: 13 }} />
                <select
                  className="app-input" style={{ width: "100%", height: 36, paddingLeft: 34, borderRadius: 8, background: "var(--muted)", cursor: "pointer", appearance: "none", fontSize: 13 }}
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="new">Mới nhận</option>
                  <option value="contacted">Đang liên hệ</option>
                  <option value="qualified">Tiềm năng</option>
                  <option value="converted">Chốt đơn</option>
                  <option value="lost">Thất bại</option>
                </select>
                <i className="bi bi-chevron-down" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "var(--muted-foreground)", pointerEvents: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BrandButton icon="bi-arrow-clockwise" onClick={fetchLeads} loading={loading} style={{ height: 34, fontSize: "12px", borderRadius: 8, padding: "0 12px" }}>Làm mới</BrandButton>
              <BrandButton variant="outline" icon="bi-download" onClick={handleExport} disabled={filteredLeads.length === 0} style={{ height: 34, fontSize: "12px", borderRadius: 8, padding: "0 12px" }}>Xuất dữ liệu</BrandButton>
              <BrandButton icon="bi-plus-lg" onClick={() => { }} style={{ height: 34, fontSize: "12px", borderRadius: 8, padding: "0 12px" }}>Thêm mới</BrandButton>
            </div>
          </div>

          {/* ── Table ── */}
          <Table
            rows={filteredLeads} loading={loading} compact={true} onRowClick={(lead) => setSelectedLead(lead)} emptyText="Không tìm thấy lead nào phù hợp"
            columns={[
              {
                header: "Khách hàng",
                render: (lead) => (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)" }}>{lead.fullName || "Ẩn danh"}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", color: "var(--muted-foreground)", fontSize: 11.5 }}>
                      {lead.phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-telephone" style={{ fontSize: 10, opacity: 0.7 }} /> {lead.phone}</span>}
                      {lead.email && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-envelope" style={{ fontSize: 10, opacity: 0.7 }} /> {lead.email}</span>}
                    </div>
                  </div>
                )
              },
              {
                header: "Chiến dịch / Kênh",
                render: (lead) => (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{lead.campaign?.name || "Chiến dịch lẻ"}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{lead.source} • {lead.campaign?.platform || "Website"}</span>
                  </div>
                )
              },
              {
                header: "Thời gian",
                render: (lead) => (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13 }}>{new Date(lead.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{new Date(lead.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )
              },
              {
                header: "Trạng thái",
                render: (lead) => {
                  const s = getStatusColor(lead.status);
                  return (
                    <span style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: s.bg, color: s.color, border: `1px solid color-mix(in srgb, ${s.color} 20%, transparent)`
                    }}>
                      {s.label}
                    </span>
                  );
                }
              }
            ]}
          />
        </div>
      </div>

      {/* ── Offcanvas ── */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1039 }}
              onClick={() => setSelectedLead(null)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "var(--card)", zIndex: 1040, borderLeft: "1px solid var(--border)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}
            >
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(var(--foreground-rgb), 0.01)" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Chi tiết Lead</h3>
                <button onClick={() => setSelectedLead(null)} style={{ border: "none", cursor: "pointer", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--muted)", color: "var(--muted-foreground)" }}><i className="bi bi-x-lg" style={{ fontSize: 14 }} /></button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <div style={{ marginBottom: 24, background: "var(--muted)", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selectedLead.fullName}</p>
                    {(() => {
                      const s = getStatusColor(selectedLead.status);
                      return <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, border: `1px solid color-mix(in srgb, ${s.color} 15%, transparent)`, textTransform: "uppercase" }}>{s.label}</span>;
                    })()}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Số điện thoại</label><span style={{ fontSize: 13 }}>{selectedLead.phone || "---"}</span></div>
                    <div><label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Email</label><span style={{ fontSize: 13 }}>{selectedLead.email || "---"}</span></div>
                  </div>
                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(var(--foreground-rgb), 0.05)", paddingTop: 1 }}>
                    <label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Địa chỉ</label>
                    <span style={{ fontSize: 13 }}>{(() => { try { const vals = JSON.parse(selectedLead.formValues || "{}"); return vals.address || vals.dia_chi || vals.city || vals.location || "---"; } catch { return "---"; } })()}</span>
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Người quản lý</label><span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{selectedLead.notes?.includes("Phụ trách:") ? selectedLead.notes.split("Phụ trách:")[1].split("\n")[0].trim() : "Chưa phân phối"}</span></div>
                    <div><label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Điện thoại</label><span style={{ fontSize: 13 }}>---</span></div>
                  </div>
                </div>

                {selectedLead.notes && <div style={{ marginBottom: 24 }}><h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Ghi chú</h4><p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selectedLead.notes}</p></div>}

                <div style={{ marginTop: 8 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-clock-history" /> Hồ sơ chăm sóc lead</h4>
                  <div style={{ position: "relative", paddingLeft: 24 }}>
                    <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "var(--border)", opacity: 0.5 }} />
                    <div style={{ position: "relative", marginBottom: 20 }}>
                      <div style={{ position: "absolute", left: -21, top: 4, width: 10, height: 10, borderRadius: "50%", background: "var(--primary)" }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Lead được tạo tự động</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{new Date(selectedLead.createdAt).toLocaleString('vi-VN')}</p>
                      <div style={{ marginTop: 6, padding: "8px 12px", background: "var(--muted)", borderRadius: 8, fontSize: 12 }}>Nguồn: <strong>{selectedLead.source}</strong> · Chiến dịch: <strong>{selectedLead.campaign?.name}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StandardPage>
  );
}
