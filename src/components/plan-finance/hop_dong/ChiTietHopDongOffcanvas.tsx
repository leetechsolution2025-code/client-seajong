"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ContractDetail {
  id: string;
  code: string | null;
  trangThai: string;
  uuTien: string;
  ngayKy: string | null;
  ngayBatDau: string | null;
  ngayKetThuc: string | null;
  giaTriHopDong: number;
  daThanhToan: number;
  ghiChu: string | null;
  createdAt: string;
  customer: {
    id: string; name: string; nhom: string | null;
    dienThoai: string | null; email: string | null; address: string | null;
    daiDien: string | null; xungHo: string | null; chucVu: string | null;
  } | null;
  nguoiPhuTrach: { id: string; fullName: string; position: string | null } | null;
  quotation: {
    id: string; code: string | null; ngayBaoGia: string | null; thanhTien: number;
    items: { tenHang: string; donVi: string | null; soLuong: number; donGia: number; thanhTien: number }[];
  } | null;
}

// ── Config/helpers ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: "Chưa thực hiện", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "bi-circle" },
  active:    { label: "Đang thực hiện", color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "bi-play-circle-fill" },
  done:      { label: "Hoàn thành",     color: "#6366f1", bg: "rgba(99,102,241,0.12)",  icon: "bi-check-circle-fill" },
  paused:    { label: "Tạm dừng",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "bi-pause-circle-fill" },
  cancelled: { label: "Huỷ bỏ",         color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "bi-x-circle-fill" },
  // Legacy — giữ lại để hiển thị data cũ
  delayed:   { label: "Chậm tiến độ",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "bi-exclamation-triangle-fill" },
  overdue:   { label: "Quá hạn",        color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "bi-alarm-fill" },
};

