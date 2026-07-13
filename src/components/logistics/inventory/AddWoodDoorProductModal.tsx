"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { TreeFilterSelect, TreeOption } from "@/components/ui/TreeFilterSelect";

interface Category {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
}

const parseDimensions = (specStr: string) => {
  if (!specStr) return { chieuDai: "", chieuRong: "", chieuDay: "" };
  const matchDai = specStr.match(/Dai:\s*(\d+(?:[\.,]\d+)?)/i);
  const matchRong = specStr.match(/Rong:\s*(\d+(?:[\.,]\d+)?)/i);
  const matchDay = specStr.match(/Day:\s*(\d+(?:[\.,]\d+)?)/i);
  return {
    chieuDai: matchDai ? matchDai[1] : "",
    chieuRong: matchRong ? matchRong[1] : "",
    chieuDay: matchDay ? matchDay[1] : "",
  };
};

const parseThicknessFromName = (name: string) => {
  if (!name) return "";
  const matchDay = name.match(/dày\s*(\d+(?:[\.,]\d+)?)/i);
  if (matchDay) return matchDay[1];
  const matchLyMm = name.match(/(\d+(?:[\.,]\d+)?)\s*(?:ly|mm)/i);
  if (matchLyMm) return matchLyMm[1];
  return "";
};

