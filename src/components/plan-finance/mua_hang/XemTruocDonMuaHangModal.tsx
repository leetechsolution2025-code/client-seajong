"use client";
import React from "react";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ───────────────────────────────────────────────────────────────────────
interface ReqItem {
  id: string;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  inventoryItemId: string | null;
  inventoryItem: { code: string | null; tenHang: string; donVi: string | null; categoryId: string | null; thongSoKyThuat: string | null } | null;
}

interface Assignment {
  itemId: string;
  supplierId: string | null;
  donGia: number;
  ngayGiao: string;
  skip: boolean;
}

interface Supplier {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  contactName: string | null;
  xungHo: string | null;
  email: string | null;
}

interface CompanyInfo {
  name: string;
  shortName?: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  logoUrl: string | null;
  legalRep: string | null;
}

interface Props {
  reqId: string;
  reqCode: string | null;
  supplierId: string;
  supplierName: string;
  assignments: Assignment[];
  items: ReqItem[];
  onClose: () => void;
  onCreated: (orders: { code: string | null; supplierName: string; soMatHang: number }[]) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function fmtVnd(n: number) { return n.toLocaleString("vi-VN"); }
function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function soThanhChu(n: number): string {
  if (n === 0) return "Không đồng";
  const CS = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  function doc3(num: number, leading: boolean): string {
    if (num === 0) return "";
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    let s = "";
    if (h > 0) { s = CS[h] + " trăm"; }
    else if (!leading) { if (t === 0) return "lẻ " + CS[u]; s = "không trăm"; }
    if (t === 0) { if (u > 0) s += (s ? " lẻ " : "") + CS[u]; }
    else if (t === 1) { s += (s ? " " : "") + "mười"; if (u === 5) s += " lăm"; else if (u > 0) s += " " + CS[u]; }
    else { s += (s ? " " : "") + CS[t] + " mươi"; if (u === 1) s += " mốt"; else if (u === 5) s += " lăm"; else if (u > 0) s += " " + CS[u]; }
    return s;
  }
  const scales = [{ v: 1_000_000_000, label: "tỷ" }, { v: 1_000_000, label: "triệu" }, { v: 1_000, label: "nghìn" }, { v: 1, label: "" }];
  let result = ""; let rem = Math.round(n); let first = true;
  for (const { v, label } of scales) {
    const q = Math.floor(rem / v); rem %= v; if (q === 0) continue;
    const part = doc3(q, first) + (label ? " " + label : "");
    result += (result ? " " : "") + part; first = false;
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

const today = new Date().toISOString().slice(0, 10);
const inp = printStyles.sidebarInput;
const secHead = printStyles.secHead;
const bodyCell = printStyles.bodyCell;

// ── Main component ───────────────────────────────────────────────────────────────
export default function XemTruocDonMuaHangModal({
  reqId, reqCode, supplierId, supplierName, assignments, items, onClose, onCreated,
}: Props) {
  const [company, setCompany]       = React.useState<CompanyInfo | null>(null);
  const [supplier, setSupplier]     = React.useState<Supplier | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [saveMsg, setSaveMsg]       = React.useState<string | null>(null);

  const [ngayDat, setNgayDat]                     = React.useState(today);
  const [hinhThucTT, setHinhThucTT]               = React.useState("Chuyển khoản");
  const [hinhThucGH, setHinhThucGH]               = React.useState("Giao hàng tận nơi");
  const [phuongTien, setPhuongTien]               = React.useState("Xe tải");
  const [thueVAT, setThueVAT]                     = React.useState(10);
  const [diaDiemGiaoHang, setDiaDiemGiaoHang]     = React.useState("");
  const [nguoiNhan, setNguoiNhan]                 = React.useState("");
  const [sdtNhan, setSdtNhan]                     = React.useState("");
  const [ghiChu, setGhiChu]                       = React.useState("");

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => {
      setCompany(d);
      if (d?.address)  setDiaDiemGiaoHang(d.address);
      if (d?.legalRep) setNguoiNhan(d.legalRep);
      if (d?.phone)    setSdtNhan(d.phone);
    }).catch(() => {});
    fetch(`/api/plan-finance/suppliers/${supplierId}`)
      .then(r => r.json()).then(d => setSupplier(d.supplier ?? d)).catch(() => {});
  }, [supplierId]);

