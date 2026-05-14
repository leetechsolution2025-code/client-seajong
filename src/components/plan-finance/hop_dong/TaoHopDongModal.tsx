"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { genDocCode } from "@/lib/genDocCode";
import type { QuotationForDetail } from "@/components/plan-finance/bao_gia/ChiTietBaoGia";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VatTuCheck {
  tenVatTu: string;
  donViTinh: string | null;
  soLuongMoi: number;   // số phụ kiện cho 1 sản phẩm
  canTong: number;      // tổng cần
  tonKho: number;       // có trong kho
  canMuaThem: number;   // cần làm/mua thêm
  ghiChu: string | null;
}

interface InvCheck {
  tenHang: string;
  donVi: string;
  yeuCau: number;
  tonKho: number;
  thieuHang: boolean;
  coBOM: boolean;
  dinhMuc: {
    tenDinhMuc: string | null;
    vatTu: VatTuCheck[];
  } | null;
}

interface ImplStep {
  key: string;
  label: string;
  checked: boolean;
  ngayBD: string;
  ngayKT: string;
  nguoiThucHien: string;
}

const DEFAULT_STEPS: Omit<ImplStep, "key" | "label">[] = [
  { checked: true,  ngayBD: "", ngayKT: "", nguoiThucHien: "" },
  { checked: false, ngayBD: "", ngayKT: "", nguoiThucHien: "" },
  { checked: true,  ngayBD: "", ngayKT: "", nguoiThucHien: "" },
  { checked: true,  ngayBD: "", ngayKT: "", nguoiThucHien: "" },
  { checked: true,  ngayBD: "", ngayKT: "", nguoiThucHien: "" },
];
const STEP_LABELS = ["Mua hàng", "Gia công", "Xuất kho", "Vận chuyển và bàn giao", "Thu hồi công nợ"];

const PRIORITY_OPTS = [
  { value: "none",   label: "Không ưu tiên" },
  { value: "medium", label: "Bình thường" },
  { value: "high",   label: "Ưu tiên cao" },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid var(--border)",
  borderRadius: 8, background: "var(--background)", color: "var(--foreground)",
  fontSize: 12.5, outline: "none", boxSizing: "border-box",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4,
  color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em",
};
const sectionSt: React.CSSProperties = {
  marginBottom: 18,
};
const sectionTitleSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "var(--primary)", marginBottom: 10,
  paddingBottom: 6, borderBottom: "1.5px solid color-mix(in srgb, var(--primary) 20%, transparent)",
};

function FLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={labelSt}>
      {text}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function TaoHopDongModal({
  open, onClose, quotation, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  quotation: QuotationForDetail | null;
  onSaved?: () => void;
}) {
  const { data: session } = useSession();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);

  // ── Contract form fields
  const [soHopDong, setSoHopDong] = useState("");
  const [ngayKy, setNgayKy] = useState(today);
  const [mucDoUuTien, setMucDoUuTien] = useState("none");
  const [ngayBatDau, setNgayBatDau] = useState("");
  const [ngayKetThuc, setNgayKetThuc] = useState("");
  const [diaChiGiaoHang, setDiaChiGiaoHang] = useState("");
  const [nguoiLienHe, setNguoiLienHe] = useState("");
  const [soDienThoai, setSoDienThoai] = useState("");

  // ── Inventory check
  const [invChecks, setInvChecks] = useState<InvCheck[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [invError, setInvError] = useState("");

  // ── Implementation plan
  const [steps, setSteps] = useState<ImplStep[]>(
    STEP_LABELS.map((label, i) => ({ label, key: STEP_LABELS[i], ...DEFAULT_STEPS[i] }))
  );

  // ── Saving state
  const [saving, setSaving] = useState(false);

  // ── Reset & populate when modal opens
  useEffect(() => {
    if (!open || !quotation) return;
    setSoHopDong(genDocCode("HD"));
    setNgayKy(today);
    setNgayBatDau("");
    setNgayKetThuc("");
    setMucDoUuTien("none");
    setDiaChiGiaoHang(quotation.customer?.address ?? "");
    setNguoiLienHe(quotation.nguoiPhuTrach?.fullName ?? "");
    setSoDienThoai(quotation.customer?.dienThoai ?? "");
    setSteps(STEP_LABELS.map((label, i) => ({
      label, key: label,
      ...DEFAULT_STEPS[i],
      nguoiThucHien: session?.user?.name ?? "",
    })));
    // Fetch inventory status
    fetchInventory(quotation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quotation?.id]);

  const fetchInventory = useCallback(async (q: QuotationForDetail) => {
    const items: any[] = Array.isArray(q.items) ? q.items : [];
    if (!items.length) { setInvChecks([]); return; }
    setLoadingInv(true);
    setInvError("");
    try {
      const res = await fetch("/api/plan-finance/inventory/bom-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(it => ({ tenHang: it.tenHang ?? "", soLuong: Number(it.soLuong ?? 1) })),
        }),
      });
      if (!res.ok) throw new Error("Lỗi kết nối");
      setInvChecks(await res.json());
    } catch {
      setInvError("Không thể kiểm tra tồn kho");
    } finally {
      setLoadingInv(false);
    }
  }, []);

  const [sendingReq, setSendingReq] = useState(false);

  const handleSendRequest = async () => {
    if (!quotation) return;

    // Thu thập tất cả vật tư/hàng hoá thiếu
    const lines: { tenHang: string; donVi: string; soLuong: number; ghiChu: string }[] = [];

    invChecks.forEach(c => {
      if (c.coBOM && c.dinhMuc?.vatTu.length) {
        // Hàng có định mức → liệt kê vật tư thiếu
        c.dinhMuc.vatTu.forEach(vt => {
          if (vt.canMuaThem > 0) {
            lines.push({
              tenHang: vt.tenVatTu,
              donVi:   vt.donViTinh ?? "",
              soLuong: vt.canMuaThem,
              ghiChu:  `Vật tư để sản xuất ${c.yeuCau} ${c.donVi} "${c.tenHang}"`,
            });
          }
        });
      } else if (!c.coBOM) {
        // Hàng thường — thiếu trực tiếp
        const canMua = Math.max(0, c.yeuCau - c.tonKho);
        if (canMua > 0) {
          lines.push({
            tenHang: c.tenHang,
            donVi:   c.donVi,
            soLuong: canMua,
            ghiChu:  `Hàng hoá trực tiếp cho hợp đồng`,
          });
        }
      }
    });

    if (!lines.length) {
      toast.info("Đủ hàng", "Tất cả mặt hàng và vật tư đều đủ trong kho.");
      return;
    }

    setSendingReq(true);
    try {
      // 1. Tạo phiếu yêu cầu mua hàng
      const prRes = await fetch("/api/plan-finance/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donVi:        "purchase",
          nguoiYeuCau:  session?.user?.name ?? "Hệ thống",
          lyDo:         `Phục vụ hợp đồng từ báo giá ${quotation.code} – KH: ${quotation.customer?.name ?? ""}`,
          ghiChu:       `Tự động tạo khi lập hợp đồng. Ngày: ${new Date().toLocaleDateString("vi-VN")}`,
          lines: lines.map(l => ({
            tenHang:  l.tenHang,
            donVi:    l.donVi,
            soLuong:  l.soLuong,
            donGiaDK: 0,
            ghiChu:   l.ghiChu,
          })),
        }),
      });
      if (!prRes.ok) throw new Error("Không tạo được phiếu yêu cầu");
      const pr = await prRes.json();

      // 2. Gửi thông báo đến bộ phận Mua hàng
      const itemLines = lines.map((l, i) =>
        `${i + 1}. ${l.tenHang} – ${l.soLuong} ${l.donVi} (${l.ghiChu})`
      ).join("\n");

      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:        `📦 Yêu cầu mua hàng ${pr.code} – ${quotation.customer?.name ?? ""}`,
          content:      `Có yêu cầu mua hàng mới phục vụ hợp đồng từ báo giá ${quotation.code}.\n\nDanh sách cần mua (${lines.length} mục):\n${itemLines}\n\nVui lòng xử lý sớm để đảm bảo tiến độ hợp đồng.`,
          type:         "warning",
          priority:     "high",
          audienceType: "department",
          audienceValue: "purchase",
        }),
      });

      toast.success(
        `Đã gửi yêu cầu ${pr.code}`,
        `${lines.length} mục cần mua đã được gửi đến bộ phận Mua hàng.`
      );
    } catch (e: unknown) {
      toast.error("Lỗi", e instanceof Error ? e.message : "Không gửi được yêu cầu");
    } finally {
      setSendingReq(false);
    }
  };


  const handleSave = async () => {
    if (!quotation) return;
    if (!soHopDong.trim()) { toast.error("Lỗi", "Vui lòng nhập số hợp đồng"); return; }
    if (!ngayBatDau || !ngayKetThuc) { toast.error("Lỗi", "Vui lòng nhập ngày bắt đầu và kết thúc"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/plan-finance/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: soHopDong.trim(),
          quotationId: quotation.id,
          customerId: quotation.customer?.id,
          ngayKy,
          ngayBatDau,
          ngayKetThuc,
          uuTien: mucDoUuTien,
          giaTriHopDong: quotation.thanhTien,
          diaChiGiaoHang,
          nguoiLienHe,
          soDienThoai,
          keHoach: steps.filter(s => s.checked).map(s => ({
            buoc: s.label, ngayBD: s.ngayBD, ngayKT: s.ngayKT, nguoiThucHien: s.nguoiThucHien,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi tạo hợp đồng");
      toast.success("Tạo thành công", `Hợp đồng ${soHopDong} đã được tạo`);
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error("Lỗi", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !quotation) return null;

  const qItems: any[] = Array.isArray(quotation.items) ? quotation.items : [];
  const thieuHang = invChecks.some(c => c.thieuHang);
  const fmt = (n: number) => n.toLocaleString("vi-VN");

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1301,
        background: "var(--card)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
        border: "none",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: "fadeScaleIn 0.2s ease-out",
      }}>

        {/* ── Header */}
        <div style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-file-earmark-text-fill" style={{ fontSize: 17, color: "#fff" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff" }}>Tạo hợp đồng mới</p>
              <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>
                Từ báo giá&nbsp;<span style={{ fontFamily: "monospace", fontWeight: 700 }}>{quotation.code}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* ── Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left Panel */}
          <div style={{
            width: 400, flexShrink: 0, borderRight: "1px solid var(--border)",
            overflowY: "auto", padding: "20px 20px",
            display: "flex", flexDirection: "column", gap: 2,
            background: "var(--card)",
          }}>
            {/* Thông tin khách hàng */}
            <div style={sectionSt}>
              <p style={sectionTitleSt}>Thông tin khách hàng</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { icon: "bi-building",        label: "Công ty",   val: quotation.customer?.name },
                  { icon: "bi-geo-alt",          label: "Địa chỉ",  val: quotation.customer?.address },
                  { icon: "bi-person-badge",     label: "Đại diện", val: quotation.nguoiPhuTrach?.fullName },
                  { icon: "bi-telephone",        label: "Liên hệ",  val: quotation.customer?.dienThoai },
                  { icon: "bi-envelope",         label: "Email",    val: quotation.customer?.email },
                ].map(({ icon, label, val }) => val ? (
                  <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <i className={`bi ${icon}`} style={{ fontSize: 12, color: "var(--primary)", marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ color: "var(--muted-foreground)", marginRight: 4 }}>{label}:</span>
                      <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{val}</span>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Thông tin hợp đồng */}
            <div style={sectionSt}>
              <p style={sectionTitleSt}>Thông tin hợp đồng</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Mã báo giá (readonly) */}
                <div>
                  <FLabel text="Mã báo giá" />
                  <input value={quotation.code ?? "—"} readOnly style={{ ...inputSt, background: "var(--muted)", fontFamily: "monospace", fontWeight: 700 }} />
                </div>
                {/* Số hợp đồng */}
                <div>
                  <FLabel text="Số hợp đồng" required />
                  <input value={soHopDong} onChange={e => setSoHopDong(e.target.value)} style={inputSt} placeholder="Số hợp đồng" />
                </div>
                {/* Ngày ký + Ưu tiên */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <FLabel text="Ngày ký" required />
                    <input type="date" value={ngayKy} onChange={e => setNgayKy(e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <FLabel text="Mức độ ưu tiên" />
                    <select value={mucDoUuTien} onChange={e => setMucDoUuTien(e.target.value)} style={{ ...inputSt, appearance: "none" }}>
                      {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {/* Ngày bắt đầu + kết thúc */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <FLabel text="Ngày bắt đầu" required />
                    <input type="date" value={ngayBatDau} onChange={e => setNgayBatDau(e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <FLabel text="Ngày kết thúc" required />
                    <input type="date" value={ngayKetThuc} onChange={e => setNgayKetThuc(e.target.value)} style={inputSt} />
                  </div>
                </div>
                {/* Giá trị */}
                <div>
                  <FLabel text="Giá trị hợp đồng (VND)" />
                  <input value={fmt(quotation.thanhTien ?? 0)} readOnly style={{ ...inputSt, background: "var(--muted)", fontWeight: 700, color: "var(--primary)" }} />
                </div>
                {/* File đính kèm */}
                <div>
                  <FLabel text="Tệp đính kèm" />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{
                      padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--muted)", color: "var(--foreground)", fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                    }}>
                      <i className="bi bi-paperclip" /> Chọn tệp
                    </button>
                    <input placeholder="Kéo thả tệp vào đây..." readOnly style={{ ...inputSt, fontSize: 11.5, color: "var(--muted-foreground)", flex: 1 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin bổ sung */}
            <div style={sectionSt}>
              <p style={sectionTitleSt}>Thông tin bổ sung</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <FLabel text="Địa chỉ nhận hàng" />
                  <input value={diaChiGiaoHang} onChange={e => setDiaChiGiaoHang(e.target.value)} style={inputSt} placeholder="Địa chỉ nhận hàng..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <FLabel text="Người liên hệ" />
                    <input value={nguoiLienHe} onChange={e => setNguoiLienHe(e.target.value)} style={inputSt} placeholder="Họ tên..." />
                  </div>
                  <div>
                    <FLabel text="Số điện thoại" />
                    <input value={soDienThoai} onChange={e => setSoDienThoai(e.target.value)} style={inputSt} placeholder="0xxx..." />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Khối lượng hợp đồng */}
            <div>
              <p style={sectionTitleSt}>Khối lượng hợp đồng</p>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      {["#", "Tên hàng hoá, dịch vụ", "Đơn vị tính", "Số lượng", "Đơn giá (đ)", "Thành tiền (đ)"].map((h, i) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: i < 2 ? "left" : "right", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)", width: i === 1 ? undefined : i === 0 ? 30 : "auto" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qItems.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>Không có mặt hàng</td></tr>
                    ) : qItems.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? undefined : "var(--muted)" }}>
                        <td style={{ padding: "7px 10px", color: "var(--muted-foreground)", textAlign: "right" }}>{idx + 1}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600 }}>{it.tenHang}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--muted-foreground)" }}>{it.donVi}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{Number(it.soLuong).toLocaleString()}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(it.donGia)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{fmt(it.thanhTien)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {qItems.length > 0 && (
                    <tfoot>
                      <tr style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                        <td colSpan={5} style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, fontSize: 12 }}>Tổng cộng:</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, fontSize: 14, color: "var(--primary)" }}>{fmt(quotation.thanhTien ?? 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Trạng thái hàng hoá trong kho */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ ...sectionTitleSt, margin: 0 }}>Trạng thái hàng hoá trong kho</p>
                <button
                  onClick={handleSendRequest}
                  disabled={sendingReq || loadingInv || !thieuHang}
                  title={!thieuHang && !loadingInv ? "Tất cả hàng hoá đã đủ trong kho" : undefined}
                  style={{
                    padding: "7px 14px", borderRadius: 8, border: "none",
                    background: (sendingReq || loadingInv || !thieuHang) ? "var(--muted)" : "#10b981",
                    color: (sendingReq || loadingInv || !thieuHang) ? "var(--muted-foreground)" : "#fff",
                    fontWeight: 700, fontSize: 12.5,
                    cursor: (sendingReq || loadingInv || !thieuHang) ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s",
                    opacity: (!thieuHang && !loadingInv) ? 0.5 : 1,
                  }}
                >
                  {sendingReq
                    ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite", fontSize: 11 }} /> Đang gửi...</>
                    : !thieuHang && !loadingInv
                      ? <><i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} /> Đủ hàng trong kho</>
                      : <><i className="bi bi-send-fill" style={{ fontSize: 11 }} /> Gửi yêu cầu mua hàng</>
                  }
                </button>
              </div>

              {loadingInv ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite", marginRight: 6 }} />
                  Đang kiểm tra tồn kho...
                </div>
              ) : invError ? (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#ef4444" }}>
                  {invError}
                </div>
              ) : (
                <>
                  {thieuHang && (
                    <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, fontSize: 12.5, color: "#d97706", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <i className="bi bi-exclamation-triangle-fill" />
                      <span><strong>Thiếu hàng!</strong> Cần mua bổ sung các vật tư dưới đây</span>
                    </div>
                  )}

                  {invChecks.length > 0 ? (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ background: "var(--muted)" }}>
                            <th style={{ padding: "8px 10px", textAlign: "left",  fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Hàng hoá / Vật tư</th>
                            <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", width: 60 }}>ĐVT</th>
                            <th style={{ padding: "8px 10px", textAlign: "right",  fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", width: 65 }}>Tồn kho</th>
                            <th style={{ padding: "8px 10px", textAlign: "right",  fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", width: 65 }}>Yêu cầu</th>
                            <th style={{ padding: "8px 10px", textAlign: "right",  fontSize: 11, fontWeight: 700, color: "#ef4444",               borderBottom: "1px solid var(--border)", width: 70 }}>Cần mua</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invChecks.flatMap((c, i) => {
                            const hasMore = i < invChecks.length - 1;
                            // ── Dòng hàng hoá chính ──
                            const mainRow = (
                              <tr key={`main-${i}`} style={{
                                borderTop: i > 0 ? "2px solid var(--border)" : undefined,
                                background: c.coBOM
                                  ? "color-mix(in srgb, var(--primary) 4%, var(--card))"
                                  : c.thieuHang ? "rgba(245,158,11,0.05)" : undefined,
                              }}>
                                <td style={{ padding: "9px 10px", fontWeight: 800, fontSize: 13 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    {c.coBOM ? (
                                      <i className="bi bi-diagram-3" style={{ fontSize: 14, color: "#8b5cf6", flexShrink: 0 }} />
                                    ) : (
                                      <i className="bi bi-box-seam" style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }} />
                                    )}
                                    <span>{c.tenHang}</span>
                                    {c.coBOM && (
                                      <span style={{ fontSize: 10, color: "#8b5cf6", background: "rgba(139,92,246,0.12)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                        có định mức
                                      </span>
                                    )}
                                  </div>
                                  {c.coBOM && (
                                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, paddingLeft: 21, fontWeight: 400 }}>
                                      Cần {c.dinhMuc?.vatTu.length ?? 0} loại vật tư để sản xuất {c.yeuCau} {c.donVi}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: "9px 10px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>{c.donVi}</td>
                                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700,
                                    color: c.coBOM ? "var(--muted-foreground)" : (c.thieuHang ? "#ef4444" : "#10b981") }}>
                                  {c.coBOM ? <span style={{ opacity: 0.35, fontStyle: "italic", fontSize: 11 }}>theo VT</span> : c.tonKho}
                                </td>
                                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700 }}>{c.yeuCau}</td>
                                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700,
                                    color: c.coBOM ? "var(--muted-foreground)" : (c.thieuHang ? "#ef4444" : "var(--muted-foreground)") }}>
                                  {c.coBOM
                                    ? <span style={{ opacity: 0.35, fontStyle: "italic", fontSize: 11 }}>xem VT</span>
                                    : Math.max(0, c.yeuCau - c.tonKho) > 0
                                      ? Math.max(0, c.yeuCau - c.tonKho)
                                      : <span style={{ opacity: 0.35 }}>—</span>
                                  }
                                </td>
                              </tr>
                            );

                            // ── Dòng vật tư con (chỉ khi có định mức) ──
                            const subRows = c.coBOM && c.dinhMuc?.vatTu.length
                              ? c.dinhMuc.vatTu.map((vt, j) => {
                                  const isLastSub = j === (c.dinhMuc?.vatTu.length ?? 0) - 1;
                                  return (
                                    <tr key={`vt-${i}-${j}`} style={{
                                      borderTop: "1px dashed var(--border)",
                                      background: vt.canMuaThem > 0 ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.02)",
                                    }}>
                                      <td style={{ padding: "6px 10px 6px 30px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <i className="bi bi-arrow-return-right" style={{ fontSize: 10, color: "#8b5cf6", flexShrink: 0 }} />
                                          <span style={{ fontSize: 12.5, fontWeight: 600, color: vt.canMuaThem > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
                                            {vt.tenVatTu}
                                          </span>
                                          {vt.ghiChu && (
                                            <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontStyle: "italic" }}>({vt.ghiChu})</span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", paddingLeft: 16, marginTop: 1 }}>
                                          Định mức: {vt.soLuongMoi} {vt.donViTinh}/sp × {c.yeuCau} sp = cần {vt.canTong}
                                        </div>
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)" }}>
                                        {vt.donViTinh ?? "—"}
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, fontSize: 12.5,
                                          color: vt.tonKho === 0 ? "#ef4444" : vt.tonKho < vt.canTong ? "#f59e0b" : "#10b981" }}>
                                        {vt.tonKho}
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, fontSize: 12.5 }}>
                                        {vt.canTong}
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, fontSize: 12.5,
                                          color: vt.canMuaThem > 0 ? "#ef4444" : "#10b981" }}>
                                        {vt.canMuaThem > 0 ? (
                                          <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                            <i className="bi bi-cart-plus" style={{ fontSize: 11 }} />
                                            {vt.canMuaThem}
                                          </span>
                                        ) : (
                                          <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                            <i className="bi bi-check2" style={{ fontSize: 12 }} />
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              : [];

                            return [mainRow, ...subRows];
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                      Không có dữ liệu tồn kho
                    </div>
                  )}
                </>
              )}
            </div>



            {/* Kế hoạch thực hiện */}
            <div>
              <p style={sectionTitleSt}>Kế hoạch thực hiện</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {steps.map((step, i) => (
                  <div key={step.key} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: 9,
                    border: "1px solid var(--border)",
                    background: step.checked ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "var(--muted)",
                    opacity: step.checked ? 1 : 0.55,
                    transition: "opacity 0.15s",
                  }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={step.checked}
                      onChange={e => setSteps(s => s.map((x, j) => j === i ? { ...x, checked: e.target.checked } : x))}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)", flexShrink: 0, cursor: "pointer" }}
                    />
                    {/* Label */}
                    <span style={{ fontSize: 12.5, fontWeight: 700, width: 170, flexShrink: 0, color: "var(--foreground)" }}>{step.label}</span>
                    {/* Ngày bắt đầu */}
                    <input
                      type="date" value={step.ngayBD} disabled={!step.checked}
                      onChange={e => setSteps(s => s.map((x, j) => j === i ? { ...x, ngayBD: e.target.value } : x))}
                      style={{ ...inputSt, width: 130, fontSize: 12, padding: "5px 8px" }}
                    />
                    {/* Ngày kết thúc */}
                    <input
                      type="date" value={step.ngayKT} disabled={!step.checked}
                      onChange={e => setSteps(s => s.map((x, j) => j === i ? { ...x, ngayKT: e.target.value } : x))}
                      style={{ ...inputSt, width: 130, fontSize: 12, padding: "5px 8px" }}
                    />
                    {/* Người thực hiện */}
                    <input
                      value={step.nguoiThucHien} disabled={!step.checked}
                      placeholder="Người thực hiện"
                      onChange={e => setSteps(s => s.map((x, j) => j === i ? { ...x, nguoiThucHien: e.target.value } : x))}
                      style={{ ...inputSt, flex: 1, fontSize: 12, padding: "5px 8px" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
          background: "var(--card)", flexShrink: 0,
        }}>
          {thieuHang && (
            <div style={{ flex: 1, fontSize: 12, color: "#d97706", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-exclamation-triangle-fill" />
              Một số mặt hàng thiếu hàng trong kho. Hãy gửi yêu cầu mua hàng trước.
            </div>
          )}
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: 9, border: "1px solid var(--border)",
            background: "var(--muted)", color: "var(--foreground)", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "10px 24px", borderRadius: 9, border: "none",
            background: saving ? "var(--muted)" : "linear-gradient(135deg, #7c3aed, #5b21b6)",
            color: saving ? "var(--muted-foreground)" : "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.15s",
          }}>
            {saving
              ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> Đang tạo...</>
              : <><i className="bi bi-check2-circle" /> Tạo hợp đồng</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
