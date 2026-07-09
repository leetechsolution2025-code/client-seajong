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

export function AddSanitaryProductModal({ open, onClose, onSaved, warehouseId, isMaterialWarehouse, editItem }: { 
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
    brand: "Seajong",
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
  });

  const [webSearch, setWebSearch] = useState("");
  const [webResults, setWebResults] = useState<any[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [showWebResults, setShowWebResults] = useState(false);

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
        setForm({
          tenHang: editItem.tenHang || "",
          code: editItem.code || "",
          categoryId: editItem.categoryId || "",
          loai: editItem.source === "inventory" ? "hang-hoa" : "vat-tu",
          brand: editItem.brand || "Seajong",
          model: editItem.model || "",
          version: editItem.version || "",
          color: editItem.color || "",
          donVi: editItem.donVi || "Cái",
          soLuongMin: editItem.soLuongMin ?? 0,
          giaNhap: editItem.giaNhap ?? "",
          giaBan: editItem.giaBan ?? "",
          nhaCungCap: editItem.nhaCungCap || "",
          thongSoKyThuat: editItem.thongSoKyThuat || "",
          ghiChu: editItem.ghiChu || "",
          kieuDang: editItem.kieuDang || editItem.spec || "",
          webProductId: editItem.webProductId || null,
          imageUrl: editItem.imageUrl || null,
        });
      } else {
        setIsCodeManuallyEdited(false);
        setForm({
          tenHang: "",
          code: "",
          categoryId: "",
          loai: isMaterialWarehouse ? "vat-tu" : "hang-hoa",
          brand: "Seajong",
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
        });
      }
      setWebSearch("");
      setWebResults([]);

      const url = warehouseId 
        ? `/api/production/materials/categories?warehouseId=${warehouseId}`
        : "/api/production/materials/categories";
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
        "TBVS": "TBVS",
        "BC": "BC",
        "SC": "SC",
        "LB": "LB",
        "TL": "TL",
        "VB": "VB",
        "BT": "BT",
        "PK": "PK",
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

  const handleWebSearch = async (q: string) => {
    setWebSearch(q);
    if (q.length < 2) {
      setWebResults([]);
      setShowWebResults(false);
      return;
    }

    setIsSearchingWeb(true);
    setShowWebResults(true);
    try {
      const res = await fetch(`/api/seajong/products?search=${encodeURIComponent(q)}&per_page=5`);
      const data = await res.json();
      setWebResults(data.products || []);
    } catch (error) {
      console.error("Web search error:", error);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const selectWebProduct = (p: any) => {
    const specs = p.specs || {};
    setForm({
      ...form,
      tenHang: p.name,
      model: specs["Model"] || specs["Mã sản phẩm"] || "",
      brand: specs["Thương hiệu"] || "Seajong",
      color: specs["Màu sắc"] || specs["Màu"] || "",
      version: specs["Phiên bản"] || "",
      webProductId: p.id,
      imageUrl: p.images?.[0] || null,
      thongSoKyThuat: p.description || "",
    });
    setShowWebResults(false);
    setWebSearch("");
    toast.success("Đã lấy thông tin", "Dữ liệu từ website đã được điền vào form");
  };

  const handleSave = async () => {
    if (!form.tenHang) return toast.error("Lỗi", "Vui lòng nhập tên hàng hóa");
    if (!form.categoryId) return toast.error("Lỗi", "Vui lòng chọn danh mục");

    try {
      const payload = editItem 
        ? { ...form, id: editItem.id, source: editItem.source } 
        : { ...form, warehouseId };
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
                  ? (editItem ? "Chỉnh sửa vật tư, phụ kiện mới" : "Thêm vật tư, phụ kiện mới")
                  : (editItem ? "Chỉnh sửa thành phẩm mới" : "Thêm thành phẩm mới")
                }
              </h6>
              <p className="text-muted small mb-0" style={{ fontSize: "10px" }}>
                {isMaterialWarehouse
                  ? (editItem ? "Đang cập nhật thông tin vật tư" : "Đang tạo vật tư mới trong hệ thống Logistics")
                  : (editItem ? "Đang cập nhật thông tin thành phẩm" : "Đang tạo thành phẩm mới trong hệ thống Logistics")
                }
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-light rounded-pill px-4 fw-bold" style={{ fontSize: 13 }} onClick={onClose}>Hủy</button>
            <button 
              type="button" 
              className="btn rounded-pill px-4 fw-bold text-white" 
              onClick={handleSave}
              style={{ height: 42, backgroundColor: "#011F58", borderColor: "#011F58", boxShadow: "0 4px 12px rgba(1,31,88,0.2)" }}
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
                  
                  {/* Basic Info Header */}
                  <div className="d-flex align-items-center gap-2 pb-2 border-bottom border-light">
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-info-circle text-primary" />
                    </div>
                    <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Thông tin cơ bản</span>
                  </div>

                  {/* Fields Grid */}
                  <div className="row g-3">
                    
                    {/* Website product search (only for Sanitary products) */}
                    {!editItem && !isMaterialWarehouse && (
                      <div className="col-12 position-relative">
                        <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Tìm kiếm dữ liệu từ Website (Tùy chọn)</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light"><i className="bi bi-search text-muted" /></span>
                          <input 
                            type="text" 
                            className="form-control rounded-3" 
                            style={{ fontSize: "13px" }}
                            placeholder="Nhập tên sản phẩm để tự động điền thông tin..." 
                            value={webSearch} 
                            onChange={e => handleWebSearch(e.target.value)} 
                          />
                          {isSearchingWeb && (
                            <span className="input-group-text bg-white">
                              <div className="spinner-border spinner-border-sm text-primary" />
                            </span>
                          )}
                        </div>

                        {showWebResults && webResults.length > 0 && (
                          <div className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-hidden" style={{ zIndex: 10 }}>
                            {webResults.map(p => (
                              <button 
                                key={p.id}
                                className="w-100 text-start px-3 py-2 border-bottom btn btn-link text-decoration-none text-dark d-flex align-items-center gap-2 hover-bg-light"
                                onClick={() => selectWebProduct(p)}
                              >
                                {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />}
                                <span style={{ fontSize: 12 }}>{p.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="col-12">
                      <div className="row g-3">
                        {/* Left Column for Inputs */}
                        <div className="col-md-9 col-12">
                          <div className="row g-3">
                            <div className="col-md-6 col-12">
                              <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Danh mục {isMaterialWarehouse ? "vật tư" : "thành phẩm"} *</label>
                              <TreeFilterSelect 
                                options={categoryOptions} 
                                value={form.categoryId} 
                                onChange={val => setForm({ ...form, categoryId: val })} 
                                placeholder="Chọn danh mục..."
                              />
                            </div>

                            <div className="col-md-6 col-12">
                              <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Mã định danh</label>
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

                            <div className="col-md-8 col-12">
                              <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Tên {isMaterialWarehouse ? "vật tư, linh kiện" : "thành phẩm"} *</label>
                              <input 
                                type="text" 
                                className="form-control rounded-3" 
                                style={{ fontSize: "13px" }} 
                                placeholder={isMaterialWarehouse ? "Ví dụ: Nắp bồn cầu S-0139, Van xả, Cảm biến..." : "Ví dụ: Bồn cầu thông minh..."}
                                value={form.tenHang} 
                                onChange={e => setForm({...form, tenHang: e.target.value})} 
                              />
                            </div>

                            <div className="col-md-4 col-12">
                              <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Kiểu dáng</label>
                              <input 
                                type="text" 
                                className="form-control rounded-3" 
                                style={{ fontSize: "13px" }} 
                                placeholder="Ví dụ: Tròn, Vuông, Âm tường" 
                                value={form.kieuDang} 
                                onChange={e => setForm({...form, kieuDang: e.target.value})} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Right Column for QR Code */}
                        <div className="col-md-3 col-12 d-flex flex-column align-items-center justify-content-center border-start ps-3 border-light">
                          <label className="form-label fw-bold small text-muted w-100 text-center" style={{ fontSize: "11px" }}>Mã QR hàng hóa</label>
                          <div 
                            className="border rounded-3 p-2 d-flex align-items-center justify-content-center bg-white"
                            style={{ 
                              width: "110px", 
                              height: "110px", 
                              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                              marginTop: "8px"
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
                              placeholder="Chi tiết thông số kỹ thuật..." 
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
                      <label className="form-label fw-bold small text-muted mb-0" style={{ fontSize: "11px" }}>Hình ảnh sản phẩm</label>
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