  const orderItems  = assignments.map(a => ({ ...a, item: items.find(i => i.id === a.itemId) })).filter(x => x.item);
  const tongTienHang = orderItems.reduce((s, x) => s + x.item!.soLuong * x.donGia, 0);
  const tienThue     = Math.round(tongTienHang * thueVAT / 100);
  const tongCong     = tongTienHang + tienThue;

  const poSuffix = React.useMemo(() => {
    const ts4   = Date.now().toString().slice(-4);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand4 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return ts4 + "-" + rand4;
  }, []);

  const poDraft  = `PO-${ngayDat.replace(/-/g, "")}-${poSuffix}`;
  const supName  = supplier?.name     ?? supplierName;
  const companyName = company?.name   ?? "—";
  const ngayStr  = fmtDate(ngayDat);

  const callCreateOrders = async () => {
    const res = await fetch(`/api/plan-finance/purchase-requests/${reqId}/create-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments, meta: { ngayDat, hinhThucTT, hinhThucGH, phuongTien, thueVAT } }),
    });
    const text = await res.text();
    let data: { createdOrders?: unknown[]; error?: string } = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
    return { res, data, text };
  };

  const handleSave = async () => {
    if (saving || submitting) return;
    setSaving(true);
    try {
      const { res, data, text } = await callCreateOrders();
      if (res.ok) {
        setSaveMsg("✓ Đã lưu đơn đặt hàng");
        setTimeout(() => setSaveMsg(null), 3000);
        const orders = (data.createdOrders ?? []) as { code: string | null; supplierName: string; soMatHang: number }[];
        onCreated(orders);
      } else {
        const msg = data.error ?? `Lỗi server (HTTP ${res.status})`;
        alert(msg); console.error("[save-order]", msg, text);
      }
    } catch (err) {
      alert("Lỗi kết nối. Vui lòng thử lại."); console.error(err);
    } finally { setSaving(false); }
  };

  const handlePrint = async () => {
    if (submitting || saving) return;
    setSubmitting(true);
    try {
      const { res, data, text } = await callCreateOrders();
      if (res.ok) {
        const orders = (data.createdOrders ?? []) as { code: string | null; supplierName: string; soMatHang: number }[];
        printDocumentById("po-document", "portrait", `Đơn đặt hàng - ${poDraft}`);
        onCreated(orders);
      } else {
        const msg = data.error ?? `Lỗi server (HTTP ${res.status})`;
        alert(msg); console.error("[create-orders] error:", msg, text);
      }
    } catch (err) {
      alert("Lỗi kết nối."); console.error(err);
    } finally { setSubmitting(false); }
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const SField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      {children}
    </div>
  );

  const sidebar = (
    <>
      <SField label="Ngày đặt hàng">
        <input type="date" value={ngayDat} onChange={e => setNgayDat(e.target.value)} style={inp} />
      </SField>
      <SField label="Hình thức thanh toán">
        <select value={hinhThucTT} onChange={e => setHinhThucTT(e.target.value)} style={inp}>
          {["Chuyển khoản", "Tiền mặt", "Công nợ", "Khác"].map(x => <option key={x}>{x}</option>)}
        </select>
      </SField>
      <SField label="Hình thức giao hàng">
        <select value={hinhThucGH} onChange={e => setHinhThucGH(e.target.value)} style={inp}>
          {["Giao hàng tận nơi", "Nhận tại kho NCC", "Qua đơn vị vận chuyển"].map(x => <option key={x}>{x}</option>)}
        </select>
      </SField>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 2 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Phương tiện</p>
          <select value={phuongTien} onChange={e => setPhuongTien(e.target.value)} style={inp}>
            {["Xe tải", "Xe máy", "Xe container", "Xe khách", "Khác"].map(x => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>VAT (%)</p>
          <input type="number" min={0} max={100} value={thueVAT} onChange={e => setThueVAT(parseFloat(e.target.value) || 0)} style={{ ...inp, textAlign: "right" }} />
        </div>
      </div>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Giao hàng đến</p>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 10.5, color: "#64748b" }}>Địa chỉ</p>
          <textarea value={diaDiemGiaoHang} onChange={e => setDiaDiemGiaoHang(e.target.value)} rows={2} placeholder="Nhập địa chỉ..." style={{ ...inp, resize: "vertical", lineHeight: 1.5, minHeight: 48 }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontSize: 10.5, color: "#64748b" }}>Người nhận</p>
            <input value={nguoiNhan} onChange={e => setNguoiNhan(e.target.value)} placeholder="Họ tên..." style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontSize: 10.5, color: "#64748b" }}>Số điện thoại</p>
            <input value={sdtNhan} onChange={e => setSdtNhan(e.target.value)} placeholder="Số điện thoại..." style={inp} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ghi chú thêm</p>
        <textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="Ghi chú, yêu cầu đặc biệt..." style={{ ...inp, flex: 1, resize: "none", lineHeight: 1.6 }} />
      </div>
    </>
  );

  // ── Document ──────────────────────────────────────────────────────────────
  const doc = (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", maxWidth: 360 }}>
          {company?.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={company.logoUrl} alt="logo" style={{ width: 68, height: 68, objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ width: 68, height: 68, background: "#e2e8f0", borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8" }}>LOGO</div>
          }
          <div style={{ fontSize: 10.5 }}>
            <p style={{ margin: "0 0 3px", fontWeight: 800, fontSize: 12.5, color: "#1e293b", lineHeight: 1.3, textTransform: "uppercase" }}>{companyName}</p>
            {company?.address && <p style={{ margin: 0 }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0, whiteSpace: "nowrap" }}>
              Điện thoại: {company?.phone ?? "—"}
              {company?.email && <span style={{ marginLeft: 10 }}>Email: {company.email}</span>}
            </p>
          </div>
        </div>
        <table style={{ borderCollapse: "collapse", minWidth: 270 }}>
          <tbody>
            <tr><td colSpan={2} style={{ background: "#000", color: "#fff", textAlign: "center", padding: "8px 20px", fontWeight: 900, fontSize: 20, letterSpacing: "0.08em", border: "2px solid #000" }}>ĐƠN ĐẶT HÀNG</td></tr>
            <tr><td colSpan={2} style={{ border: "1px solid #94a3b8", padding: "8px 14px", textAlign: "center", fontSize: 11, fontStyle: "italic", color: "#475569", lineHeight: 1.6 }}>Số phiếu này phải xuất hiện trên tất cả các chứng từ giao<br />nhận, hóa đơn và kiện hàng.</td></tr>
            <tr>
              <td style={{ border: "1px solid #94a3b8", padding: "6px 14px", fontWeight: 800, fontSize: 12, textAlign: "center", background: "#f8fafc" }}>NGÀY ĐẶT HÀNG</td>
              <td style={{ border: "1px solid #94a3b8", padding: "6px 14px", fontWeight: 800, fontSize: 12, textAlign: "center", background: "#f8fafc" }}>SỐ ĐƠN HÀNG</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #94a3b8", padding: "7px 14px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>{ngayStr}</td>
              <td style={{ border: "1px solid #94a3b8", padding: "7px 14px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>{poDraft}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Supplier / Delivery */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead><tr>
          <th style={{ ...secHead, width: "50%", textAlign: "center" }}>NHÀ CUNG CẤP</th>
          <th style={{ ...secHead, width: "50%", textAlign: "center" }}>GIAO HÀNG ĐẾN</th>
        </tr></thead>
        <tbody><tr>
          <td style={{ ...bodyCell, verticalAlign: "top", padding: "10px 12px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase" }}>{supName}</p>
            {supplier?.address && <p style={{ margin: 0 }}>{supplier.address}</p>}
            {supplier?.taxCode && <p style={{ margin: 0 }}>MST: {supplier.taxCode}</p>}
            <p style={{ margin: 0 }}>Người liên hệ: {supplier?.contactName ?? "---"}</p>
            <p style={{ margin: 0 }}>Số điện thoại: {supplier?.phone ?? "—"}</p>
          </td>
          <td style={{ ...bodyCell, verticalAlign: "top", padding: "10px 12px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase" }}>{companyName}</p>
            <p style={{ margin: 0 }}>{diaDiemGiaoHang || company?.address || "—"}</p>
            <p style={{ margin: 0 }}>Người nhận: {nguoiNhan || company?.legalRep || "—"}</p>
            <p style={{ margin: 0 }}>Số điện thoại: {sdtNhan || company?.phone || "—"}</p>
          </td>
        </tr></tbody>
      </table>

      {/* Shipping/Payment */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead><tr>
          {["PHƯƠNG THỨC VẬN CHUYỂN", "HÌNH THỨC GIAO HÀNG", "THANH TOÁN"].map(h => (
            <th key={h} style={{ ...secHead, width: "33.33%", textAlign: "center" }}>{h}</th>
          ))}
        </tr></thead>
        <tbody><tr>
          <td style={{ ...bodyCell, textAlign: "center" }}>{phuongTien}</td>
          <td style={{ ...bodyCell, textAlign: "center" }}>{hinhThucGH}</td>
          <td style={{ ...bodyCell, textAlign: "center" }}>{hinhThucTT}</td>
        </tr></tbody>
      </table>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr style={{ background: "#f1f5f9", borderTop: "1.5px solid #94a3b8", borderBottom: "1.5px solid #94a3b8" }}>
            {[{ h: "STT", w: 36, c: true }, { h: "TÊN HÀNG / MÔ TẢ", w: 0, c: false }, { h: "ĐVT", w: 50, c: true }, { h: "SỐ LƯỢNG", w: 70, c: true }, { h: "ĐƠN GIÁ", w: 90, c: true }, { h: "THÀNH TIỀN", w: 96, c: true }].map(col => (
              <th key={col.h} style={{ ...secHead, border: "none", borderBottom: "1.5px solid #94a3b8", textAlign: col.c ? "center" : "left", width: col.w || undefined, fontSize: 11 }}>{col.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderItems.map((x, idx) => {
            const thanhTien = x.item!.soLuong * x.donGia;
            const rowBorder: React.CSSProperties = { border: "none", borderBottom: "1px solid #e2e8f0" };
            return (
              <tr key={x.itemId} style={{ background: idx % 2 === 1 ? "#f8fafc" : "#fff" }}>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                <td style={{ ...bodyCell, ...rowBorder }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{x.item!.tenHang}</p>
                  {x.item!.inventoryItem?.thongSoKyThuat && <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#475569", fontStyle: "italic" }}>{x.item!.inventoryItem.thongSoKyThuat}</p>}
                  {x.ngayGiao && <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#64748b" }}>Ngày giao: {fmtDate(x.ngayGiao)}</p>}
                </td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "center" }}>{x.item!.donVi ?? "—"}</td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "center", fontWeight: 700 }}>{x.item!.soLuong.toLocaleString()}</td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "right" }}>{fmtVnd(x.donGia)}</td>
                <td style={{ ...bodyCell, ...rowBorder, textAlign: "right", fontWeight: 700 }}>{fmtVnd(thanhTien)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Notes + Totals */}
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 28 }}>
        <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 5px", fontWeight: 700 }}>GHI CHÚ QUAN TRỌNG:</p>
          {[
            "1. Vui lòng ghi xác nhận đơn hàng trong vòng 24 giờ sau khi nhận được PO này.",
            "2. Hàng hóa phải được giao đúng số lượng, quy cách và thời gian đã cam kết.",
            "3. Hóa đơn GTGT phải được xuất đúng theo thông tin công ty và gửi kèm khi giao hàng.",
            "4. Mọi thay đổi phải được thông báo và chấp thuận bằng văn bản trước khi giao hàng.",
          ].map(n => <p key={n} style={{ margin: 0 }}>{n}</p>)}
          {ghiChu && <p style={{ margin: "8px 0 0", color: "#1d4ed8", fontWeight: 600 }}>• Ghi chú: {ghiChu}</p>}
        </div>
        <div style={{ width: 240, flexShrink: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ padding: "5px 6px", fontSize: 12.5 }}>Cộng tiền hàng:</td><td style={{ padding: "5px 6px", fontSize: 12.5, textAlign: "right" }}>{fmtVnd(tongTienHang)} đ</td></tr>
              <tr><td style={{ padding: "5px 6px", fontSize: 12.5 }}>Thuế GTGT ({thueVAT}%):</td><td style={{ padding: "5px 6px", fontSize: 12.5, textAlign: "right" }}>{fmtVnd(tienThue)} đ</td></tr>
              <tr style={{ borderTop: "1.5px solid #1e293b" }}>
                <td style={{ padding: "6px 6px", fontSize: 13.5, fontWeight: 800, color: "#1d4ed8" }}>TỔNG CỘNG:</td>
                <td style={{ padding: "6px 6px", fontSize: 13.5, fontWeight: 800, color: "#1d4ed8", textAlign: "right" }}>{fmtVnd(tongCong)} đ</td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: "6px 6px 0", fontSize: 10.5, fontStyle: "italic", color: "#64748b" }}>(Bằng chữ: {soThanhChu(tongCong)})</p>
        </div>
      </div>

      {/* Signatures */}
      <p style={{ textAlign: "right", fontSize: 12, fontStyle: "italic", marginBottom: 24 }}>
        Ngày {ngayStr.split("/")[0]} tháng {ngayStr.split("/")[1]} năm {ngayStr.split("/")[2]}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", paddingBottom: 24 }}>
        {[{ role: "NGƯỜI LẬP PHIẾU", note: "(Ký, ghi rõ họ tên)" }, { role: "KẾ TOÁN TRƯỞNG", note: "(Ký, ghi rõ họ tên)" }, { role: "GIÁM ĐỐC", note: "(Ký, ghi rõ họ tên và đóng dấu)" }].map(s => (
          <div key={s.role} style={{ flex: 1, padding: "0 20px" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.02em" }}>{s.role}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#64748b", fontStyle: "italic" }}>{s.note}</p>
            <div style={{ marginTop: 60, height: 1, background: "#000" }} />
          </div>
        ))}
      </div>
    </>
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions = (
    <>
      {saveMsg && <span style={{ fontSize: 12.5, color: "#6ee7b7", fontWeight: 600 }}>{saveMsg}</span>}
      <button
        onClick={handleSave}
        disabled={saving || submitting}
        style={{ padding: "8px 18px", border: "1px solid #3b82f6", background: "transparent", color: "#93c5fd", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (saving || submitting) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, opacity: (saving || submitting) ? 0.7 : 1 }}
      >
        {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} />Đang lưu...</> : <><i className="bi bi-floppy" />Lưu đơn đặt hàng</>}
      </button>
      <button
        onClick={handlePrint}
        disabled={submitting || saving}
        style={{ padding: "8px 22px", border: "none", background: "#10b981", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (submitting || saving) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, opacity: (submitting || saving) ? 0.7 : 1 }}
      >
        {submitting ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} />Đang tạo...</> : <><i className="bi bi-printer" />Xác nhận & In</>}
      </button>
    </>
  );

  return (
    <PrintPreviewModal
      title="Xem trước Đơn đặt hàng"
      subtitle={<>NCC: <strong style={{ color: "#e2e8f0" }}>{supName}</strong>&nbsp;·&nbsp;Từ phiếu YC: <span style={{ color: "#38bdf8" }}>{reqCode ?? reqId}</span></>}
      actions={actions}
      sidebar={sidebar}
      document={doc}
      onClose={onClose}
      documentId="po-document"
    />
  );
}
