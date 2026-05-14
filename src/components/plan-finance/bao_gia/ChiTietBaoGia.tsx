"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Tab } from "@/components/ui/Tab";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TaoBaoGia, type QuotationEditData } from "@/components/plan-finance/bao_gia/TaoBaoGia";
import { TaoHopDongModal } from "@/components/plan-finance/hop_dong/TaoHopDongModal";

// ── Types ────────────────────────────────────────────────────────────────────
export interface QuotationForDetail {
  id: string;
  code: string | null;
  customer: {
    id: string;
    name: string;
    dienThoai?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  nguoiPhuTrach: { id: string; fullName: string; userId?: string | null } | null;
  ngayBaoGia: string | null;
  ngayHetHan: string | null;
  trangThai: string;
  uuTien: string;
  thanhTien: number;
  createdAt: string;
  items?: any[];
  // trường thêm cho edit mode
  discount?: number | null;
  vat?: number | null;
  tongTien?: number | null;
  ghiChu?: string | null;
}

interface Negotiation {
  id: string;
  loai: string;
  ngay: string;
  nguoiThucHien: string;
  ketQua: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft:            { label: "Nháp",               color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "bi-pencil-square" },
  pending_approval: { label: "Đang trình duyệt",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "bi-hourglass-split" },
  approved:         { label: "Đã phê duyệt",        color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "bi-patch-check-fill" },
  sent:             { label: "Đã gửi khách hàng",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: "bi-send-check-fill" },
  won:              { label: "Thành công",           color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "bi-trophy-fill" },
  lost:             { label: "Thất bại",             color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: "bi-x-circle-fill" },
  cancelled:        { label: "Đã huỷ",               color: "#6b7280", bg: "rgba(107,114,128,0.1)",icon: "bi-slash-circle-fill" },
};

const OFFCANVAS_TABS = [
  { key: "info",  label: "Thông tin chung" },
  { key: "items", label: "Khối lượng báo giá" },
];

const ACT_TYPES = [
  { key: "call",    label: "Gọi điện",  icon: "bi-telephone-fill",  color: "#10b981" },
  { key: "meeting", label: "Gặp mặt",   icon: "bi-people-fill",     color: "#6366f1" },
  { key: "email",   label: "Gửi email", icon: "bi-envelope-fill",   color: "#f59e0b" },
  { key: "message", label: "Nhắn tin",  icon: "bi-chat-dots-fill", color: "#3b82f6" },
  { key: "system",  label: "Hệ thống",  icon: "bi-gear-fill",       color: "#6b7280" },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  q: QuotationForDetail | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function ChiTietBaoGia({ q, onClose, onDeleted }: Props) {
  const [activeTab, setActiveTab] = useState("info");
  const [localQ, setLocalQ] = useState<QuotationForDetail | null>(q);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [actType, setActType] = useState("call");
  const [actDate, setActDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [actNote, setActNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const { data: session } = useSession();
  const [actPerson, setActPerson] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmWon, setShowConfirmWon] = useState(false);
  const [markingWon, setMarkingWon] = useState(false);
  const [showContract, setShowContract] = useState(false);

  React.useEffect(() => {
    if (session?.user?.name) setActPerson(session.user.name);
  }, [session?.user?.name]);

  // Khi mở báo giá mới (id thay đổi) → reset localQ, tab, fetch negotiations
  React.useEffect(() => {
    if (!q) {
      setLocalQ(null); // q bị null → ẩn offcanvas
      return;
    }
    setLocalQ(q);          // cập nhật localQ
    setActiveTab("info");  // chỉ reset tab khi đổi sang báo giá khác
    fetch(`/api/plan-finance/quotations/${q.id}/negotiations`)
      .then(r => r.json())
      .then(data => setNegotiations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [q?.id, q === null]);

  // Re-fetch data sau khi edit (giữ nguyên activeTab)
  const refetchQ = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/plan-finance/quotations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLocalQ(data);
        // Reload negotiations mới nhất
        const neg = await fetch(`/api/plan-finance/quotations/${id}/negotiations`);
        if (neg.ok) setNegotiations(await neg.json());
      }
    } catch { }
  }, []);

  const handleSaveActivity = async () => {
    if (!actNote.trim() || !localQ) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/quotations/${localQ.id}/negotiations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loai: actType, ngay: actDate, nguoiThucHien: actPerson, ketQua: actNote }),
      });
      if (res.ok) {
        const created = await res.json();
        setNegotiations(prev => [...prev, created]);
        setActNote("");
        setShowActivityModal(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!localQ) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/quotations/${localQ.id}`, { method: "DELETE" });
      if (res.ok) {
        setShowConfirmDelete(false);
        onClose();
        onDeleted?.();
      } else {
        const data = await res.json();
        alert(data.error ?? "Xoá thất bại");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkWon = async () => {
    if (!localQ) return;
    setMarkingWon(true);
    try {
      const res = await fetch(`/api/plan-finance/quotations/${localQ.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: "won" }),
      });
      if (!res.ok) { alert("Cập nhật thất bại"); return; }
      // Ghi lịch sử
      await fetch(`/api/plan-finance/quotations/${localQ.id}/negotiations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loai: "system",
          ngay: new Date().toISOString().slice(0, 10),
          nguoiThucHien: session?.user?.name ?? "Hệ thống",
          ketQua: `Báo giá ${localQ.code} đã được đánh dấu Thành công. Nút Hợp đồng đã mở khoá.`,
        }),
      }).catch(() => {});
      setShowConfirmWon(false);
      await refetchQ(localQ.id);
      onDeleted?.(); // refresh list
    } finally {
      setMarkingWon(false);
    }
  };

  if (!localQ) return null;
  const q2 = localQ; // alias for shorthand

  const isOwner = !!session?.user?.id && q2.nguoiPhuTrach?.userId === session.user.id;
  const st = STATUS_CFG[q2.trangThai] ?? { label: q2.trangThai, color: "#94a3b8", icon: "bi-circle", bg: "rgba(0,0,0,0.05)" };
  const isHighPriority = q2.uuTien === "high";
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const qItems: any[] = Array.isArray(q2.items) ? q2.items : [];
  const selType = ACT_TYPES.find(t => t.key === actType) ?? ACT_TYPES[0];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1099, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, minWidth: 400, maxWidth: 400, zIndex: 1100,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        animation: "slideInRight 0.22s ease-out",
      }}>
        {/* ── Header ── */}
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {/* Dòng 1: mã + badge + nút đóng */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Chi tiết báo giá</p>
              <p style={{ margin: "0 0 6px", fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>{q2.code ?? "—"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}40` }}>
                  <i className={`bi ${st.icon}`} style={{ fontSize: 9 }} />{st.label}
                </span>
                {isHighPriority && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <i className="bi bi-lightning-charge-fill" style={{ fontSize: 9 }} />Ưu tiên
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}>
              <i className="bi bi-x" style={{ fontSize: 16 }} />
            </button>
          </div>

          {/* Dòng 2: ngày + giá trị */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, fontSize: 12.5, color: "var(--muted-foreground)" }}>
            <span>
              <i className="bi bi-calendar3" style={{ marginRight: 4 }} />
              {fmtDate(q2.ngayBaoGia)}
              <span style={{ margin: "0 5px" }}>→</span>
              {fmtDate(q2.ngayHetHan)}
            </span>
            <span style={{ width: 1, height: 12, background: "var(--border)" }} />
            <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>
              {(q2.thanhTien ?? 0).toLocaleString("vi-VN")} ₫
            </span>
          </div>

          {/* Dòng 3: 4 action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
            {[
              { icon: "bi-pencil", label: "Sửa", color: q2.trangThai === "won" ? "var(--muted-foreground)" : "var(--foreground)", bg: "var(--muted)", border: "var(--border)", disabled: q2.trangThai === "won", onClick: q2.trangThai !== "won" ? () => setShowEdit(true) : undefined },
              { icon: "bi-trash3",             label: "Xoá",       color: isOwner ? "#ef4444" : "var(--muted-foreground)", bg: isOwner ? "rgba(239,68,68,0.08)" : "var(--muted)", border: isOwner ? "rgba(239,68,68,0.25)" : "var(--border)", disabled: !isOwner, onClick: isOwner ? () => setShowConfirmDelete(true) : undefined },
              { icon: "bi-trophy", label: "Thành công", color: q2.trangThai === "won" ? "#10b981" : "var(--foreground)", bg: q2.trangThai === "won" ? "rgba(16,185,129,0.1)" : "var(--muted)", border: q2.trangThai === "won" ? "rgba(16,185,129,0.3)" : "var(--border)", disabled: q2.trangThai === "won", onClick: q2.trangThai !== "won" ? () => setShowConfirmWon(true) : undefined },
              { icon: "bi-file-earmark-text", label: "Hợp đồng", color: q2.trangThai === "won" ? "#8b5cf6" : "var(--muted-foreground)", bg: q2.trangThai === "won" ? "rgba(139,92,246,0.08)" : "var(--muted)", border: q2.trangThai === "won" ? "rgba(139,92,246,0.25)" : "var(--border)", disabled: q2.trangThai !== "won", onClick: q2.trangThai === "won" ? () => setShowContract(true) : undefined },
            ].map(({ icon, label, color, bg, border, disabled, onClick }) => (
              <button key={label}
                disabled={disabled}
                onClick={onClick}
                title={
                  (label === "Xoá" && !isOwner) ? "Chỉ người tạo mới có thể xoá" :
                  (label === "Hợp đồng" && q2.trangThai !== "won") ? "Chỉ mở khi báo giá Thành công" :
                  undefined
                }
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "7px 4px", borderRadius: 8,
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontSize: 10.5, fontWeight: 700, color,
                  background: bg, border: `1px solid ${border}`,
                  opacity: disabled ? 0.45 : 1,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
              >
                <i className={`bi ${icon}`} style={{ fontSize: 15 }} />{label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <Tab tabs={OFFCANVAS_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* ─── Tab 1: Thông tin chung ─── */}
          {activeTab === "info" && (
            <>
              {/* Card khách hàng */}
              {q2.customer && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, padding: "14px 16px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 18, color: "var(--primary)" }}>
                    {q2.customer.name.trim().split(" ").pop()?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q2.customer.name}</p>
                    {q2.customer.address && (
                      <p style={{ margin: "0 0 2px", fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <i className="bi bi-geo-alt" style={{ marginRight: 4 }} />{q2.customer.address}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {q2.customer.dienThoai && (
                        <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                          <i className="bi bi-telephone" style={{ marginRight: 3 }} />{q2.customer.dienThoai}
                        </span>
                      )}
                      {q2.customer.email && (
                        <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                          <i className="bi bi-envelope" style={{ marginRight: 3 }} />{q2.customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Lịch sử thương thảo */}
              <SectionTitle
                title="Lịch sử thương thảo báo giá"
                action={
                  <button
                    onClick={() => setShowActivityModal(true)}
                    style={{ height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "0 10px", color: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
                  >
                    <i className="bi bi-plus-lg" style={{ fontSize: 12 }} />Hoạt động
                  </button>
                }
              />
              {/* Activity log — vertical timeline */}
              <div style={{ position: "relative", paddingLeft: 40, marginTop: 8 }}>
                <div style={{ position: "absolute", left: 19, top: 4, bottom: 4, width: 2, background: "linear-gradient(to bottom, var(--border), rgba(226,232,240,0))", borderRadius: 4 }} />

                {[...negotiations].sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ).map(neg => {
                  const t = ACT_TYPES.find(x => x.key === neg.loai) ?? ACT_TYPES[0];
                  return (
                    <div key={neg.id} style={{ position: "relative", marginBottom: 14 }}>
                      <div style={{ position: "absolute", left: -33, top: 4, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--border)" }}>
                        <i className={`bi ${t.icon}`} style={{ fontSize: 10, color: t.color }} />
                      </div>
                      <div style={{ background: "var(--card)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: t.color, padding: "2px 8px", background: `color-mix(in srgb, ${t.color} 10%, transparent)`, borderRadius: 6 }}>{t.label}</span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>• {new Date(neg.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-line" }}>{neg.ketQua}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--primary)" }}>
                            {neg.nguoiThucHien.trim().split(" ").pop()?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{neg.nguoiThucHien} thực hiện</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Item cũ nhất: tạo báo giá */}
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <div style={{ position: "absolute", left: -33, top: 4, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--border)" }}>
                    <i className="bi bi-file-earmark-plus-fill" style={{ fontSize: 10, color: "#10b981" }} />
                  </div>
                  <div style={{ background: "var(--card)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#10b981", padding: "2px 8px", background: "rgba(16,185,129,0.1)", borderRadius: 6 }}>Tạo báo giá</span>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>• {new Date(q2.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>Báo giá <strong>{q2.code ?? ""}</strong> được tạo</p>
                    {q2.nguoiPhuTrach && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--primary)" }}>
                          {q2.nguoiPhuTrach.fullName.trim().split(" ").pop()?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{q2.nguoiPhuTrach.fullName} thực hiện</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── Tab 2: Khối lượng báo giá ─── */}
          {activeTab === "items" && (
            qItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Chưa có hàng hoá nào</p>
              </div>
            ) : (
              <>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        {["Tên hàng hoá / Dịch vụ", "ĐVT", "SL", "Đơn giá (đ)", "Thành tiền (đ)"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: h === "Tên hàng hoá / Dịch vụ" ? "left" : "right", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {qItems.map((it, idx) => (
                        <tr key={it.id ?? idx} style={{ borderTop: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--muted) 50%, transparent)" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--foreground)" }}>{it.tenHang}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--muted-foreground)" }}>{it.donVi ?? "—"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.soLuong}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--muted-foreground)" }}>{fmt(it.donGia)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{fmt(it.thanhTien)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 0" }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{qItems.length} mặt hàng &nbsp;·&nbsp; Tổng cộng:</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>
                    {fmt(qItems.reduce((s, it) => s + (it.thanhTien ?? 0), 0))} ₫
                  </span>
                </div>
              </>
            )
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* ── TaoBaoGia edit mode ── */}
      <TaoBaoGia
        open={showEdit}
        onClose={() => setShowEdit(false)}
        customer={q2.customer ? {
          id: q2.customer.id,
          name: q2.customer.name,
          nhom: null, nguon: null,
          dienThoai: q2.customer.dienThoai ?? null,
          email: q2.customer.email ?? null,
          address: q2.customer.address ?? null,
          daiDien: null, xungHo: null, chucVu: null, ghiChu: null,
          nguoiChamSoc: null, nguoiChamSocId: null,
          createdAt: q2.createdAt,
        } : null}
        editData={{
          id: q2.id,
          code: q2.code,
          ngayBaoGia: q2.ngayBaoGia,
          ngayHetHan: q2.ngayHetHan,
          trangThai: q2.trangThai,
          uuTien: q2.uuTien,
          discount: q2.discount ?? 0,
          vat: q2.vat ?? 10,
          tongTien: q2.tongTien ?? 0,
          thanhTien: q2.thanhTien,
          ghiChu: q2.ghiChu ?? null,
          items: q2.items ?? [],
        } satisfies QuotationEditData}
        onSaved={() => { refetchQ(q2.id); onDeleted?.(); }}
      />

      {/* ── Tạo hợp đồng ── */}
      <TaoHopDongModal
        open={showContract}
        onClose={() => setShowContract(false)}
        quotation={q2}
        onSaved={() => { setShowContract(false); onDeleted?.(); }}
      />

      {/* ── Confirm Thành công ── */}
      {showConfirmWon && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 1201, width: 380, background: "var(--card)",
            borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="bi bi-trophy-fill" style={{ fontSize: 22, color: "#10b981" }} />
              </div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>Xác nhận Thành công</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                Đánh dấu báo giá <strong style={{ color: "var(--foreground)" }}>{q2.code}</strong> là <strong style={{ color: "#10b981" }}>Thành công</strong>?<br />
                Nút <strong>Hợp đồng</strong> sẽ được mở khoá.
              </p>
            </div>
            <div style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirmWon(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Huỷ</button>
              <button onClick={handleMarkWon} disabled={markingWon}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 700, cursor: markingWon ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: markingWon ? 0.7 : 1 }}
              >
                {markingWon ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> : <i className="bi bi-trophy" />}
                {markingWon ? "Đang cập nhật..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Confirm xoá ── */}
      {showConfirmDelete && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 1201, width: 380, background: "var(--card)",
            borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="bi bi-trash3-fill" style={{ fontSize: 22, color: "#ef4444" }} />
              </div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>Xác nhận xoá báo giá</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                Bạn sắp xoá báo giá <strong style={{ color: "var(--foreground)" }}>{q2.code}</strong>.<br />
                Hành động này không thể hoàn tác.
              </p>
            </div>
            <div style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirmDelete(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Huỷ</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> : <i className="bi bi-trash3" />}
                {deleting ? "Đang xoá..." : "Xoá báo giá"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal thêm hoạt động ── */}
      {showActivityModal && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 1201, width: 440, background: "var(--card)",
            borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in srgb, ${selType.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`bi ${selType.icon}`} style={{ fontSize: 14, color: selType.color }} />
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Ghi nhận hoạt động</p>
              </div>
              <button onClick={() => setShowActivityModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Loại hoạt động</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {ACT_TYPES.map(t => (
                  <button key={t.key}
                    onClick={() => setActType(t.key)}
                    style={{
                      flex: 1, padding: "8px 4px", borderRadius: 9,
                      border: `1.5px solid ${actType === t.key ? t.color : "var(--border)"}`,
                      background: actType === t.key ? `color-mix(in srgb, ${t.color} 10%, transparent)` : "var(--muted)",
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all 0.15s",
                    }}
                  >
                    <i className={`bi ${t.icon}`} style={{ fontSize: 16, color: actType === t.key ? t.color : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: actType === t.key ? t.color : "var(--muted-foreground)" }}>{t.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Ngày thương thảo</label>
                  <input type="date" value={actDate} onChange={e => setActDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Người thương thảo</label>
                  <input value={actPerson} onChange={e => setActPerson(e.target.value)}
                    placeholder="Tên người thương thảo..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Kết quả thương thảo</label>
              <textarea value={actNote} onChange={e => setActNote(e.target.value)}
                placeholder="Mô tả kết quả buổi thương thảo, đề xuất, phản hồi của khách hàng..."
                rows={4}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowActivityModal(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Huỷ</button>
              <button
                onClick={handleSaveActivity}
                disabled={saving || !actNote.trim()}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: !actNote.trim() ? "var(--muted)" : selType.color, color: !actNote.trim() ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: !actNote.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
              >
                {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> : <i className="bi bi-check2" />}Lưu hoạt động
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
