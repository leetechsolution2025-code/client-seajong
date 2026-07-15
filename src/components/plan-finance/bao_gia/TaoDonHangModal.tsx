"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CustomerRow = {
  id: string;
  name: string;
  nhom: string | null;
  nguon: string | null;
  dienThoai: string | null;
  email: string | null;
  address: string | null;
  daiDien: string | null;
  xungHo: string | null;
  chucVu: string | null;
  ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: number;
  ten: string;
  dvt: string;
  soLuong: number;
  donGia: number;
  ckPct: number;
  soLuongTon: number | null;
  trangThaiKho: string | null;
  inventoryId: string | null;
  imageUrl?: string | null;
  code?: string | null;
  dinhMucs?: any[];
  dinhMucId?: string | null;
  dinhMucTen?: string | null;
  khoTen?: string | null;
  source?: string;
};

// Helper: number to words (VND)
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

// ── Main TaoDonHangModal Component ──────────────────────────────────────────
export function TaoDonHangModal({ open, onClose, customer, onSaved, type = "agency", editOrder }: {
  open: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
  onSaved?: () => void;
  type?: string;
  editOrder?: any;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const defaultNgayLap = fmtDate(today);

  const [info, setInfo] = React.useState({
    soPhieu: genDocCode("DH"),
    ngayLap: defaultNgayLap,
    ngayGiaoHang: defaultNgayLap,
    tenNguoiNhan: "",
    sdtNguoiNhan: "",
    diaChiGiaoHang: "",
    ghiChu: "",
    chietKhauTong: 0,
    thue: 10,
  });

  const [showInfoSidebar, setShowInfoSidebar] = React.useState(false);

  const [custInfo, setCustInfo] = React.useState({
    id: customer?.id || "",
    name: customer?.name || "",
    dienThoai: customer?.dienThoai || "",
    address: customer?.address || "",
    nhom: customer?.nhom || "ca-nhan",
    nguon: customer?.nguon || null,
  });

  // Sync customer details when passed
  React.useEffect(() => {
    if (customer && !editOrder) {
      setCustInfo({
        id: customer.id || "",
        name: customer.name || "",
        dienThoai: customer.dienThoai || "",
        address: customer.address || "",
        nhom: customer.nhom || "ca-nhan",
        nguon: customer.nguon || null,
      });
      setInfo(prev => ({
        ...prev,
        diaChiGiaoHang: customer.address || "",
      }));
    }
  }, [customer, editOrder]);

  React.useEffect(() => {
    if (open && editOrder) {
      let rawGhiChu = editOrder.ghiChu || "";
      let tenNguoiNhan = "";
      let sdtNguoiNhan = "";
      let diaChiGiaoHang = "";

      const guestMatch = rawGhiChu.match(/\[GuestInfo:(.*?)\]/);
      if (guestMatch) {
        try {
          const parsed = JSON.parse(guestMatch[1]);
          tenNguoiNhan = parsed.name || tenNguoiNhan;
          sdtNguoiNhan = parsed.dienThoai || sdtNguoiNhan;
          diaChiGiaoHang = parsed.address || diaChiGiaoHang;
          rawGhiChu = rawGhiChu.replace(/\[GuestInfo:.*?\]\n?/, "");
        } catch(e) {}
      }

      const lines = rawGhiChu.split("\n");
      const remainingLines = [];
      for (const line of lines) {
        if (line.startsWith("Tên khách hàng: ")) { tenNguoiNhan = line.replace("Tên khách hàng: ", ""); continue; }
        if (line.startsWith("Số điện thoại: ")) { sdtNguoiNhan = line.replace("Số điện thoại: ", ""); continue; }
        if (line.startsWith("Địa chỉ giao hàng: ")) { diaChiGiaoHang = line.replace("Địa chỉ giao hàng: ", ""); continue; }
        remainingLines.push(line);
      }
      rawGhiChu = remainingLines.join("\n").trim();

      setInfo(prev => ({
        ...prev,
        soPhieu: editOrder.code || editOrder.id,
        ngayLap: editOrder.ngayDat ? new Date(editOrder.ngayDat).toISOString().split("T")[0] : prev.ngayLap,
        ngayGiaoHang: editOrder.ngayGiao ? new Date(editOrder.ngayGiao).toISOString().split("T")[0] : prev.ngayGiaoHang,
        ghiChu: rawGhiChu,
        tenNguoiNhan,
        sdtNguoiNhan,
        diaChiGiaoHang
      }));
      if (editOrder.customer) {
        setCustInfo({
          id: editOrder.customer.id || "",
          name: editOrder.customer.name || "",
          dienThoai: editOrder.customer.dienThoai || "",
          address: editOrder.customer.address || "",
          nhom: editOrder.customer.nhom || "ca-nhan",
          nguon: editOrder.customer.nguon || null,
        });
      }
      if (editOrder.items && editOrder.items.length > 0) {
        setItems(editOrder.items.map((it: any) => ({
          id: nextId.current++,
          ten: it.tenHang || "",
          dvt: it.donVi || "cái",
          soLuong: Number(it.soLuong) || 1,
          donGia: Number(it.donGia) || 0,
          ckPct: 0,
          soLuongTon: null,
          trangThaiKho: null,
          inventoryId: null,
          code: null,
          khoTen: (() => {
            try { return JSON.parse(it.ghiChu || "{}").khoTen || ""; } catch { return ""; }
          })()
        })));
      }
    }
  }, [open, editOrder]);

  const [debtInfo, setDebtInfo] = React.useState<{ outstandingDebt: number; creditLimit: number } | null>(null);
  const [isCustomerNew, setIsCustomerNew] = React.useState(true);

  // Fetch outstanding debt & credit limit info
  React.useEffect(() => {
    if (!open) return;
    if (custInfo.id) {
      setIsCustomerNew(false);
      fetch(`/api/plan-finance/customers/${custInfo.id}`)
        .then(async res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data) {
            setDebtInfo({
              outstandingDebt: data.outstandingDebt || 0,
              creditLimit: data.creditLimit || 0
            });
          } else {
            setDebtInfo(null);
          }
        })
        .catch(() => {
          setDebtInfo(null);
        });
    } else {
      setDebtInfo(null);
    }
  }, [custInfo.id, open]);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const nextId = React.useRef(1);
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [formItem, setFormItem] = React.useState<OrderItem>({
    id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: ""
  });

  const [showBomDetail, setShowBomDetail] = React.useState(false);
  const [bomDetailData, setBomDetailData] = React.useState<any>(null);
  const [loadingBom, setLoadingBom] = React.useState(false);

  React.useEffect(() => {
    if (showBomDetail && formItem.dinhMucId) {
      setLoadingBom(true);
      fetch(`/api/production/bom/${formItem.dinhMucId}`)
        .then(res => res.json())
        .then(data => setBomDetailData(data))
        .catch(console.error)
        .finally(() => setLoadingBom(false));
    } else if (!showBomDetail) {
      setBomDetailData(null);
    }
  }, [showBomDetail, formItem.dinhMucId]);

  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [activeRowId, setActiveRowId] = React.useState<number | null>(null);
  const activeRowIdRef = React.useRef<number | null>(null);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveRowIdSync = (id: number | null) => {
    activeRowIdRef.current = id;
    setActiveRowId(id);
  };

  const fetchSuggest = React.useCallback((query: string, rowId: number) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query.trim() || query.length < 2) {
      setSuggest([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&limit=20&includeManufactured=true`)
        .then(r => r.json())
        .then(d => {
          if (activeRowIdRef.current === rowId) {
            const filtered = (d.items ?? []).filter((item: any) => {
              const khoTenStr = (item.stocks && item.stocks.length > 0 && item.stocks[0].warehouse?.name) 
                ? item.stocks[0].warehouse.name 
                : (item.source === "manufactured" ? "Kho thành phẩm" 
                   : item.source === "inventory" ? "Kho hàng hoá" 
                   : item.source === "material" ? "Kho vật tư và phụ kiện" : "");
              return khoTenStr.toLowerCase().includes("kho hàng hoá") || khoTenStr.toLowerCase().includes("kho thành phẩm") || khoTenStr.toLowerCase().includes("vật tư");
            });
            setSuggest(filtered);
          }
        })
        .catch(() => setSuggest([]));
    }, 300);
  }, []);

  const applySuggest = (rowId: number, item: any) => {
    const soLuongTon = item.soLuongThuc ?? item.soLuong;
    const defaultDinhMuc = item.dinhMucs?.length > 0 ? item.dinhMucs[0] : null;
    const khoTenStr = (item.stocks && item.stocks.length > 0 && item.stocks[0].warehouse?.name) 
      ? item.stocks[0].warehouse.name 
      : (item.source === "manufactured" ? "Kho thành phẩm" 
         : item.source === "inventory" ? "Kho hàng hoá" 
         : item.source === "material" ? "Kho vật tư và phụ kiện" : "");

    const updatePayload = {
      ten: item.tenHang,
      khoTen: khoTenStr,
      dvt: item.donVi ?? "cái",
      donGia: defaultDinhMuc ? (defaultDinhMuc.giaBan ?? item.giaBan) : item.giaBan,
      soLuongTon,
      trangThaiKho: item.trangThai,
      inventoryId: item.id,
      imageUrl: item.imageUrl || null,
      code: item.code || null,
      dinhMucs: item.dinhMucs || [],
      dinhMucId: defaultDinhMuc ? defaultDinhMuc.id : null,
      dinhMucTen: defaultDinhMuc ? defaultDinhMuc.tenDinhMuc : null,
      source: item.source
    };

    if (rowId === -1) {
      setFormItem(x => ({ ...x, ...updatePayload }));
    } else {
      setItems(r => r.map(x => x.id === rowId ? { ...x, ...updatePayload } : x));
    }
    setSuggest([]);
    setActiveRowIdSync(null);
  };

  const setInfoField = (k: string) => (e: any) => {
    setInfo(f => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  };

  const addRow = () => {
    if (!formItem.ten.trim()) {
      toast.error("Lỗi", "Vui lòng chọn hoặc nhập tên sản phẩm");
      return;
    }
    setItems(r => [...r, { ...formItem, id: nextId.current++ }]);
    setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "" });
  };

  const removeRow = (id: number) => {
    setItems(r => r.filter(x => x.id !== id));
  };

  const updateRow = (id: number, k: keyof OrderItem, val: any) => {
    setItems(r => r.map(x => x.id === id ? { ...x, [k]: val } : x));
  };

  const getProductCode = (it: OrderItem) => it.code || "";

  const thanhTien = (it: OrderItem) => it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s, it) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien;

  const toast = useToast();
  const { data: session } = useSession();

  const handleSave = async () => {
    if (!info.soPhieu.trim()) {
      setSaveError("Vui lòng nhập số đơn hàng");
      return;
    }
    if (!info.ngayGiaoHang) {
      setSaveError("Vui lòng chọn ngày giao hàng");
      return;
    }
    const validItems = items.filter(it => it.ten.trim());
    if (validItems.length === 0) {
      setSaveError("Vui lòng nhập ít nhất một mặt hàng");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const finalCustomerId = custInfo.id;
      let finalGhiChu = [
        info.ghiChu,
        info.tenNguoiNhan ? `Tên khách hàng: ${info.tenNguoiNhan}` : "",
        info.sdtNguoiNhan ? `Số điện thoại: ${info.sdtNguoiNhan}` : "",
        info.diaChiGiaoHang ? `Địa chỉ giao hàng: ${info.diaChiGiaoHang}` : ""
      ].filter(Boolean).join("\n");

      if (!finalCustomerId) {
        const guestInfo = {
          name: custInfo.name.trim() || "Khách vãng lai",
          dienThoai: custInfo.dienThoai.trim(),
          address: custInfo.address.trim()
        };
        finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
      }

      if (editOrder) {
        const updatePayload = {
          ngayGiao: info.ngayGiaoHang,
          ghiChu: finalGhiChu,
          tongTien: tamTinh,
          items: validItems.map((it, idx) => ({
            tenHang: it.ten.trim(),
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: thanhTien(it)
          }))
        };
        const res = await fetch(`/api/plan-finance/sales/${editOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi cập nhật");
        toast.success("Cập nhật thành công", `Đơn hàng ${info.soPhieu} đã được lưu.`);
      } else {
        const payload = {
          code: info.soPhieu.trim(),
          ngayBaoGia: info.ngayLap,
          ngayHetHan: info.ngayGiaoHang,
          ngayGiaoHang: info.ngayGiaoHang,
          trangThai: "won",
          uuTien: "medium",
          tongTien: tamTinh,
          discount: info.chietKhauTong,
          vat: info.thue,
          chiPhiThiCong: 0,
          thanhTien: tongCong,
          ghiChu: finalGhiChu,
          quoteType: "Không có quầy kệ",
          items: validItems.map((it, idx) => ({
            tenHang: it.ten.trim(),
            donVi: it.dvt || "cái",
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: thanhTien(it),
            ghiChu: JSON.stringify({ code: it.code || "", khoTen: it.khoTen || "" }),
            sortOrder: idx
          })),
          customerId: finalCustomerId || null,
          type
        };

        const res = await fetch("/api/plan-finance/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error((await res.json()).error ?? "Lỗi tạo đơn hàng");
        }
        toast.success("Tạo đơn hàng thành công", `Đơn hàng ${info.soPhieu} đã được lưu.`);
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setSaveError(err.message ?? "Lỗi lưu đơn hàng");
      toast.error("Lỗi tạo đơn hàng", err.message ?? "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* Responsive styles for iPad/tablets */
        @media (max-width: 1024px) {
          .order-modal-body {
            position: relative !important;
          }
          .order-modal-left {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 350px !important;
            max-width: 85vw !important;
            z-index: 200 !important;
            border-right: 1px solid var(--border) !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.25) !important;
            background: var(--card) !important;
          }
          .order-modal-left.show {
            transform: translateX(0) !important;
          }
          .order-modal-right {
            width: 100% !important;
            flex: 1 !important;
          }
          .order-modal-toggle-btn {
            display: flex !important;
          }
          .order-modal-sidebar-header {
            display: flex !important;
          }
          .order-modal-table th, 
          .order-modal-table td {
            padding: 6px 8px !important;
          }
          .order-modal-header {
            padding: 0 12px !important;
          }
          .order-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .order-modal-header-title {
            font-size: 14px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="order-modal-header" style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#1E293B", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-cart3" style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <p className="order-modal-header-title" style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "0.01em" }}>
              {editOrder ? "Cập nhật đơn bán hàng (SO)" : `Lập đơn bán hàng (SO) - ${type === "retail" ? "Bán lẻ" : "Đại lý"}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && <span style={{ fontSize: 12, color: "#fca5a5", alignSelf: "center" }}><i className="bi bi-exclamation-circle" /> {saveError}</span>}
          <button className="order-modal-header-btn" onClick={handleSave} disabled={saving} style={{ padding: "6px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Đang lưu..." : (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <i className="bi bi-check-circle" />
                {editOrder ? "Cập nhật đơn" : "Tạo đơn hàng"}
              </span>
            )}
          </button>
          <button onClick={onClose} style={{ width: 34, height: 34, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><i className="bi bi-x" style={{ fontSize: 18 }} /></button>
        </div>
      </div>

      <div className="order-modal-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Backdrop for Offcanvas */}
        {showInfoSidebar && (
          <div
            onClick={() => setShowInfoSidebar(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2.5px)",
              zIndex: 199
            }}
          />
        )}

        {/* Left Side: Order Info */}
        <div className={`order-modal-left ${showInfoSidebar ? "show" : ""}`} style={{ width: 400, flexShrink: 0, borderRight: "1px solid var(--border)", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "var(--card)", overflowY: "auto" }}>
            {/* Offcanvas Header */}
            <div className="order-modal-sidebar-header" style={{ display: "none", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>Thông tin chung</span>
              <button type="button" onClick={() => setShowInfoSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--foreground)", padding: 4, display: "flex", alignItems: "center" }}><i className="bi bi-x-lg" /></button>
            </div>

            <div>
              <FLabel text="Số đơn hàng (Tham chiếu)" required />
              <input value={info.soPhieu} onChange={setInfoField("soPhieu")} style={{ ...inputSt, fontFamily: "monospace" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FLabel text="Ngày đặt hàng" required />
                <input type="date" value={info.ngayLap} onChange={setInfoField("ngayLap")} style={inputSt} />
              </div>
              <div>
                <FLabel text="Ngày giao hàng mong muốn" required />
                <input type="date" value={info.ngayGiaoHang} onChange={setInfoField("ngayGiaoHang")} style={inputSt} />
              </div>
            </div>

            {/* Customer Details Display */}
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Thông tin khách hàng</p>
              {customer ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, textTransform: "uppercase" }}>{info.tenNguoiNhan || customer.name}</span>
                  {(info.sdtNguoiNhan || customer.dienThoai) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                      <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                      {info.sdtNguoiNhan || customer.dienThoai}
                    </div>
                  )}
                  {(info.diaChiGiaoHang || customer.address) && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                      <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{info.diaChiGiaoHang || customer.address}</span>
                    </div>
                  )}
                  {debtInfo && (
                    <div style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      background: "rgba(59,130,246,0.06)",
                      padding: 8,
                      borderRadius: 8,
                      border: "1px dashed rgba(59,130,246,0.2)"
                    }}>
                      <div>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                        <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                        <strong style={{ fontSize: 11.5, color: "#var(--primary)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <div>
                      <FLabel text="Tên khách hàng" />
                      <input
                        type="text"
                        placeholder="Nhập tên khách hàng..."
                        value={custInfo.name}
                        onChange={e => {
                          const val = e.target.value;
                          setCustInfo(prev => ({ ...prev, name: val, id: "" }));
                          setInfo(prev => ({ ...prev, tenNguoiNhan: val }));
                        }}
                        style={{ ...inputSt, background: "#fff" }}
                      />
                    </div>
                    <div>
                      <FLabel text="Số điện thoại" />
                      <input
                        type="text"
                        placeholder="Số điện thoại..."
                        value={custInfo.dienThoai}
                        onChange={e => {
                          const val = e.target.value;
                          setCustInfo(prev => ({ ...prev, dienThoai: val }));
                          setInfo(prev => ({ ...prev, sdtNguoiNhan: val }));
                        }}
                        style={{ ...inputSt, background: "#fff" }}
                      />
                    </div>
                  </div>
                  <div>
                    <FLabel text="Địa chỉ" />
                    <input
                      type="text"
                      placeholder="Nhập địa chỉ..."
                      value={custInfo.address}
                      onChange={e => {
                        const val = e.target.value;
                        setCustInfo(prev => ({ ...prev, address: val }));
                        setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
                      }}
                      style={{ ...inputSt, background: "#fff" }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FLabel text="Tên khách hàng" />
                <input
                  type="text"
                  placeholder="Nhập tên khách hàng..."
                  value={info.tenNguoiNhan}
                  onChange={e => {
                    const val = e.target.value;
                    setInfo(prev => ({ ...prev, tenNguoiNhan: val }));
                    if (!customer) setCustInfo(prev => ({ ...prev, name: val, id: "" }));
                  }}
                  style={inputSt}
                />
              </div>
              <div>
                <FLabel text="Số điện thoại" />
                <input
                  type="text"
                  placeholder="Nhập số điện thoại..."
                  value={info.sdtNguoiNhan}
                  onChange={e => {
                    const val = e.target.value;
                    setInfo(prev => ({ ...prev, sdtNguoiNhan: val }));
                    if (!customer) setCustInfo(prev => ({ ...prev, dienThoai: val }));
                  }}
                  style={inputSt}
                />
              </div>
            </div>

            <div>
              <FLabel text="Địa chỉ giao hàng" />
              <input
                type="text"
                placeholder="Nhập địa chỉ giao hàng chi tiết..."
                value={info.diaChiGiaoHang}
                onChange={e => {
                  const val = e.target.value;
                  setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
                  if (!customer) setCustInfo(prev => ({ ...prev, address: val }));
                }}
                style={inputSt}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><FLabel text="Chiết khấu tổng (%)" /><input type="number" min={0} max={100} value={info.chietKhauTong} onChange={setInfoField("chietKhauTong")} style={inputSt} /></div>
              <div><FLabel text="Thuế VAT (%)" /><input type="number" min={0} max={100} value={info.thue} onChange={setInfoField("thue")} style={inputSt} /></div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <FLabel text="Ghi chú đơn hàng" />
              <textarea
                placeholder="Ghi chú về thời gian giao hàng, yêu cầu đặc biệt..."
                value={info.ghiChu}
                onChange={e => setInfo(prev => ({ ...prev, ghiChu: e.target.value }))}
                style={{ ...inputSt, flex: 1, resize: "none", minHeight: 120 }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Items Table */}
        <div className="order-modal-right" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="order-modal-toggle-btn"
                onClick={() => setShowInfoSidebar(true)}
                style={{
                  padding: "5px 10px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "none",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <i className="bi bi-layout-sidebar-inset" />
                Thông tin chung
              </button>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bảng danh sách sản phẩm</span>
              <TrangThaiTonKhoBadge
                items={items.map(it => ({ ten: it.ten, soLuong: it.soLuong, soLuongTon: it.soLuongTon }))}
                showPurchaseRequest={false}
              />
            </div>
          </div>

          <div className="order-modal-table-container" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Form nhập liệu */}
            <div style={{ padding: 16, background: "rgba(59,130,246,0.04)", border: "1px dashed rgba(59,130,246,0.3)", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 100%", display: "flex", gap: 12 }}>
                <div style={{ flex: "2 1 250px", position: "relative" }}>
                  <FLabel text="Sản phẩm / Dịch vụ" required />
                  <input
                    value={formItem.ten}
                    placeholder="Nhập tên hoặc mã SKU sản phẩm..."
                    onChange={e => {
                      const v = e.target.value;
                      setFormItem(prev => ({ ...prev, ten: v }));
                      if (!v) {
                        setSuggest([]);
                      } else {
                        setActiveRowIdSync(-1);
                        fetchSuggest(v, -1);
                      }
                    }}
                    onFocus={e => { setActiveRowIdSync(-1); fetchSuggest(formItem.ten, -1); e.currentTarget.style.border = "1px solid var(--primary)"; }}
                    onBlur={e => { e.currentTarget.style.border = "1px solid var(--border)"; setTimeout(() => { if (activeRowIdRef.current === -1) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", background: "#fff", outline: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 13, color: "var(--foreground)", transition: "border-color 0.15s" }}
                  />
                  {activeRowId === -1 && suggest.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                      {suggest.map(s => (
                        <div key={s.id} onClick={() => applySuggest(-1, s)}
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
                </div>
                <div style={{ flex: "1 1 110px", maxWidth: 180 }}>
                  <FLabel text="Mã định mức" />
                  <select
                    value={formItem.dinhMucId || ""}
                    onChange={e => {
                      const dmId = e.target.value;
                      const dm = formItem.dinhMucs?.find(x => x.id === dmId);
                      setFormItem(p => ({ 
                        ...p, 
                        dinhMucId: dmId, 
                        dinhMucTen: dm ? dm.tenDinhMuc : null,
                        donGia: dm ? (dm.giaBan ?? 0) : p.donGia
                      }));
                    }}
                    disabled={formItem.source === "inventory"}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: formItem.source === "inventory" ? "var(--muted)" : "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, color: formItem.source === "inventory" ? "var(--muted-foreground)" : "var(--foreground)", cursor: formItem.source === "inventory" ? "not-allowed" : "default" }}
                  >
                    {formItem.dinhMucs?.map((dm: any) => (
                      <option key={dm.id} value={dm.id}>{dm.code}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "2 1 240px" }}>
                  <FLabel text="Mô tả định mức" />
                  <div className="d-flex gap-2">
                    <input
                      value={formItem.dinhMucTen || ""}
                      readOnly
                      placeholder="Tự động hiển thị..."
                      style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-light border" 
                      onClick={() => setShowBomDetail(true)}
                      disabled={!formItem.dinhMucId}
                      style={{ padding: "7px 12px", borderRadius: 6 }}
                      title="Xem chi tiết định mức"
                    >
                      <i className="bi bi-three-dots"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <FLabel text="Tên kho" />
                <input 
                  value={formItem.khoTen || ""} 
                  readOnly 
                  placeholder="Tự động..."
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }} 
                />
              </div>
              <div style={{ flex: "1 1 80px" }}>
                <FLabel text="Đơn vị tính" />
                <input value={formItem.dvt} onChange={e => setFormItem(p => ({ ...p, dvt: e.target.value }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "center", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: "1 1 90px" }}>
                <FLabel text="Số lượng" required />
                <input type="number" min={1} value={formItem.soLuong} onChange={e => setFormItem(p => ({ ...p, soLuong: Math.max(1, Number(e.target.value)) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: "1 1 90px" }}>
                <FLabel text="Chiết khấu (%)" />
                <input type="number" min={0} max={100} value={formItem.ckPct} onChange={e => setFormItem(p => ({ ...p, ckPct: Math.max(0, Math.min(100, Number(e.target.value))) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <FLabel text="Đơn giá (đ)" />
                <CurrencyInput
                  value={formItem.donGia}
                  onChange={v => setFormItem(p => ({ ...p, donGia: v }))}
                  placeholder="0"
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }}
                />
              </div>
              <div>
                <button onClick={addRow} style={{ padding: "7px 14px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, height: 33 }}>
                  <i className="bi bi-plus-lg" /> Thêm
                </button>
              </div>
            </div>

            <table className="order-modal-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: 10, width: 40 }}>#</th>
                  <th style={{ padding: 10 }}>Tên sản phẩm - Dịch vụ</th>
                  <th style={{ padding: 10, width: 90, textAlign: "center" }}>Đơn vị tính</th>
                  <th style={{ padding: 10, width: 90, textAlign: "center" }}>Số lượng</th>
                  <th style={{ padding: 10, width: 110, textAlign: "center" }}>Chiết khấu (%)</th>
                  <th style={{ padding: 10, width: 130, textAlign: "right" }}>Đơn giá (đ)</th>
                  <th style={{ padding: 10, width: 130, textAlign: "right" }}>Thành tiền (đ)</th>
                  <th style={{ padding: 10, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)" }}>Chưa có sản phẩm nào</td></tr>
                ) : items.map((it, idx) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                    <td style={{ padding: "6px 10px", position: "relative" }}>
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
                      <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{it.ten}</span>
                    </td>
                    <td style={{ padding: 6, textAlign: "center" }}>{it.dvt}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{it.soLuong}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{it.ckPct}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{fmt(it.donGia)}</td>
                    <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmt(thanhTien(it))} đ</td>
                    <td style={{ padding: 6 }}>
                      <button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom summaries */}
          <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", background: "var(--card)" }}>
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Tạm tính</p><p style={{ margin: 0, fontWeight: 700 }}>{fmt(tamTinh)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Khấu trừ</p><p style={{ margin: 0, fontWeight: 700 }}>− {fmt(ckTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Thuế</p><p style={{ margin: 0, fontWeight: 700 }}>+ {fmt(thueTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--primary)" }}>TỔNG CỘNG</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--primary)" }}>{fmt(tongCong)} ₫</p></div>
            </div>
          </div>
        </div>
      </div>

      {showBomDetail && (
        <>
          <div className="offcanvas offcanvas-end show" tabIndex={-1} style={{ visibility: "visible", width: 400, zIndex: 1060 }}>
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title fw-bold">Chi tiết định mức</h5>
              <button type="button" className="btn-close" onClick={() => setShowBomDetail(false)}></button>
            </div>
            <div className="offcanvas-body p-0">
              {loadingBom ? (
                <div className="text-center p-5 text-muted d-flex flex-column align-items-center justify-content-center h-100">
                  <div className="spinner-border text-primary mb-3" style={{ width: "2rem", height: "2rem" }}></div>
                  <span style={{ fontSize: 14 }}>Đang tải dữ liệu định mức...</span>
                </div>
              ) : bomDetailData ? (
                <div className="d-flex flex-column h-100 bg-light">
                  <div className="p-4 bg-white" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge px-2 py-1" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: 10, letterSpacing: 0.5, fontWeight: 700 }}>
                        <i className="bi bi-diagram-3 me-1"></i> B.O.M
                      </span>
                    </div>
                    <h5 className="mb-1 fw-bold" style={{ color: "var(--foreground)" }}>{bomDetailData.code}</h5>
                    <p className="mb-0 text-muted" style={{ fontSize: 13 }}>{bomDetailData.tenDinhMuc}</p>
                  </div>
                  <div className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <p className="fw-bold mb-0 text-uppercase" style={{ fontSize: 11, letterSpacing: 0.5, color: "var(--muted-foreground)" }}>
                        Thành phần nguyên vật liệu
                      </p>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
                        {bomDetailData.vatTu?.length || 0} mục
                      </span>
                    </div>
                    
                    {bomDetailData.vatTu?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {bomDetailData.vatTu.map((vt: any, idx: number) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between p-3 bg-white" style={{ border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36, background: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
                                <i className="bi bi-box-seam" style={{ fontSize: 15 }}></i>
                              </div>
                              <div>
                                <h6 className="mb-0 fw-semibold" style={{ fontSize: 13, color: "var(--foreground)" }}>
                                  {vt.tenVatTu || vt.material?.name || vt.material?.tenHang}
                                </h6>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Mã: {vt.material?.code || "---"}
                                </span>
                              </div>
                            </div>
                            <div className="text-end ms-3 border-start ps-3 flex-shrink-0">
                              <span className="fw-bold d-block text-primary" style={{ fontSize: 15 }}>{vt.soLuong}</span>
                              <span className="text-muted text-uppercase" style={{ fontSize: 10, fontWeight: 600 }}>{vt.donViTinh || vt.material?.unit || vt.material?.donVi}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-3 border" style={{ borderStyle: "dashed !important" }}>
                        <i className="bi bi-inboxes text-muted opacity-50 d-block mb-2" style={{ fontSize: 24 }}></i>
                        <p className="small text-muted fst-italic mb-0">Định mức này chưa có thành phần vật tư.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-5 text-muted d-flex flex-column align-items-center h-100 justify-content-center">
                  <i className="bi bi-exclamation-circle mb-2" style={{ fontSize: 24 }}></i>
                  Không tải được dữ liệu định mức.
                </div>
              )}
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowBomDetail(false)}></div>
        </>
      )}
    </div>
  );
}
