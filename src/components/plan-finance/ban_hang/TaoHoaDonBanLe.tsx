"use client";
import { HoaDonBanLePrintPreview } from "./HoaDonBanLePrintPreview";
import React, { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type InvoiceLine = {
  id: number;
  inventoryItemId?: string;
  name: string;
  dvt: string;
  qty: number;
  donGia: number;
};
type InventoryResult = {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  giaBan: number;
  soLuong: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Format số thành tiền Việt: 1.500.000 ₫ */
function fmt(n: number) {
  if (!isFinite(n) || isNaN(n)) return "0 ₫";
  return n.toLocaleString("vi-VN") + " ₫";
}

const PAYMENT_METHODS = [
  { key: "cash",     label: "Tiền mặt",    icon: "bi-cash" },
  { key: "transfer", label: "Chuyển khoản", icon: "bi-bank" },
  { key: "card",     label: "Thẻ",          icon: "bi-credit-card" },
  { key: "ewallet",  label: "Ví điện tử",   icon: "bi-phone" },
];

const TOPBAR_H = 62; // px — chiều cao topbar cố định
let _lineId = 1;

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function TaoHoaDonBanLe({ open, onClose, onSaved }: Props) {
  const [printOpen,   setPrintOpen]   = useState(false);
  const [custName,    setCustName]    = useState("");
  const [custPhone,   setCustPhone]   = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [lines,       setLines]       = useState<InvoiceLine[]>([]);
  const [discount,    setDiscount]    = useState(0);
  const [vat,         setVat]         = useState(0);
  const [payMethod,   setPayMethod]   = useState("cash");
  const [amountGiven, setAmountGiven] = useState("");
  const [note,        setNote]        = useState("");
  const [trangThai,   setTrangThai]   = useState("chua-xuat-hang");
  const [saving,      setSaving]      = useState(false);

  // Kho hàng
  const [productSearch,     setProductSearch]     = useState("");
  const [inventoryResults,  setInventoryResults]  = useState<InventoryResult[]>([]);
  const [searching,         setSearching]         = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce tìm kho ──
  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(productSearch)}&limit=30`)
        .then(r => r.json())
        .then((d: InventoryResult[]) => setInventoryResults(d))
        .catch(() => setInventoryResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [productSearch, open]);

  // ── Reset khi mở ──
  useEffect(() => {
    if (!open) return;
    setCustName(""); setCustPhone(""); setCustAddress(""); setLines([]);
    setDiscount(0); setVat(0); setPayMethod("cash");
    setAmountGiven(""); setNote(""); setTrangThai("chua-xuat-hang"); setProductSearch(""); setSaving(false);
    _lineId = 1;
    setSearching(true);
    fetch("/api/plan-finance/inventory/search?limit=30")
      .then(r => r.json())
      .then((d: InventoryResult[]) => setInventoryResults(d))
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [open]);

  // ── Invoice preview code ──
  const now = new Date();
  const invoiceNoRef = useRef("");
  if (!invCode(invoiceNoRef.current) || !open) {
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    invoiceNoRef.current = `HDL-${ymd}-???`;
  }

  // ── Line helpers ──
  const addFromInventory = (item: InventoryResult) =>
    setLines(l => [...l, { id: _lineId++, inventoryItemId: item.id, name: item.tenHang, dvt: item.donVi ?? "cái", qty: 1, donGia: item.giaBan }]);
  const addLine   = () => setLines(l => [...l, { id: _lineId++, name: "", dvt: "cái", qty: 1, donGia: 0 }]);
  const updateLine = (id: number, patch: Partial<InvoiceLine>) =>
    setLines(l => l.map(x => x.id === id ? { ...x, ...patch } : x));
  const removeLine = (id: number) => setLines(l => l.filter(x => x.id !== id));

  // ── Totals ──
  const subtotal = lines.reduce((s, l) => s + l.qty * l.donGia, 0);
  const discAmt  = subtotal * discount / 100;
  const vatAmt   = (subtotal - discAmt) * vat / 100;
  const total    = subtotal - discAmt + vatAmt;
  const givenVnd = parseFloat(amountGiven || "0");
  const traNgay  = Math.min(givenVnd, total);
  const change   = Math.max(0, givenVnd - total);
  const conNo    = Math.max(0, total - givenVnd);

  // ── Save ──
  const handleSave = async () => {
    if (lines.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/plan-finance/retail-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenKhach: custName, dienThoai: custPhone, diaChi: custAddress,
          lines: lines.map(l => ({ inventoryItemId: l.inventoryItemId, name: l.name, dvt: l.dvt, qty: l.qty, donGia: l.donGia })),
          chietKhau: discount, vat, hinhThucTT: payMethod,
          tienKhachDua: givenVnd, tienThua: change, ghiChu: note,
          trangThai,

        }),
      });
      if (!res.ok) throw new Error("Lỗi tạo hoá đơn");
      onSaved?.();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ──
  const inputSt: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 13,
    background: "var(--input, rgba(255,255,255,0.05))",
    border: "1px solid var(--border)", color: "var(--foreground)", outline: "none",
  };
  const labelSt: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block",
  };
  const rowSt: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", fontSize: 12,
    color: "var(--muted-foreground)", marginBottom: 3,
  };

  if (!open) return null;
  return (
    <div style={{
      position: "fixed",
      top: TOPBAR_H, left: 0, right: 0, bottom: 0,
      zIndex: 1029,
      background: "var(--background)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        background: "var(--card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "color-mix(in srgb,var(--primary) 12%,transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi bi-receipt" style={{ fontSize: 16, color: "var(--primary)" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Hoá đơn bán lẻ mới</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
              {invoiceNoRef.current} · {now.toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "var(--muted-foreground)", fontSize: 18 }}>
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* ── Body: split ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ═══ LEFT PANEL — chọn sản phẩm + controls ═══ */}
        <div style={{ width: 400, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

          {/* Thông tin khách */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Khách hàng <span style={{ fontWeight: 400, fontStyle: "italic" }}>(tuỳ chọn)</span>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelSt}>Tên khách</label>
                <input style={inputSt} placeholder="Nguyễn Văn A..." value={custName} onChange={e => setCustName(e.target.value)} />
              </div>
              <div>
                <label style={labelSt}>Điện thoại</label>
                <input style={inputSt} placeholder="0912..." value={custPhone} onChange={e => setCustPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelSt}>Địa chỉ</label>
              <input style={inputSt} placeholder="Số nhà, đường, phường/xã..." value={custAddress} onChange={e => setCustAddress(e.target.value)} />
            </div>
          </div>

          {/* Tìm sản phẩm */}
          <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
            <label style={labelSt}>Chọn từ kho hàng</label>
            <div style={{ position: "relative" }}>
              <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--muted-foreground)" }} />
              <input
                style={{ ...inputSt, paddingLeft: 32, paddingRight: searching ? 32 : 10 }}
                placeholder="Tìm tên hoặc mã sản phẩm..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              {searching && (
                <i className="bi bi-arrow-repeat" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--muted-foreground)", animation: "spin 0.8s linear infinite" }} />
              )}
            </div>
          </div>

          {/* Danh sách kho */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 8px" }}>
            {inventoryResults.length === 0 && !searching ? (
              <div style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: 12, paddingTop: 24 }}>
                {productSearch ? "Không tìm thấy sản phẩm" : "Kho hàng trống"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {inventoryResults.map(item => (
                  <button key={item.id} onClick={() => addFromInventory(item)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                      background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                      textAlign: "left", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{item.tenHang}</p>
                      {item.code && <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{item.code}</p>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{fmt(item.giaBan)}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>Tồn: {item.soLuong} {item.donVi}</p>
                    </div>
                  </button>
                ))}
                <button onClick={addLine} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px", borderRadius: 8, cursor: "pointer",
                  background: "none", border: "1px dashed var(--border)",
                  color: "var(--muted-foreground)", fontSize: 12, marginTop: 4,
                }}>
                  <i className="bi bi-plus-lg" /> Thêm dòng thủ công
                </button>
              </div>
            )}
          </div>

          {/* ── Controls (phương thức, chiết khấu, VAT, trạng thái, nút, ghi chú) ── */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", flexShrink: 0, background: "var(--card)", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Phương thức thanh toán */}
            <div>
              <label style={labelSt}>Phương thức thanh toán</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.key} onClick={() => setPayMethod(m.key)} title={m.label}
                    style={{
                      padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", border: "1px solid",
                      borderColor: payMethod === m.key ? "var(--primary)" : "var(--border)",
                      background: payMethod === m.key ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "none",
                      color: payMethod === m.key ? "var(--primary)" : "var(--muted-foreground)",
                      transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
                    }}>
                    <i className={`bi ${m.icon}`} />
                    <span style={{ fontSize: 11 }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chiết khấu + VAT + Đã trả */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelSt}>Chiết khấu (%)</label>
                <input type="number" min={0} max={100} style={inputSt} value={discount}
                  onChange={e => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
              </div>
              <div>
                <label style={labelSt}>VAT (%)</label>
                <input type="number" min={0} max={100} style={inputSt} value={vat}
                  onChange={e => setVat(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
              </div>
              <div>
                <label style={labelSt}>Đã trả (đồng)</label>
                <input type="number" style={inputSt} placeholder={"VD: " + fmt(500_000)}
                  value={amountGiven} onChange={e => setAmountGiven(e.target.value)} />
              </div>
            </div>

            {/* Trạng thái */}
            <div>
              <label style={labelSt}>Trạng thái</label>
              <div style={{ display: "flex", gap: 4 }}>
                {([
                  { val: "chua-xuat-hang", label: "Chưa xuất",  color: "#f59e0b", icon: "bi-hourglass-split" },
                  { val: "da-xuat-hang",   label: "Đã xuất",    color: "#10b981", icon: "bi-check-circle-fill" },
                  { val: "huy-bo",         label: "Huỷ bỏ",     color: "#ef4444", icon: "bi-x-circle-fill" },
                ] as { val: string; label: string; color: string; icon: string }[]).map(s => (
                  <button key={s.val} onClick={() => setTrangThai(s.val)} style={{
                    flex: 1, padding: "6px 8px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                    cursor: "pointer", border: "1px solid",
                    borderColor: trangThai === s.val ? s.color : "var(--border)",
                    background: trangThai === s.val ? `color-mix(in srgb, ${s.color} 12%, transparent)` : "none",
                    color: trangThai === s.val ? s.color : "var(--muted-foreground)",
                    transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 10 }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <input style={{ ...inputSt, fontSize: 12 }} placeholder="Ghi chú..." value={note} onChange={e => setNote(e.target.value)} />

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button 
                onClick={() => setPrintOpen(true)}
                style={{
                  padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: "none", border: "1px solid var(--border)",
                  color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <i className="bi bi-printer" /> In
              </button>
              <button onClick={handleSave} disabled={lines.length === 0 || saving}
                style={{
                  flex: 1, padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                  background: lines.length === 0 || saving ? "var(--muted)"
                    : trangThai === "huy-bo" ? "#6b7280"
                    : conNo > 0 ? "#f59e0b" : "#10b981",
                  color: lines.length === 0 || saving ? "var(--muted-foreground)" : "#fff",
                  border: "none",
                  cursor: lines.length === 0 || saving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s",
                }}>
                {saving
                  ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> Đang lưu...</>
                  : trangThai === "huy-bo"
                  ? <><i className="bi bi-x-circle" /> Lưu (Huỷ)</>
                  : conNo > 0
                  ? <><i className="bi bi-exclamation-circle" /> Ghi nợ &amp; lưu</>
                  : <><i className="bi bi-check2-circle" /> Hoàn tất</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL — hoá đơn ═══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Dòng sản phẩm */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {lines.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160, color: "var(--muted-foreground)", gap: 8 }}>
                <i className="bi bi-cart-plus" style={{ fontSize: 32, opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Chưa có sản phẩm. Chọn từ bên trái hoặc thêm thủ công.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Tên SP / Dịch vụ", "ĐVT", "Số lượng", "Đơn giá (₫)", "Thành tiền", ""].map(h => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: h === "" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map(ln => (
                    <tr key={ln.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "7px 8px" }}>
                        <input style={{ ...inputSt, fontSize: 12 }} value={ln.name} placeholder="Tên sản phẩm..."
                          onChange={e => updateLine(ln.id, { name: e.target.value })} />
                      </td>
                      <td style={{ padding: "7px 8px", width: 70 }}>
                        <input style={{ ...inputSt, fontSize: 12 }} value={ln.dvt}
                          onChange={e => updateLine(ln.id, { dvt: e.target.value })} />
                      </td>
                      <td style={{ padding: "7px 8px", width: 110 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button onClick={() => updateLine(ln.id, { qty: Math.max(1, ln.qty - 1) })}
                            style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "none", cursor: "pointer", color: "var(--foreground)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <input style={{ ...inputSt, width: 46, textAlign: "center", padding: "4px 6px" }}
                            value={ln.qty} onChange={e => updateLine(ln.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })} />
                          <button onClick={() => updateLine(ln.id, { qty: ln.qty + 1 })}
                            style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "none", cursor: "pointer", color: "var(--foreground)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding: "7px 8px", width: 140 }}>
                        <input style={{ ...inputSt, fontSize: 12, textAlign: "right" }}
                          value={ln.donGia}
                          onChange={e => updateLine(ln.id, { donGia: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "right", marginTop: 1 }}>
                          {fmt(ln.donGia)}
                        </div>
                      </td>
                      <td style={{ padding: "7px 8px", width: 120, textAlign: "right", fontWeight: 700, fontSize: 13, color: "var(--primary)", whiteSpace: "nowrap" }}>
                        {fmt(ln.qty * ln.donGia)}
                      </td>
                      <td style={{ padding: "7px 8px", textAlign: "center", width: 36 }}>
                        <button onClick={() => removeLine(ln.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 15, padding: 4, borderRadius: 6 }}>
                          <i className="bi bi-trash3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* ═══ RIGHT PANEL — tóm tắt tài chính (read-only) ═══ */}
        <div style={{
          width: 260, borderLeft: "1px solid var(--border)", flexShrink: 0,
          display: "flex", flexDirection: "column", background: "var(--card)",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tóm tắt hoá đơn</p>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Thành tiền */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Thành tiền</span>
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{fmt(subtotal)}</span>
            </div>

            {/* Chiết khấu */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: discount > 0 ? "#f59e0b" : "var(--muted-foreground)" }}>
              <span>Chiết khấu ({discount}%)</span>
              <span style={{ fontWeight: 600 }}>-{fmt(discAmt)}</span>
            </div>

            {/* VAT */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: vat > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
              <span>VAT ({vat}%)</span>
              <span style={{ fontWeight: 600 }}>+{fmt(vatAmt)}</span>
            </div>

            {/* TỔNG */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderTop: "2px solid var(--border)", paddingTop: 10, marginTop: 4,
            }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)" }}>TỔNG</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--primary)" }}>{fmt(total)}</span>
            </div>

            {/* Đã trả */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Đã trả</span>
              <span style={{ fontWeight: 600, color: "#10b981" }}>{fmt(givenVnd)}</span>
            </div>

            {/* Còn lại */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted-foreground)" }}>Còn lại</span>
              <span style={{ fontWeight: 600, color: conNo > 0 ? "#ef4444" : "#10b981" }}>{fmt(conNo)}</span>
            </div>

            {/* TỔNG CÔNG NỢ */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderTop: "2px solid var(--border)", paddingTop: 10, marginTop: 4,
              background: conNo > 0 ? "color-mix(in srgb, #ef4444 6%, transparent)" : "color-mix(in srgb, #10b981 6%, transparent)",
              borderRadius: 10, padding: "10px 12px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: conNo > 0 ? "#ef4444" : "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tổng công nợ</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: conNo > 0 ? "#ef4444" : "#10b981" }}>{fmt(conNo)}</span>
            </div>

            {conNo > 0 && (
              <div style={{ fontSize: 10, color: "#ef4444", textAlign: "center", marginTop: -4 }}>
                Tự động tạo phiếu công nợ khi lưu
              </div>
            )}
          </div>
        </div>
      </div>
      <HoaDonBanLePrintPreview 
        open={printOpen} 
        onClose={() => setPrintOpen(false)} 
        invoiceData={{
          invoiceNo: invoiceNoRef.current,
          date: now,
          custName: custName,
          custPhone: custPhone,
          custAddress: custAddress,
          payMethod: payMethod,
          lines: lines,
          subtotal: subtotal,
          discount: discount,
          vatAmt: vatAmt,
          total: total,
          givenVnd: givenVnd,
          change: change,
          conNo: conNo,
          note: note
        }} 
      />
    </div>
  );
}

// ── internal helper ──
function invCode(s: string) { return s && !s.endsWith("???"); }