export function AddWoodDoorProductModal({ open, onClose, onSaved, warehouseId, isMaterialWarehouse, editItem }: { 
  open: boolean, 
  onClose: () => void, 
  onSaved: () => void, 
  warehouseId?: string | null,
  isMaterialWarehouse?: boolean,
  editItem?: any
}) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    tenHang: "",
    code: "",
    categoryId: "",
    loai: "hang-hoa",
    brand: "Laminate",
    model: "",
    version: "",
    color: "",
    donVi: "Cái",
    soLuongMin: 0,
    giaNhap: "" as any,
    giaBan: "" as any,
    nhaCungCap: "",
    thongSoKyThuat: "",
    ghiChu: "",
    kieuDang: "",
    webProductId: null as number | null,
    imageUrl: "" as string | null,
    chieuDai: "",
    chieuRong: "",
    chieuDay: "",
  });

  const [isDayManuallyEdited, setIsDayManuallyEdited] = useState(false);
  const [stamp, setStamp] = useState("");
  const [nextSeq, setNextSeq] = useState(1);

  useEffect(() => {
    if (open && !editItem && form.categoryId) {
      setStamp(String(Date.now()).slice(-4));
      
      fetch(`/api/logistics/inventory?action=next-sequence&categoryId=${form.categoryId}`)
        .then(r => r.json())
        .then(data => {
          if (data && typeof data.nextSeq === "number") {
            setNextSeq(data.nextSeq);
          }
        })
        .catch(() => {});
    }
  }, [open, form.categoryId, editItem]);

  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setIsCodeManuallyEdited(true);
        let chieuDai = editItem.chieuDai != null ? String(editItem.chieuDai) : "";
        let chieuRong = editItem.chieuRong != null ? String(editItem.chieuRong) : "";
        let chieuDay = editItem.chieuDay != null ? String(editItem.chieuDay) : "";

        if (!chieuDai && !chieuRong && !chieuDay) {
          const dims = parseDimensions(editItem.thongSoKyThuat || "");
          chieuDai = dims.chieuDai;
          chieuRong = dims.chieuRong;
          chieuDay = dims.chieuDay;
        }

        const tenHang = editItem.tenHang || "";
        const nameLower = tenHang.toLowerCase();
        const isSheet = nameLower.includes("ván") || 
                        nameLower.includes("mdf") || 
                        nameLower.includes("plywood") || 
                        nameLower.includes("polywood");
        const isNep = nameLower.includes("nẹp") || 
                      nameLower.includes("nep");

        if (isSheet) {
          if (!chieuDai) chieuDai = "2440";
          if (!chieuRong) chieuRong = "1220";
          if (!chieuDay) {
            chieuDay = parseThicknessFromName(tenHang);
          }
        } else if (isNep) {
          if (!chieuDay) {
            chieuDay = parseThicknessFromName(tenHang);
          }
        }

        let cleanThongSo = editItem.thongSoKyThuat || "";
        cleanThongSo = cleanThongSo.replace(/Dai:\s*\d+(?:[\.,]\d+)?;\s*Rong:\s*\d+(?:[\.,]\d+)?;\s*Day:\s*\d+(?:[\.,]\d+)?\n?/i, "");

        setForm({
          tenHang,
          code: editItem.code || "",
          categoryId: editItem.categoryId || "",
          loai: editItem.source === "inventory" ? "hang-hoa" : "vat-tu",
          brand: editItem.brand || "Laminate",
          model: editItem.model || "",
          version: editItem.version || "",
          color: editItem.color || "",
          donVi: editItem.donVi || "Cái",
          soLuongMin: editItem.soLuongMin ?? 0,
          giaNhap: editItem.giaNhap ?? "",
          giaBan: editItem.giaBan ?? "",
          nhaCungCap: editItem.nhaCungCap || "",
          thongSoKyThuat: cleanThongSo,
          ghiChu: editItem.ghiChu || "",
          kieuDang: editItem.kieuDang || editItem.spec || "",
          webProductId: editItem.webProductId || null,
          imageUrl: editItem.imageUrl || null,
          chieuDai,
          chieuRong,
          chieuDay,
        });
        setIsDayManuallyEdited(!!chieuDay);
      } else {
        setIsCodeManuallyEdited(false);
        setForm({
          tenHang: "",
          code: "",
          categoryId: "",
          loai: isMaterialWarehouse ? "vat-tu" : "hang-hoa",
          brand: "Laminate",
          model: "",
          version: "",
          color: "",
          donVi: "Cái",
          soLuongMin: 0,
          giaNhap: "",
          giaBan: "",
          nhaCungCap: "",
          thongSoKyThuat: "",
          ghiChu: "",
          kieuDang: "",
          webProductId: null,
          imageUrl: null,
          chieuDai: "",
          chieuRong: "",
          chieuDay: "",
        });
        setIsDayManuallyEdited(false);
      }

      const url = warehouseId 
        ? `/api/logistics/categories?warehouseId=${warehouseId}`
        : "/api/logistics/categories";
      fetch(url)
        .then(r => r.json())
        .then(data => setCategories(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [open, warehouseId, editItem]);

  const categoryOptions: TreeOption[] = categories.map(c => ({
    label: c.name,
    value: c.id,
    isHeader: (c as any).isHeader,
    level: (c as any).level
  }));

  const formatCurrency = (val: string | number) => {
    if (!val && val !== 0) return "";
    const num = val.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCurrencyChange = (field: "giaNhap" | "giaBan", val: string) => {
    const numericValue = val.replace(/\D/g, "");
    setForm({ ...form, [field]: numericValue });
  };

  useEffect(() => {
    if (editItem || isCodeManuallyEdited) return;

    const category = categories.find(c => c.id === form.categoryId);
    const getCategoryAbbr = (catCode: string | null) => {
      if (!catCode) return warehouseId ? "PROD" : "VTSX";
      const upper = catCode.toUpperCase().trim();
      const map: Record<string, string> = {
        "CUA_CHONG_CHAY": "CCC",
        "CUA_KHONG_CHONG_CHAY": "KCC",
        "LOAI_KHAC": "LK",
      };
      if (map[upper]) return map[upper];
      if (upper.includes("_") || upper.includes(" ") || upper.includes("-")) {
        return upper.split(/[_\s-]+/).map(w => w[0]).join("").substring(0, 4);
      }
      return upper.substring(0, 4);
    };

    const catAbbr = getCategoryAbbr(category?.code || null);
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    const extractSTT = (modelStr: string, fallbackStr: string) => {
      const match = modelStr.match(/\d+/);
      if (match) return String(parseInt(match[0], 10)).padStart(3, "0");
      const matchFallback = fallbackStr.match(/\d+/);
      if (matchFallback) return String(parseInt(matchFallback[0], 10)).padStart(3, "0");
      return String(nextSeq).padStart(3, "0");
    };

    const stt = extractSTT(form.model, form.kieuDang);
    const codeStamp = stamp || String(Date.now()).slice(-4);
    const sku = `${catAbbr}-${dateStr}-${codeStamp}-${stt}`.toUpperCase();
    setForm(f => ({ ...f, code: sku }));
  }, [form.categoryId, form.model, form.kieuDang, categories, warehouseId, editItem, stamp, nextSeq]);

  const handleSave = async () => {
    if (!form.tenHang) return toast.error("Lỗi", "Vui lòng nhập tên hàng hóa");
    if (!form.categoryId) return toast.error("Lỗi", "Vui lòng chọn danh mục");

    const nameLower = (form.tenHang || "").toLowerCase();
    const isSheet = nameLower.includes("ván") || 
                    nameLower.includes("mdf") || 
                    nameLower.includes("plywood") || 
                    nameLower.includes("polywood");
    const isNep = nameLower.includes("nẹp") || 
                  nameLower.includes("nep");
    const isUnlocked = isSheet || isNep;

    if (isSheet) {
      if (!form.chieuDai) return toast.error("Lỗi", "Vui lòng nhập Chiều dài (mm)");
      if (!form.chieuRong) return toast.error("Lỗi", "Vui lòng nhập Chiều rộng (mm)");
      if (!form.chieuDay) return toast.error("Lỗi", "Vui lòng nhập Chiều dày (mm)");
    }

    let finalThongSo = form.thongSoKyThuat || "";
    finalThongSo = finalThongSo.replace(/Dai:\s*\d+(?:[\.,]\d+)?;\s*Rong:\s*\d+(?:[\.,]\d+)?;\s*Day:\s*\d+(?:[\.,]\d+)?\n?/i, "");
    
    if (isUnlocked) {
      finalThongSo = `Dai: ${form.chieuDai || ""}; Rong: ${form.chieuRong || ""}; Day: ${form.chieuDay || ""}\n${finalThongSo}`;
    }

    try {
      const payload = editItem 
        ? { ...form, thongSoKyThuat: finalThongSo, id: editItem.id, source: editItem.source } 
        : { ...form, thongSoKyThuat: finalThongSo, warehouseId };
      const res = await fetch("/api/logistics/inventory", {
        method: editItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu dữ liệu");
      
      toast.success("Thành công", editItem ? "Đã cập nhật thông tin" : "Đã thêm hàng hóa mới");
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error("Lỗi", error.message || "Không thể lưu hàng hóa");
    }
  };

  const qrData = [
    `Mã SP: ${form.code || ""}`,
    `Tên hàng: ${form.tenHang || ""}`,
    `Loại: ${form.loai === "hang-hoa" ? "Hàng hóa" : "Vật tư"}`,
    `Thương hiệu: ${form.brand || ""}`,
    form.kieuDang ? `Kiểu dáng: ${form.kieuDang}` : null,
    `ĐVT: ${form.donVi || ""}`,
    form.giaNhap ? `Giá nhập: ${formatCurrency(form.giaNhap)} VNĐ` : null,
    form.giaBan ? `Giá bán: ${formatCurrency(form.giaBan)} VNĐ` : null,
    form.nhaCungCap ? `Nhà cung cấp: ${form.nhaCungCap}` : null,
  ].filter(Boolean).join("\n");

  if (!open) return null;

  const nameLower = (form.tenHang || "").toLowerCase();
  const isSheet = nameLower.includes("ván") || 
                  nameLower.includes("mdf") || 
                  nameLower.includes("plywood") || 
                  nameLower.includes("polywood");
  const isNep = nameLower.includes("nẹp") || 
                nameLower.includes("nep");
  const isUnlocked = isSheet || isNep;
  const isRequired = isSheet;

  return (
    <>
      <div 
        className="fixed-top vh-100 vw-100" 
        style={{ 
          zIndex: 6000, 
          background: "var(--background)", 
          display: "flex", 
          flexDirection: "column",
          animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <style>{`
          @keyframes slideInUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Fullscreen Header */}
        <div 
          className="px-4 d-flex align-items-center justify-content-between border-bottom" 
          style={{ height: 70, background: "var(--card)", flexShrink: 0 }}
        >
          <div className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-link text-muted p-0" 
              onClick={onClose}
              style={{ fontSize: 24 }}
            >
              <i className="bi bi-x-lg" />
            </button>
            <div className="vr h-50 my-auto text-muted opacity-25" />
            <div>
              <h6 className="fw-bold mb-0">
                {isMaterialWarehouse 
                  ? (editItem ? "Chỉnh sửa vật tư phụ kiện" : "Thêm vật tư phụ kiện mới")
                  : (editItem ? "Chỉnh sửa cửa gỗ thành phẩm" : "Thêm cửa gỗ thành phẩm mới")
                }
              </h6>
              <p className="text-muted small mb-0" style={{ fontSize: "10px" }}>
                {isMaterialWarehouse
                  ? (editItem ? "Đang cập nhật thông tin vật tư sản xuất" : "Đang tạo vật tư mới trong hệ thống gỗ")
                  : (editItem ? "Đang cập nhật thông tin thành phẩm gỗ" : "Đang tạo thành phẩm gỗ mới trong hệ thống")
                }
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-light rounded-pill px-4 fw-bold" style={{ fontSize: 13 }} onClick={onClose}>Hủy</button>
            <button 
              type="button" 
              className="btn btn-primary rounded-pill px-4 fw-bold" 
              onClick={handleSave}
              style={{ height: 42, boxShadow: "0 4px 12px rgba(0,48,135,0.2)" }}
            >
              Lưu & Hoàn tất
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-grow-1 overflow-y-auto px-4 py-4" style={{ background: "#f8f9fa" }}>
          <div className="container-fluid p-0" style={{ maxWidth: 1200 }}>
            <div className="row g-4">
              
              {/* Left Column: Form Fields */}
              <div className="col-lg-8">
                <div className="d-flex flex-column gap-4 p-4 rounded-4 border bg-white shadow-sm mb-4">
                  
                  <div className="d-flex align-items-center gap-2 pb-2 border-bottom border-light">
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-info-circle text-primary" />
                    </div>
                    <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Thông tin cơ bản (Cửa gỗ)</span>
                  </div>

                  <div className="row g-3">
                    
                    <div className="col-md-5 col-12">
                      <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Danh mục cửa gỗ *</label>
                      <TreeFilterSelect 
                        options={categoryOptions} 
                        value={form.categoryId} 
                        onChange={val => setForm({ ...form, categoryId: val })} 
                        placeholder="Chọn danh mục..."
                      />
                    </div>

                    <div className="col-md-7 col-12">
                      <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Mã định danh gỗ</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        style={{ fontSize: "13px", fontWeight: 600 }} 
                        value={form.code} 
                        onChange={e => {
                          setIsCodeManuallyEdited(true);
                          setForm({ ...form, code: e.target.value.toUpperCase() });
                        }}
                      />
                    </div>

                    <div className="col-12">
                      <div className="row g-3 align-items-center">
                        <div className="col-md-9 col-12">
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Tên sản phẩm gỗ *</label>
                              <input 
                                type="text" 
                                className="form-control rounded-3" 
                                style={{ fontSize: "13px" }} 
                                placeholder="Ví dụ: Cửa gỗ công nghiệp MDF..." 
                                value={form.tenHang} 
                                onChange={e => setForm({...form, tenHang: e.target.value})} 
                              />
                            </div>
                            
                            <div className="col-12">
                              <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Kiểu dáng / Kiểu thiết kế</label>
                              <select 
                                className="form-select rounded-3" 
                                style={{ fontSize: "13px" }}
                                value={form.kieuDang}
                                onChange={e => setForm({...form, kieuDang: e.target.value})}
                              >
                                <option value="">-- Chọn kiểu dáng sổ --</option>
                                <option value="Phẳng">Phẳng trơn</option>
                                <option value="Chỉ trang trí">Chỉ trang trí CNC</option>
                                <option value="Pano">Pano cổ điển</option>
                                <option value="Ghép thanh">Ghép thanh</option>
                              </select>
                            </div>

                            {/* Dimension Fields */}
                            {isUnlocked && (
                              <>
                                <div className="col-md-4">
                                  <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>
                                    Chiều dài (mm) {isRequired && <span className="text-danger">*</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    className="form-control rounded-3" 
                                    style={{ fontSize: "13px" }} 
                                    placeholder="Dài (mm)"
                                    value={form.chieuDai || ""}
                                    onChange={e => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      setForm({ ...form, chieuDai: val });
                                    }}
                                  />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>
                                    Chiều rộng (mm) {isRequired && <span className="text-danger">*</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    className="form-control rounded-3" 
                                    style={{ fontSize: "13px" }} 
                                    placeholder="Rộng (mm)"
                                    value={form.chieuRong || ""}
                                    onChange={e => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      setForm({ ...form, chieuRong: val });
                                    }}
                                  />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>
                                    Chiều dày (mm) {isRequired && <span className="text-danger">*</span>}
                                  </label>
                                  <input 
                                    type="text" 
                                    className="form-control rounded-3" 
                                    style={{ fontSize: "13px" }} 
                                    placeholder="Dày (mm)"
                                    value={form.chieuDay || ""}
                                    onChange={e => {
                                      const val = e.target.value.replace(/[^0-9\.,]/g, "");
                                      setForm({ ...form, chieuDay: val });
                                      setIsDayManuallyEdited(!!val);
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="col-md-3 col-12 d-flex flex-column align-items-center justify-content-center border-start ps-3 border-light">
                          <label className="form-label fw-bold small text-muted w-100 text-center text-md-start" style={{ fontSize: "11px" }}>Mã QR gỗ</label>
                          <div 
                            className="border rounded-3 p-2 d-flex align-items-center justify-content-center bg-white"
                            style={{ 
                              width: "110px", 
                              height: "110px", 
                              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                            }}
                          >
                            {form.code ? (
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                                alt="QR Code" 
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            ) : (
                              <div className="text-center text-muted opacity-40">
                                <i className="bi bi-qr-code fs-3 d-block mb-1" />
                                <span style={{ fontSize: "9px" }}>Chưa có mã</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Tài chính & Kho vận và Thông số kỹ thuật */}
                    <div className="row border-top pt-3 g-4 mb-3">
                      {/* Left Column: Tài chính & Kho vận */}
                      <div className="col-md-6 border-end">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-currency-dollar text-primary" />
                          </div>
                          <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Tài chính & Kho vận</span>
                        </div>

                        <div className="row g-3">
                          <div className="col-6">
                            <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Giá nhập dự kiến</label>
                            <div className="input-group">
                              <input 
                                type="text" 
                                className="form-control rounded-3" 
                                style={{ fontSize: "13px" }} 
                                value={formatCurrency(form.giaNhap)} 
                                onChange={e => handleCurrencyChange("giaNhap", e.target.value)}
                              />
                              <span className="input-group-text bg-light fw-bold text-muted" style={{ fontSize: 11 }}>VNĐ</span>
                            </div>
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Giá bán niêm yết</label>
                            <div className="input-group">
                              <input 
                                type="text" 
                                className="form-control rounded-3" 
                                style={{ fontSize: "13px" }} 
                                value={formatCurrency(form.giaBan)} 
                                onChange={e => handleCurrencyChange("giaBan", e.target.value)}
                              />
                              <span className="input-group-text bg-light fw-bold text-muted" style={{ fontSize: 11 }}>VNĐ</span>
                            </div>
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Đơn vị tính (ĐVT)</label>
                            <input type="text" className="form-control rounded-3" style={{ fontSize: "13px" }} value={form.donVi} onChange={e => setForm({...form, donVi: e.target.value})} />
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Tồn kho tối thiểu</label>
                            <input type="number" className="form-control rounded-3" style={{ fontSize: "13px" }} value={form.soLuongMin} onChange={e => setForm({...form, soLuongMin: Number(e.target.value)})} />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Thông số kỹ thuật */}
                      <div className="col-md-6">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-gear text-primary" />
                          </div>
                          <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Thông số kỹ thuật</span>
                        </div>
                        <div className="row">
                          <div className="col-12">
                            <textarea 
                              className="form-control rounded-3" 
                              rows={5} 
                              style={{ fontSize: 12 }} 
                              placeholder="Chi tiết thông số kỹ thuật gỗ..." 
                              value={form.thongSoKyThuat} 
                              onChange={e => setForm({...form, thongSoKyThuat: e.target.value})} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sidebar info */}
              <div className="col-lg-4">
                <div className="d-flex flex-column gap-3">
                  
                  {/* Product Image Card */}
                  <div className="p-3 rounded-4 border shadow-sm" style={{ background: "var(--card)" }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label fw-bold small text-muted mb-0" style={{ fontSize: "11px" }}>Hình ảnh mẫu</label>
                      {form.imageUrl && <button className="btn btn-link btn-sm text-danger p-0 fw-bold" style={{ fontSize: "11px" }} onClick={() => setForm({...form, imageUrl: null})}>Xóa ảnh</button>}
                    </div>
                    
                    <div 
                      className="mb-2"
                      style={{ 
                        width: "100%", aspectRatio: "4/3", borderRadius: 12, 
                        background: "#fff", border: "1px solid var(--border)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", position: "relative"
                      }}
                    >
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <div className="text-center p-2">
                          <i className="bi bi-image-fill fs-2 text-muted opacity-25 mb-1 d-block" />
                          <p className="small text-muted mb-0 fw-bold" style={{ fontSize: 10 }}>Chưa có hình ảnh</p>
                        </div>
                      )}
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-muted" style={{ fontSize: 11 }}><i className="bi bi-link-45deg" /></span>
                      <input 
                        type="text" 
                        className="form-control rounded-pill-end border-start-0 ps-0" 
                        placeholder="Dán URL hình ảnh..." 
                        style={{ fontSize: 11 }}
                        value={form.imageUrl || ""} 
                        onChange={e => setForm({...form, imageUrl: e.target.value})} 
                      />
                    </div>
                  </div>

                  {/* Supplementary Info Card */}
                  {(() => {
                    const isEditable = !!isMaterialWarehouse || warehouseId === "cmoit7ttx0000i4514gkqzm1k" || (editItem && editItem.source !== "inventory");
                    return (
                      <div 
                        className="p-3 rounded-4 border shadow-sm" 
                        style={{ 
                          background: "var(--card)", 
                          opacity: isEditable ? 1 : 0.6,
                          transition: "opacity 0.22s ease-in-out" 
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <i className={`bi ${isEditable ? "bi-list-ul text-primary" : "bi-lock-fill text-muted"}`} />
                            <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: isEditable ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 11 }}>Thông tin bổ sung</span>
                          </div>
                          {!isEditable && (
                            <span className="badge bg-secondary-subtle text-muted border" style={{ fontSize: 9 }}>Chỉ kho vật tư</span>
                          )}
                        </div>
                        
                        <div className="d-flex flex-column gap-2">
                          <label className="form-label fw-bold small text-muted mb-0" style={{ fontSize: "11px" }}>Nhà cung cấp / Nguồn hàng</label>
                          <input 
                            type="text" 
                            className="form-control rounded-3" 
                            style={{ fontSize: "13px" }} 
                            placeholder={isEditable ? "Tên đối tác..." : "Bị khoá - chỉ dùng cho kho vật tư"} 
                            value={form.nhaCungCap} 
                            onChange={e => setForm({...form, nhaCungCap: e.target.value})}
                            disabled={!isEditable}
                          />
                        </div>

                        <div className="d-flex flex-column gap-2 mt-2">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Thương hiệu</label>
                          <input 
                            type="text" 
                            className="form-control rounded-3" 
                            style={{ fontSize: "13px" }} 
                            value={form.brand} 
                            onChange={e => setForm({...form, brand: e.target.value})}
                            disabled={!isEditable}
                          />
                        </div>

                        <div className="mb-0 mt-2">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Ghi chú nội bộ</label>
                          <textarea 
                            className="form-control rounded-3" 
                            rows={3} 
                            style={{ fontSize: 12 }} 
                            placeholder={isEditable ? "Lưu ý đặc biệt cho nhân viên kho..." : "Bị khoá - chỉ dùng cho kho vật tư"} 
                            value={form.ghiChu} 
                            onChange={e => setForm({...form, ghiChu: e.target.value})}
                            disabled={!isEditable}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
