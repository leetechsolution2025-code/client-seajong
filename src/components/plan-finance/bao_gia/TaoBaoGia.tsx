"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CustomerRow = {
  id: string; name: string; nhom: string | null; nguon: string | null;
  dienThoai: string | null; email: string | null;
  address: string | null; daiDien: string | null; xungHo: string | null;
  chucVu: string | null; ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

export type QuoteItem = {
  id: number; ten: string; dvt: string; soLuong: number;
  donGia: number; ckPct: number; soLuongTon: number | null;
  trangThaiKho: string | null; inventoryId: string | null
};

export interface QuotationEditData {
  id: string;
  code: string | null;
  ngayBaoGia: string | null;
  ngayHetHan: string | null;
  trangThai: string;
  uuTien: string;
  discount?: number | null;
  vat?: number | null;
  tongTien?: number | null;
  thanhTien?: number | null;
  ghiChu?: string | null;
  items?: Array<{
    tenHang: string; donVi?: string;
    soLuong?: number; donGia?: number; thanhTien?: number;
  }>;
}

// ── Helper: số → chữ (VND) ─────────────────────────────────────────────────
export function numberToVNWords(n: number): string {
  if (n === 0) return "Không đồng";
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
  function readHundred(h: number): string {
    const c = Math.floor(h / 100), t = Math.floor((h % 100) / 10), u = h % 10;
    let r = c > 0 ? ones[c] + " trăm" : "";
    if (t === 1) r += (r ? " " : "") + teens[u];
    else if (t > 1) r += (r ? " " : "") + ones[t] + " mươi" + (u > 0 ? " " + (u === 5 ? "lăm" : ones[u]) : "");
    else if (u > 0 && c > 0) r += " lẻ " + ones[u];
    else if (u > 0) r += ones[u];
    return r;
  }
  const groups = [
    { v: 1_000_000_000, s: "tỷ" }, { v: 1_000_000, s: "triệu" },
    { v: 1_000, s: "nghìn" }, { v: 1, s: "" },
  ];
  let result = "", num = Math.round(n);
  for (const g of groups) {
    const q = Math.floor(num / g.v);
    if (q > 0) {
      result += (result ? " " : "") + readHundred(q) + (g.s ? " " + g.s : "");
      num %= g.v;
    }
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

// ── Privates helpers/styles ──────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
  fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
  transition: "border-color 0.15s",
};
const FLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

// ── Print Preview Modal ─────────────────────────────────────────────────────
function PrintPreviewModal({ open, onClose, customer, items, info }: any) {
  const [landscape, setLandscape] = React.useState(false);
  const [company, setCompany] = React.useState<any>({});

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/company").then(r => r.json()).then(setCompany).catch(() => { });
  }, [open]);

  if (!open) return null;

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const thanhTien = (it: any) => it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s: any, it: any) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
  };

  const paperW = landscape ? 297 : 210;
  const paperH = landscape ? 210 : 297;
  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
        @media print {
          body > *:not(#print-preview-root) { display: none !important; }
          #print-preview-root { position: fixed; inset: 0; }
          .no-print { display: none !important; }
          .print-paper {
            width: ${paperW}mm !important; height: ${paperH}mm !important;
            box-shadow: none !important; margin: 0 !important;
            page-break-after: always;
          }
        }
      `}</style>
      <div id="print-preview-root" style={{ position: "fixed", inset: 0, zIndex: 4000, background: "#e8eaed", display: "flex", flexDirection: "column" }}>
        <div className="no-print" style={{ height: 52, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Xem trước báo giá</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d1d5db", fontSize: 13 }}>
              <span>Khổ giấy:</span>
              {(["Dọc", "Ngang"] as const).map((label, i) => (
                <button key={label} onClick={() => setLandscape(i === 1)}
                  style={{
                    padding: "4px 12px", border: "1px solid", borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: landscape === (i === 1) ? "#3b82f6" : "transparent",
                    borderColor: "#4b5563", color: landscape === (i === 1) ? "#fff" : "#9ca3af",
                  }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #4b5563", background: "transparent", color: "#d1d5db", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Đóng</button>
            <button onClick={handlePrint} style={{ padding: "6px 18px", border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-printer" style={{ fontSize: 13 }} /> In ngay
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 24px" }}>
          <div className="print-paper" style={{ width: `${paperW}mm`, minHeight: `${paperH}mm`, background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.18)", padding: "14mm 15mm", fontSize: 10, lineHeight: 1.5, fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif", color: "#111" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #1d4ed8" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 10.5, color: "#1d4ed8", textTransform: "uppercase" }}>{company.name ?? "Công ty"}</div>
                  {company.address && <div style={{ fontSize: 9, color: "#374151", marginTop: 1 }}>Địa chỉ: {company.address}</div>}
                  {(company.phone || company.email) && <div style={{ fontSize: 9, color: "#374151", display: "flex", gap: 12 }}>{company.phone && <span>Điện thoại: {company.phone}</span>}{company.email && <span>Email: {company.email}</span>}</div>}
                  {company.taxCode && <div style={{ fontSize: 9, color: "#374151" }}>MST: {company.taxCode}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1, color: "#111" }}>BẢNG BÁO GIÁ</div>
                <div style={{ fontSize: 9, color: "#374151", marginTop: 3 }}>Số: <strong>{info.soPhieu}</strong></div>
                <div style={{ fontSize: 9, color: "#374151" }}>Ngày lập: {fmtDate(info.ngayLap)}</div>
                <div style={{ fontSize: 9, color: "#374151" }}>Hiệu lực đến: {fmtDate(info.hieuLuc)}</div>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 10, textTransform: "uppercase", color: "#1d4ed8", borderLeft: "3px solid #1d4ed8", paddingLeft: 6, marginBottom: 5 }}>Thông tin khách hàng</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px", fontSize: 9.5 }}>
                <div><strong>Đơn vị:</strong> {customer?.name ?? "—"}</div>
                <div><strong>Người liên hệ:</strong> {customer?.daiDien ? `${customer.xungHo ?? ""} ${customer.daiDien}` : "—"}</div>
                <div><strong>Địa chỉ:</strong> {customer?.address ?? "—"}</div>
                <div><strong>Điện thoại:</strong> {customer?.dienThoai ?? "—"}</div>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 9.5 }}>
              <thead>
                <tr style={{ background: "#1d4ed8", color: "#fff" }}>
                  {["STT", "Tên hàng hoá - Dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"].map((h, i) => (
                    <th key={h} style={{ padding: "5px 6px", textAlign: (i===1?"left":i===0||i===2||i===3?"center":"right"), fontWeight: 700, border: "1px solid #93c5fd" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.filter((it: any) => it.ten).map((it: any, idx: number) => (
                  <tr key={it.id} style={{ background: idx % 2 === 0 ? "#fff" : "#eff6ff" }}>
                    <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{idx + 1}</td>
                    <td style={{ padding: "4px 6px", border: "1px solid #dbeafe" }}>{it.ten}</td>
                    <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{it.dvt}</td>
                    <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{it.soLuong.toLocaleString("vi-VN")}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #dbeafe" }}>{fmt(it.donGia)}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, border: "1px solid #dbeafe" }}>{fmt(thanhTien(it))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 16 }}>
              <div style={{ fontSize: 9 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 9.5 }}>ĐIỀU KHOẢN THAM CHIẾU</div>
                {info.dieuKhoanTT && <div style={{ marginBottom: 3, color: "#374151" }}>- {info.dieuKhoanTT}</div>}
                {info.dieuKhoanGH && <div style={{ marginBottom: 3, color: "#374151" }}>- {info.dieuKhoanGH}</div>}
                {info.ghiChu && <div style={{ color: "#374151", marginTop: 4, whiteSpace: "pre-line" }}>{info.ghiChu}</div>}
              </div>
              <div style={{ fontSize: 9.5 }}>
                {[["Tổng tiền hàng (đ):", fmt(tamTinh)], [`Chiết khấu (${info.chietKhauTong}%):`, fmt(ckTien)], [`Thuế VAT (${info.thue}%):`, fmt(thueTien)]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #e5e7eb" }}><span>{l}</span><strong>{v}</strong></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "2px solid #1d4ed8", marginTop: 2 }}><span style={{ fontWeight: 800 }}>TỔNG CỘNG:</span><span style={{ fontWeight: 900, color: "#1d4ed8" }}>{fmt(tongCong)}</span></div>
                <div style={{ fontSize: 8.5, fontStyle: "italic", textAlign: "right" }}>({numberToVNWords(tongCong)})</div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ textAlign: "center", minWidth: 140, fontSize: 9.5 }}>
                <div style={{ fontWeight: 700 }}>ĐẠI DIỆN CÔNG TY</div>
                <div style={{ fontStyle: "italic", fontSize: 9, color: "#6b7280" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ height: 40 }} />
                {company.legalRep && <div style={{ fontWeight: 700 }}>{company.legalRep}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main TaoBaoGia Component ──────────────────────────────────────────
export function TaoBaoGia({ open, onClose, customer, editData, onSaved }: {
  open: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
  editData?: QuotationEditData | null;
  onSaved?: () => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];

  const [info, setInfo] = React.useState({
    soPhieu: genDocCode("BG"),
    ngayLap: fmtDate(today),
    hieuLuc: fmtDate(new Date(today.getTime() + 30 * 24 * 3600 * 1000)),
    dieuKhoanTT: "Thanh toán 100% trước khi giao hàng",
    dieuKhoanGH: "Giao hàng trong vòng 7 ngày làm việc",
    ghiChu: "",
    chietKhauTong: 0,
    thue: 10,
  });

  const [printOpen, setPrintOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [pheduyet, setPheduyet] = React.useState(false);
  const [approverId, setApproverId] = React.useState("");
  const [approvers, setApprovers] = React.useState<any[]>([]);
  const [loadingApp, setLoadingApp] = React.useState(false);
  const [uuTienCao, setUuTienCao] = React.useState(false);

  const toast = useToast();
  const { data: session } = useSession();
  const nextId = React.useRef(1);
  const [items, setItems] = React.useState<QuoteItem[]>([
    { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null },
  ]);

  // Load dữ liệu khi mở ở edit mode
  React.useEffect(() => {
    if (!open) return;
    if (editData?.id) {
      const fmtD = (s: string | null | undefined) => s ? new Date(s).toISOString().split("T")[0] : "";
      setInfo(f => ({
        ...f,
        soPhieu:    editData.code ?? f.soPhieu,
        ngayLap:    fmtD(editData.ngayBaoGia) || f.ngayLap,
        hieuLuc:    fmtD(editData.ngayHetHan) || f.hieuLuc,
        chietKhauTong: editData.discount ?? 0,
        thue:          editData.vat      ?? 10,
        ghiChu:        editData.ghiChu   ?? "",
        dieuKhoanTT: f.dieuKhoanTT,
        dieuKhoanGH: f.dieuKhoanGH,
      }));
      setUuTienCao(editData.uuTien === "high");
      if (Array.isArray(editData.items) && editData.items.length > 0) {
        setItems(editData.items.map((it, i) => ({
          id: i + 1,
          ten: it.tenHang ?? "",
          dvt: it.donVi   ?? "",
          soLuong: it.soLuong ?? 1,
          donGia:  it.donGia  ?? 0,
          ckPct: 0,
          soLuongTon: null, trangThaiKho: null, inventoryId: null,
        })));
        nextId.current = (editData.items.length ?? 0) + 1;
      }
    } else {
      // Reset về trạng thái mới khi không phải edit
      const t = new Date();
      const fd = (d: Date) => d.toISOString().split("T")[0];
      setInfo({ soPhieu: genDocCode("BG"), ngayLap: fd(t), hieuLuc: fd(new Date(t.getTime() + 30*24*3600_000)), dieuKhoanTT: "Thanh toán 100% trước khi giao hàng", dieuKhoanGH: "Giao hàng trong vòng 7 ngày làm việc", ghiChu: "", chietKhauTong: 0, thue: 10 });
      setUuTienCao(false);
      setItems([{ id: 1, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null }]);
      nextId.current = 2;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editData?.id]);

  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [activeRowId, setActiveRowId] = React.useState<number | null>(null);
  const suggestTimer = React.useRef<any>(null);
  const activeRowIdRef = React.useRef<number | null>(null);

  const setActiveRowIdSync = (id: number | null) => { activeRowIdRef.current = id; setActiveRowId(id); };

  React.useEffect(() => {
    if (!pheduyet || approvers.length > 0) return;
    setLoadingApp(true);
    fetch("/api/plan-finance/approvers").then(r => r.json()).then(d => setApprovers(d.approvers ?? [])).catch(() => setApprovers([])).finally(() => setLoadingApp(false));
  }, [pheduyet]);

  const fetchSuggest = React.useCallback((query: string, rowId: number) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query.trim() || query.length < 2) { setSuggest([]); return; }
    suggestTimer.current = setTimeout(() => {
      fetch(`/api/plan-finance/inventory?search=${encodeURIComponent(query)}&page=1`)
        .then(r => r.json()).then(d => { if (activeRowIdRef.current === rowId) setSuggest(d.items ?? []); }).catch(() => setSuggest([]));
    }, 300);
  }, []);

  const applySuggest = (rowId: number, item: any) => {
    const soLuongTon = item.soLuongThuc ?? item.soLuong;
    setItems(r => r.map(x => x.id === rowId ? { ...x, ten: item.tenHang, dvt: item.donVi ?? "", donGia: item.giaBan, soLuongTon, trangThaiKho: item.trangThai, inventoryId: item.id } : x));
    setSuggest([]);
    setActiveRowIdSync(null);
  };

  const setInfoField = (k: string) => (e: any) => setInfo(f => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  const addRow = () => setItems(r => [...r, { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null }]);
  const removeRow = (id: number) => setItems(r => r.filter(x => x.id !== id));
  const updateRow = (id: number, f: string, v: any) => setItems(r => r.map(x => x.id === id ? { ...x, [f]: v } : x));

  const thanhTien = (it: QuoteItem) => it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s, it) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien;

  const handleSave = async (mode: "draft" | "submit" = "submit") => {
    if (!info.soPhieu.trim()) { setSaveError("Vui lòng nhập số báo giá"); return; }
    if (mode === "submit" && pheduyet && !approverId) { setSaveError("Vui lòng chọn người phê duyệt"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const trangThai =
        mode === "draft"  ? "draft" :
        pheduyet          ? "pending_approval" : "approved";

      const payload = {
        code: info.soPhieu.trim(), ngayBaoGia: info.ngayLap, ngayHetHan: info.hieuLuc,
        trangThai, uuTien: uuTienCao ? "high" : "medium",
        tongTien: tamTinh, discount: info.chietKhauTong, vat: info.thue, thanhTien: tongCong,
        ghiChu: [info.ghiChu, info.dieuKhoanTT ? `ĐKTT: ${info.dieuKhoanTT}` : "", info.dieuKhoanGH ? `ĐKGH: ${info.dieuKhoanGH}` : ""].filter(Boolean).join("\n"),
        approverId: (mode === "submit" && pheduyet) ? approverId : undefined,
        items: items.filter(it => it.ten.trim()).map((it, idx) => ({ tenHang: it.ten.trim(), donVi: it.dvt || "cái", soLuong: it.soLuong, donGia: it.donGia, thanhTien: thanhTien(it), sortOrder: idx })),
      };

      let res: Response;
      if (editData?.id) {
        // Chế độ sửa
        res = await fetch(`/api/plan-finance/quotations/${editData.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        // Chế độ tạo mới
        res = await fetch("/api/plan-finance/quotations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, customerId: customer?.id ?? null }),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi lưu báo giá");

      // Ghi lịch sử sau khi sửa thành công
      if (editData?.id) {
        const STATUS_LABEL: Record<string, string> = {
          draft: "Nháp", pending_approval: "Đang trình duyệt",
          approved: "Đã phê duyệt", sent: "Đã gửi KH",
          won: "Thành công", lost: "Thất bại", cancelled: "Đã huỷ",
        };
        const nguoiThucHien = session?.user?.name ?? "Hệ thống";
        const validItems = items.filter(it => it.ten.trim());
        const ketQua = [
          `Đã cập nhật báo giá ${info.soPhieu}`,
          `• Trạng thái: ${STATUS_LABEL[trangThai] ?? trangThai}`,
          `• Ưu tiên: ${uuTienCao ? "Cao" : "Thường"}`,
          `• Hiệu lực: ${info.ngayLap} → ${info.hieuLuc}`,
          `• Tổng cộng: ${tongCong.toLocaleString("vi-VN")} ₫ (${validItems.length} mặt hàng)`,
        ].join("\n");
        fetch(`/api/plan-finance/quotations/${editData.id}/negotiations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai: "system",
            ngay: new Date().toISOString().slice(0, 10),
            nguoiThucHien,
            ketQua,
          }),
        }).catch(() => {}); // fire and forget
      }

      if (mode === "draft") {
        toast.success("Lưu nháp", `Báo giá ${info.soPhieu} đã được lưu nháp`);
      } else if (pheduyet) {
        toast.success("Đang trình duyệt", `Báo giá ${info.soPhieu} đã gửi cho người phê duyệt`, 5000);
      } else {
        toast.success(editData?.id ? "Đã cập nhật" : "Đã phê duyệt", `Báo giá ${info.soPhieu} đã được ${editData?.id ? "cập nhật" : "xác nhận"}`, 5000);
      }
      onSaved?.();
      onClose();
    } catch (e: any) { setSaveError(e.message); toast.error("Lỗi", e.message); }
    finally { setSaving(false); }
  };


  const fmt = (n: number) => n.toLocaleString("vi-VN");

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#1E293B", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-file-earmark-text" style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div><p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "0.01em" }}>{editData?.id ? "Sửa báo giá" : "Lập báo giá"}</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && <span style={{ fontSize: 12, color: "#fca5a5", alignSelf: "center" }}><i className="bi bi-exclamation-circle" /> {saveError}</span>}
          <button onClick={() => setPrintOpen(true)} style={{ padding: "6px 16px", border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", backdropFilter: "blur(4px)" }}>In / Xuất PDF</button>
          <button onClick={() => handleSave("draft")} disabled={saving} style={{ padding: "6px 16px", border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.08)", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: "#fff", opacity: saving ? 0.6 : 1 }}>
            <i className="bi bi-file-earmark" style={{ marginRight: 5, fontSize: 12 }} />Lưu nháp
          </button>
          <button onClick={() => handleSave("submit")} disabled={saving} style={{ padding: "6px 20px", background: "#fff", color: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Đang lưu..." : pheduyet ? "📤 Trình duyệt" : "✔ Xác nhận báo giá"}
          </button>
          <button onClick={onClose} style={{ width: 34, height: 34, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><i className="bi bi-x" style={{ fontSize: 18 }} /></button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Side: Info */}
        <div style={{ width: 400, flexShrink: 0, borderRight: "1px solid var(--border)", padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "var(--card)", overflowY: "auto" }}>
          <div><FLabel text="Số báo giá" required /><input value={info.soPhieu} onChange={setInfoField("soPhieu")} readOnly={!editData?.id} style={{ ...inputSt, background: editData?.id ? "var(--background)" : "var(--muted)", fontFamily: "monospace" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><FLabel text="Ngày lập" required /><input type="date" value={info.ngayLap} onChange={setInfoField("ngayLap")} style={inputSt} /></div>
            <div><FLabel text="Hiệu lực đến" /><input type="date" value={info.hieuLuc} onChange={setInfoField("hieuLuc")} style={inputSt} /></div>
          </div>
          <div style={{ background: "var(--muted)", borderRadius: 10, padding: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Khách hàng</p>
            {customer?.nhom === "doanh-nghiep" || customer?.nhom === "doi-tac" ? (
              /* Doanh nghiệp / Đối tác */
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{customer?.name || "—"}</span>
                {customer?.address && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{customer.address}</span>
                  </div>
                )}
                {customer?.daiDien && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="bi bi-person-fill" style={{ fontSize: 11, color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {customer.xungHo ? `${customer.xungHo} ` : ""}{customer.daiDien}
                      {customer.chucVu && <span style={{ fontStyle: "italic", marginLeft: 4 }}>– {customer.chucVu}</span>}
                    </span>
                  </div>
                )}
                {(customer?.dienThoai || customer?.email) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                    {customer.dienThoai && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                        {customer.dienThoai}
                      </div>
                    )}
                    {customer.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-envelope-fill" style={{ fontSize: 10, color: "#6366f1" }} />
                        {customer.email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Cá nhân / Khách lẻ */
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                  {customer?.daiDien
                    ? `${customer.xungHo ? customer.xungHo + " " : ""}${customer.daiDien}`
                    : customer?.name || "—"}
                </span>
                {customer?.address && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{customer.address}</span>
                  </div>
                )}
                {(customer?.dienThoai || customer?.email) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                    {customer?.dienThoai && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                        {customer.dienThoai}
                      </div>
                    )}
                    {customer?.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-envelope-fill" style={{ fontSize: 10, color: "#6366f1" }} />
                        {customer.email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div><FLabel text="Điều khoản thanh toán" /><textarea rows={2} value={info.dieuKhoanTT} onChange={setInfoField("dieuKhoanTT")} style={{ ...inputSt, resize: "vertical" }} /></div>
          <div><FLabel text="Điều khoản giao hàng" /><textarea rows={2} value={info.dieuKhoanGH} onChange={setInfoField("dieuKhoanGH")} style={{ ...inputSt, resize: "vertical" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><FLabel text="Chiết khấu tổng (%)" /><input type="number" value={info.chietKhauTong} onChange={setInfoField("chietKhauTong")} style={inputSt} /></div>
            <div><FLabel text="Thuế VAT (%)" /><input type="number" value={info.thue} onChange={setInfoField("thue")} style={inputSt} /></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "8px 10px", background: uuTienCao ? "rgba(239,68,68,0.07)" : "var(--muted)", borderRadius: 8, border: `1px solid ${uuTienCao ? "rgba(239,68,68,0.3)" : "var(--border)"}`, transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <i className="bi bi-lightning-charge-fill" style={{ fontSize: 13, color: uuTienCao ? "#ef4444" : "var(--muted-foreground)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: uuTienCao ? "#ef4444" : "var(--foreground)" }}>Ưu tiên</span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{uuTienCao ? "— Có" : "— Không"}</span>
            </div>
            <div
              onClick={() => setUuTienCao(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, position: "relative", cursor: "pointer", transition: "background 0.2s",
                background: uuTienCao ? "#ef4444" : "var(--border)",
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: uuTienCao ? 19 : 3,
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </label>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <FLabel text="Ghi chú" />
            <textarea value={info.ghiChu} onChange={setInfoField("ghiChu")} style={{ ...inputSt, flex: 1, resize: "none", minHeight: 80 }} />
          </div>
        </div>

        {/* Right Side: Items Table */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bảng danh sách hàng hoá</span>
              <TrangThaiTonKhoBadge
                items={items.map(it => ({ ten: it.ten, soLuong: it.soLuong, soLuongTon: it.soLuongTon }))}
                showPurchaseRequest={false}
              />
            </div>
            {/* Phê duyệt switch */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={pheduyet} onChange={e => setPheduyet(e.target.checked)} /> Cần phê duyệt
              </label>
              {pheduyet && (
                <select value={approverId} onChange={e => setApproverId(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <option value="">— Chọn người phê duyệt —</option>
                  {approvers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: 10, width: 40 }}>#</th>
                  <th style={{ padding: 10 }}>Tên hàng hoá - Dịch vụ</th>
                  <th style={{ padding: 10, width: 70, textAlign: "center" }}>ĐVT</th>
                  <th style={{ padding: 10, width: 90, textAlign: "center" }}>Số lượng</th>
                  <th style={{ padding: 10, width: 130, textAlign: "right" }}>Đơn giá (đ)</th>
                  <th style={{ padding: 10, width: 130, textAlign: "right" }}>Thành tiền (đ)</th>
                  <th style={{ padding: 10, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                    <td style={{ padding: "6px 10px", position: "relative" }}>
                       {/* Icon tồn kho overlay bên phải input */}
                       {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
                         const ton = it.soLuongTon as number;
                         if (ton === 0) return (
                           <span title="Hết hàng" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#ef4444", pointerEvents: "none", display: "flex" }}>
                             <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                           </span>
                         );
                         if (it.soLuong > ton) return (
                           <span title={`Thiếu hàng (tồn: ${ton})`} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#f97316", pointerEvents: "none", display: "flex" }}>
                             <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 12 }} />
                           </span>
                         );
                         return null;
                       })()}
                       <input
                         value={it.ten}
                         placeholder="Nhập tên hoặc mã SKU..."
                         onChange={e => {
                           const v = e.target.value;
                           if (!v) {
                             // Xóa tên → reset toàn bộ dòng
                             setItems(r => r.map(x => x.id === it.id
                               ? { ...x, ten: "", dvt: "", donGia: 0, ckPct: 0, soLuong: 1, soLuongTon: null, trangThaiKho: null, inventoryId: null }
                               : x
                             ));
                             setSuggest([]);
                           } else {
                             updateRow(it.id, "ten", v);
                             setActiveRowIdSync(it.id);
                             fetchSuggest(v, it.id);
                           }
                         }}
                         onFocus={e => { setActiveRowIdSync(it.id); fetchSuggest(it.ten, it.id); e.currentTarget.style.border = "1px solid var(--primary)"; }}
                         onBlur={e => { e.currentTarget.style.border = "1px solid var(--border)"; setTimeout(() => { if (activeRowIdRef.current === it.id) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                         style={{ width: "100%", padding: 6, border: "1px solid var(--border)", background: "#fff", outline: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 13, color: "var(--foreground)", transition: "border-color 0.15s" }}
                       />
                      {activeRowId === it.id && suggest.length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                          {suggest.map(s => (
                             <div key={s.id} onClick={() => applySuggest(it.id, s)}
                               onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                               onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                               style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                             >
                               <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                               <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                                 {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                                 <span>Tồn: <b>{s.soLuongThuc ?? s.soLuong}</b> {s.donVi}</span>
                                 <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                               </div>
                             </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 6 }}><input value={it.dvt} onChange={e => updateRow(it.id, "dvt", e.target.value)} style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "center", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"} onBlur={e => e.currentTarget.style.borderColor = "var(--border)"} /></td>
                    <td style={{ padding: 6 }}><input type="number" value={it.soLuong} onChange={e => updateRow(it.id, "soLuong", Number(e.target.value))} style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"} onBlur={e => e.currentTarget.style.borderColor = "var(--border)"} /></td>
                    <td style={{ padding: 6 }}>
                      <CurrencyInput
                        value={it.donGia}
                        onChange={v => updateRow(it.id, "donGia", v)}
                        placeholder="0"
                        style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }}
                      />
                    </td>
                    <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmt(thanhTien(it))}</td>
                    <td style={{ padding: 6 }}><button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><i className="bi bi-trash" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addRow} style={{ marginTop: 10, padding: "6px 14px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 6, cursor: "pointer", color: "var(--foreground)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}><i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> Thêm dòng</button>
          </div>

          <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 32, background: "var(--card)" }}>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Tạm tính</p><p style={{ margin: 0, fontWeight: 700 }}>{fmt(tamTinh)} ₫</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Khấu trừ</p><p style={{ margin: 0, fontWeight: 700 }}>− {fmt(ckTien)} ₫</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Thuế</p><p style={{ margin: 0, fontWeight: 700 }}>+ {fmt(thueTien)} ₫</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--primary)" }}>TỔNG CỘNG</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--primary)" }}>{fmt(tongCong)} ₫</p></div>
          </div>
        </div>
      </div>
      <PrintPreviewModal open={printOpen} onClose={() => setPrintOpen(false)} customer={customer} items={items} info={info} />
    </div>
  );
}