const STATUS_OPTIONS = [
  { value: "pending",   label: "Chưa thực hiện" },
  { value: "active",    label: "Đang thực hiện" },
  { value: "done",      label: "Hoàn thành" },
  { value: "paused",    label: "Tạm dừng" },
  { value: "cancelled", label: "Huỷ bỏ" },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtMoney(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "0";
  return n.toLocaleString("vi-VN");
}
function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}
function daysLeft(d: string | null) {
  if (!d) return null;
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <i className={`bi ${icon}`} style={{ fontSize: 13, color: "var(--primary)", marginTop: 2, flexShrink: 0, width: 16, textAlign: "center" }} />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0, width: 110 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", flex: 1 }}>{value || "—"}</span>
    </div>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em",
      color: "var(--primary)", marginBottom: 10, marginTop: 18,
      paddingBottom: 6, borderBottom: "1.5px solid color-mix(in srgb, var(--primary) 20%, transparent)",
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: 12 }} />
      {title}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: "bi-circle" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 700,
      background: c.bg, color: c.color,
    }}>
      <i className={`bi ${c.icon}`} style={{ fontSize: 11 }} />
      {c.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ChiTietHopDongOffcanvas({
  contractId,
  onClose,
  onUpdated,
}: {
  contractId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editTrangThai, setEditTrangThai] = useState("");
  const [editDaThanhToan, setEditDaThanhToan] = useState("");
  const [editGhiChu, setEditGhiChu] = useState("");
  const [dirty, setDirty] = useState(false);

  // Fetch detail khi contractId thay đổi
  useEffect(() => {
    if (!contractId) { setContract(null); return; }
    setLoading(true);
    fetch(`/api/plan-finance/contracts/${contractId}`)
      .then(r => r.json())
      .then((d: ContractDetail) => {
        setContract(d);
        setEditTrangThai(d.trangThai);
        setEditDaThanhToan(String(d.daThanhToan));
        setEditGhiChu(d.ghiChu ?? "");
        setDirty(false);
      })
      .catch(() => toast.error("Lỗi", "Không thể tải thông tin hợp đồng"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const handleSave = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trangThai: editTrangThai,
          daThanhToan: parseFloat(editDaThanhToan) || 0,
          ghiChu: editGhiChu,
        }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật");
      toast.success("Đã lưu", `Hợp đồng ${contract.code} đã được cập nhật`);
      setDirty(false);
      onUpdated?.();
      // Refetch để cập nhật UI
      const updated: ContractDetail = await fetch(`/api/plan-finance/contracts/${contract.id}`).then(r => r.json());
      setContract(updated);
    } catch (e: unknown) {
      toast.error("Lỗi", e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const open = !!contractId;

  // Tính thanh toán
  const conLai = contract ? contract.giaTriHopDong - (parseFloat(editDaThanhToan) || 0) : 0;
  const pctTT  = contract && contract.giaTriHopDong > 0
    ? Math.min(100, Math.round(((parseFloat(editDaThanhToan) || 0) / contract.giaTriHopDong) * 100))
    : 0;

  // Tính thời gian
  const tongNgay  = daysBetween(contract?.ngayBatDau ?? null, contract?.ngayKetThuc ?? null);
  const conNgay   = daysLeft(contract?.ngayKetThuc ?? null);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Offcanvas panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1201,
        width: 440,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
      }}>

        {/* ── Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #1e3a5f, #1e40af)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <i className="bi bi-file-earmark-check-fill" style={{ fontSize: 17, color: "#fff" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#fff" }}>
                Chi tiết hợp đồng
              </p>
              {contract && (
                <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>
                  {contract.code ?? "—"}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* ── Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--muted-foreground)", flexDirection: "column", gap: 12 }}>
              <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Đang tải...</span>
            </div>
          ) : !contract ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--muted-foreground)", fontSize: 13 }}>
              Không có dữ liệu
            </div>
          ) : (
            <>
              {/* ── Trạng thái + ưu tiên */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <StatusBadge status={contract.trangThai} />
                {contract.uuTien === "high" && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 700, color: "#ef4444",
                    background: "rgba(239,68,68,0.1)", padding: "3px 8px", borderRadius: 9999,
                  }}>
                    <i className="bi bi-lightning-charge-fill" style={{ fontSize: 10 }} />
                    Ưu tiên cao
                  </span>
                )}
              </div>

              {/* ── Thanh toán progress */}
              <div style={{
                background: "var(--muted)", borderRadius: 12, padding: "14px 16px",
                marginBottom: 16, border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Thanh toán
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: pctTT === 100 ? "#10b981" : "var(--primary)" }}>
                    {pctTT}%
                  </span>
                </div>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 9999, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{
                    height: "100%", width: `${pctTT}%`,
                    background: pctTT === 100 ? "#10b981" : "linear-gradient(90deg, #3b82f6, #6366f1)",
                    borderRadius: 9999, transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Giá trị HĐ", val: `${fmtMoney(contract.giaTriHopDong)} ₫`, color: "var(--foreground)" },
                    { label: "Đã thanh toán", val: `${fmtMoney(parseFloat(editDaThanhToan) || 0)} ₫`, color: "#10b981" },
                    { label: "Còn lại", val: `${fmtMoney(conLai)} ₫`, color: conLai > 0 ? "#f59e0b" : "#10b981" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Thời hạn hợp đồng */}
              {(contract.ngayBatDau || contract.ngayKetThuc) && (
                <div style={{
                  background: "var(--muted)", borderRadius: 12, padding: "12px 16px",
                  marginBottom: 16, border: "1px solid var(--border)",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                }}>
                  {[
                    { label: "Bắt đầu", val: fmtDate(contract.ngayBatDau), icon: "bi-play-circle" },
                    { label: "Kết thúc", val: fmtDate(contract.ngayKetThuc), icon: "bi-flag-fill" },
                    {
                      label: "Thời gian",
                      val: tongNgay !== null ? `${tongNgay} ngày` : "—",
                      icon: "bi-calendar-range",
                      sub: conNgay !== null
                        ? conNgay > 0
                          ? `Còn ${conNgay} ngày`
                          : `Quá ${Math.abs(conNgay)} ngày`
                        : undefined,
                      subColor: conNgay !== null && conNgay <= 0 ? "#ef4444" : conNgay !== null && conNgay <= 7 ? "#f59e0b" : "#10b981",
                    },
                  ].map(({ label, val, icon, sub, subColor }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <i className={`bi ${icon}`} style={{ fontSize: 14, color: "var(--primary)", display: "block", marginBottom: 4 }} />
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{val}</div>
                      {sub && <div style={{ fontSize: 10, fontWeight: 600, color: subColor, marginTop: 1 }}>{sub}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Thông tin khách hàng */}
              <SectionTitle title="Khách hàng" icon="bi-person-lines-fill" />
              <InfoRow icon="bi-building" label="Tên khách hàng" value={contract.customer?.name} />
              {contract.customer?.daiDien && (
                <InfoRow
                  icon="bi-person-badge"
                  label="Người đại diện"
                  value={[contract.customer.xungHo, contract.customer.daiDien].filter(Boolean).join(" ")}
                />
              )}
              {contract.customer?.chucVu && (
                <InfoRow icon="bi-briefcase" label="Chức vụ" value={contract.customer.chucVu} />
              )}
              <InfoRow icon="bi-telephone" label="Điện thoại" value={contract.customer?.dienThoai} />
              <InfoRow icon="bi-envelope" label="Email" value={contract.customer?.email} />
              <InfoRow icon="bi-geo-alt" label="Địa chỉ" value={contract.customer?.address} />

              {/* ── Thông tin hợp đồng */}
              <SectionTitle title="Thông tin hợp đồng" icon="bi-file-earmark-text" />
              <InfoRow icon="bi-hash" label="Số hợp đồng" value={<span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>{contract.code}</span>} />
              <InfoRow icon="bi-pen" label="Ngày ký" value={fmtDate(contract.ngayKy)} />
              <InfoRow icon="bi-person-workspace" label="Người phụ trách" value={contract.nguoiPhuTrach?.fullName} />
              {contract.quotation && (
                <InfoRow icon="bi-file-earmark-text" label="Từ báo giá" value={
                  <span style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 700 }}>
                    {contract.quotation.code}
                  </span>
                } />
              )}

              {/* ── Danh sách hàng hoá (từ báo giá) */}
              {contract.quotation?.items && contract.quotation.items.length > 0 && (
                <>
                  <SectionTitle title="Khối lượng hợp đồng" icon="bi-list-ul" />
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: "var(--muted)" }}>
                          {["#", "Tên hàng hoá", "SL", "Đơn giá", "Thành tiền"].map((h, i) => (
                            <th key={h} style={{
                              padding: "7px 8px", textAlign: i === 0 ? "center" : i <= 1 ? "left" : "right",
                              fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)",
                              borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {contract.quotation.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? undefined : "var(--muted)" }}>
                            <td style={{ padding: "6px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>{idx + 1}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>
                              {it.tenHang}
                              {it.donVi && <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 4 }}>({it.donVi})</span>}
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>{it.soLuong}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtMoney(it.donGia)}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>
                              {fmtMoney(it.thanhTien)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                          <td colSpan={4} style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>Tổng cộng:</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800, color: "var(--primary)" }}>
                            {fmtMoney(contract.quotation.thanhTien)}₫
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Cập nhật trạng thái & thanh toán */}
              <SectionTitle title="Cập nhật tiến độ" icon="bi-pencil-square" />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Trạng thái */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Trạng thái
                  </label>
                  <select
                    value={editTrangThai}
                    onChange={e => { setEditTrangThai(e.target.value); setDirty(true); }}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "var(--background)",
                      color: "var(--foreground)", fontSize: 13, outline: "none",
                    }}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Đã thanh toán */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Đã thanh toán (₫)
                  </label>
                  <input
                    type="number"
                    value={editDaThanhToan}
                    min={0}
                    max={contract.giaTriHopDong}
                    onChange={e => { setEditDaThanhToan(e.target.value); setDirty(true); }}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "var(--background)",
                      color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Ghi chú */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Ghi chú
                  </label>
                  <textarea
                    rows={3}
                    value={editGhiChu}
                    onChange={e => { setEditGhiChu(e.target.value); setDirty(true); }}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "var(--background)",
                      color: "var(--foreground)", fontSize: 13, outline: "none",
                      resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Ngày tạo */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted-foreground)" }}>
                Tạo lúc: {fmtDate(contract.createdAt)}
              </div>
            </>
          )}
        </div>

        {/* ── Footer */}
        {contract && (
          <div style={{
            padding: "12px 20px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
            background: "var(--card)", flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--muted)", color: "var(--foreground)", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>Đóng</button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "none",
                background: !dirty || saving ? "var(--muted)" : "linear-gradient(135deg, #1e3a5f, #1e40af)",
                color: !dirty || saving ? "var(--muted-foreground)" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: !dirty || saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 7,
                transition: "all 0.15s", opacity: !dirty ? 0.6 : 1,
              }}
            >
              {saving
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> Đang lưu...</>
                : <><i className="bi bi-check2" /> Lưu thay đổi</>
              }
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
