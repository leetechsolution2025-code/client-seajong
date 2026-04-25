"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { KpiCard } from "@/components/marketing/KpiCard";

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Phân phối Lead"
        description="Quản lý và chuyển giao khách hàng tiềm năng từ các chiến dịch"
        color="rose"
        icon="bi-share"
      />

      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
        {/* ── Compact Stats using KpiCard ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <KpiCard 
            label="Tổng Leads" 
            value={leads.length.toString()} 
            icon="bi-people" 
            color="#6366f1"
          />
          <KpiCard 
            label="Mới chưa xử lý" 
            value={leads.filter(l => l.status === "new").length.toString()} 
            icon="bi-lightning-charge" 
            color="#f59e0b"
            trend={{ val: "12%", up: true }}
          />
          <KpiCard 
            label="Đang chăm sóc" 
            value={leads.filter(l => l.status === "contacted").length.toString()} 
            icon="bi-telephone-outbound" 
            color="#ec4899"
          />
          <KpiCard 
            label="Tỷ lệ chốt" 
            value={leads.length > 0 ? `${Math.round((leads.filter(l => l.status === "converted").length / leads.length) * 100)}%` : "0%"} 
            icon="bi-trophy" 
            color="#10b981"
            progress={{ cur: leads.filter(l => l.status === "converted").length, max: leads.length || 100 }}
          />
        </div>

        {/* ── Refined & Compact Toolbar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flex: 1, maxWidth: 650 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
              <input
                type="text"
                className="app-input"
                placeholder="Tìm tên khách hàng, SĐT, email..."
                style={{ paddingLeft: 36, width: "100%", height: 38, borderRadius: 10, background: "var(--muted)", border: "1px solid transparent", fontSize: 13 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ position: "relative", width: 160 }}>
              <i className="bi bi-filter" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", zIndex: 1, fontSize: 13 }} />
              <select 
                className="app-input" 
                style={{ width: "100%", height: 38, paddingLeft: 34, borderRadius: 10, background: "var(--muted)", cursor: "pointer", appearance: "none", fontSize: 13 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
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
          
          <button 
            className="app-button" 
            style={{ height: 38, padding: "0 16px", borderRadius: 10, background: "var(--foreground)", color: "var(--background)", fontWeight: 700, gap: 6, fontSize: 13 }}
            onClick={fetchLeads}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`} style={{ fontSize: 16 }} /> Làm mới
          </button>
        </div>

        {/* ── Premium Lead Table (Optimized Size) ── */}
        <div className="app-card" style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden", boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "rgba(var(--foreground-rgb), 0.02)" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 10.5, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>KHÁCH HÀNG</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 10.5, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>CHIẾN DỊCH / KÊNH</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 10.5, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>THỜI GIAN</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 10.5, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>TRẠNG THÁI</th>
                <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 10.5, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div className="loading-spinner" style={{ width: 24, height: 24, border: "2px solid var(--muted)", borderTopColor: "var(--rose-500)", borderRadius: "50%" }}></div>
                      <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontWeight: 500 }}>Đang cập nhật...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 80 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-inbox" style={{ fontSize: 24, color: "var(--muted-foreground)" }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Chưa có lead nào</p>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>Dữ liệu từ chiến dịch sẽ tự động xuất hiện</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.map((lead, idx) => {
                const s = getStatusColor(lead.status);
                return (
                  <motion.tr 
                    key={lead.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}
                    className="hover-row"
                  >
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)" }}>{lead.fullName || "Ẩn danh"}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted-foreground)", fontSize: 12 }}>
                          <span>{lead.phone || lead.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: lead.campaign?.platform === 'facebook' ? 'rgba(24, 119, 242, 0.1)' : 'rgba(234, 67, 53, 0.1)', display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className={`bi bi-${lead.campaign?.platform === 'facebook' ? 'facebook' : lead.campaign?.platform === 'google' ? 'google' : 'megaphone'}`} style={{ color: lead.campaign?.platform === 'facebook' ? '#1877f2' : '#ea4335', fontSize: 12 }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{lead.campaign?.name || "Chiến dịch ẩn"}</p>
                          <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>{lead.source}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: "var(--muted-foreground)", fontWeight: 500 }}>
                      {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
                      <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>{new Date(lead.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                        background: s.bg, color: s.color, border: `1px solid color-mix(in srgb, ${s.color} 15%, transparent)`
                      }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <button 
                        className="app-button" 
                        style={{ padding: "5px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid transparent", fontSize: 12, fontWeight: 700 }}
                        onClick={() => setSelectedLead(lead)}
                      >
                        Chi tiết <i className="bi bi-arrow-right-short" style={{ fontSize: 16 }} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Distribution Modal ── */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100 }}
              onClick={() => setSelectedLead(null)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 450, background: "var(--card)", zIndex: 101, borderLeft: "1px solid var(--border)", padding: 32, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Chi tiết Lead & Phân phối</h3>
                <button 
                  onClick={() => setSelectedLead(null)}
                  style={{ border: "none", cursor: "pointer", padding: 5, borderRadius: "50%", background: "var(--muted)" }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div style={{ marginBottom: 32, background: "var(--muted)", borderRadius: 12, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{selectedLead.fullName}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Số điện thoại</label>
                    <span style={{ fontSize: 13 }}>{selectedLead.phone || "---"}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, display: "block", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Email</label>
                    <span style={{ fontSize: 13 }}>{selectedLead.email || "---"}</span>
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Chọn người phụ trách</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                {[
                  { name: "Nguyễn Văn A", role: "Sales Manager", active: true },
                  { name: "Trần Thị B", role: "Sales Executive", active: true },
                  { name: "Lê Văn C", role: "Dealer - Miền Bắc", active: true },
                  { name: "Phạm Minh D", role: "Dealer - Miền Trung", active: false },
                ].map((staff, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: 14, borderRadius: 10, border: "1px solid var(--border)", 
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: staff.active ? "pointer" : "not-allowed",
                      opacity: staff.active ? 1 : 0.5,
                      background: "rgba(var(--foreground-rgb), 0.02)"
                    }}
                    onClick={() => staff.active && updateStatus(selectedLead.id, "contacted")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-person" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{staff.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{staff.role}</p>
                      </div>
                    </div>
                    <i className="bi bi-plus-circle-fill" style={{ color: "var(--rose-600)", fontSize: 18 }} />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button className="app-button" style={{ width: "100%", justifyContent: "center" }} onClick={() => updateStatus(selectedLead.id, "lost")}>
                  Đánh dấu thất bại
                </button>
                <button className="app-button-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => updateStatus(selectedLead.id, "converted")}>
                  Đánh dấu Chốt đơn
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
