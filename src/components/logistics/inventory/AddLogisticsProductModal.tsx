"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { sj_generateSKU } from "@/lib/sku-generator";
import { TreeFilterSelect, TreeOption } from "@/components/ui/TreeFilterSelect";

interface Category {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
}

export function AddLogisticsProductModal({ open, onClose, onSaved, warehouseId, editItem }: { 
  open: boolean, 
  onClose: () => void, 
  onSaved: () => void, 
  warehouseId?: string | null,
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

  useEffect(() => {
    if (open) {
      if (editItem) {
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
        // Reset form for new
        setForm({
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
    if (editItem) return; // Không tự sinh mã khi đang edit

    const category = categories.find(c => c.id === form.categoryId);
    const catCode = (category?.code || (warehouseId ? "PROD" : "VTSX")).replace(/\s+/g, "");
    const kieuDang = form.kieuDang ? `${form.kieuDang.trim().replace(/\s+/g, "")}-` : "";
    const sku = `${catCode}-${kieuDang}001`.toUpperCase();
    setForm(f => ({ ...f, code: sku }));
  }, [form.categoryId, form.kieuDang, categories, warehouseId, editItem]);

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
      const payload = editItem ? { ...form, id: editItem.id, source: editItem.source } : form;
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
              <h6 className="fw-bold mb-0">{editItem ? "Chỉnh sửa hàng hóa" : "Thêm hàng hóa mới"}</h6>
              <p className="text-muted small mb-0" style={{ fontSize: "10px" }}>{editItem ? "Đang cập nhật thông tin sản phẩm" : "Đang tạo sản phẩm mới trong hệ thống Seajong Logistics"}</p>
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
              {editItem ? "Cập nhật" : "Lưu & Hoàn tất"}
            </button>
          </div>
        </div>

        {/* Fullscreen Content Area */}
        <div className="flex-grow-1 overflow-auto bg-light bg-opacity-10 py-3">
          <div className="container" style={{ maxWidth: 1100 }}>
            
            <div className="row g-3">
              
              {/* Left Column: Form Details */}
              <div className="col-lg-8">
                  <div className="p-3 rounded-4 border shadow-sm h-100" style={{ background: "var(--card)" }}>
                    
                    {/* Section: Thông tin cơ bản */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-info-circle text-primary" />
                        </div>
                        <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Thông tin cơ bản</span>
                      </div>
                      
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Danh mục vật tư *</label>
                          <TreeFilterSelect
                            options={categoryOptions}
                            value={form.categoryId}
                            onChange={(val) => setForm({ ...form, categoryId: val })}
                            placeholder="Chọn danh mục..."
                            className="rounded-3"
                            width="100%"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Mã định danh</label>
                          <input 
                            type="text" 
                            className="form-control rounded-3 bg-light" 
                            style={{ fontSize: "13px", fontWeight: "bold", color: "var(--primary)" }} 
                            value={form.code || "VTSX - ..."} 
                            readOnly 
                          />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Tên vật tư, linh kiện *</label>
                          <input type="text" className="form-control rounded-3" style={{ fontSize: "13px" }} placeholder="Ví dụ: Nắp bồn cầu S-0139, Van xả, Cảm biến..." value={form.tenHang} onChange={e => setForm({...form, tenHang: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Kiểu dáng</label>
                          <input type="text" className="form-control rounded-3" style={{ fontSize: "13px" }} placeholder="Ví dụ: Tròn, Vuông, Dẹt..." value={form.kieuDang} onChange={e => setForm({...form, kieuDang: e.target.value})} />
                        </div>
                      </div>
                    </div>



                    {/* Section: Tài chính & Kho vận */}
                    <div className="mb-3 pt-2 border-top">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-currency-dollar text-primary" />
                        </div>
                        <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Tài chính & Kho vận</span>
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
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
                        <div className="col-md-6">
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
                        <div className="col-md-6">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Đơn vị tính (ĐVT)</label>
                          <input type="text" className="form-control rounded-3" style={{ fontSize: "13px" }} value={form.donVi} onChange={e => setForm({...form, donVi: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Hạn mức tồn tối thiểu</label>
                          <input type="number" className="form-control rounded-3" style={{ fontSize: "13px" }} value={form.soLuongMin} onChange={e => setForm({...form, soLuongMin: Number(e.target.value)})} />
                        </div>
                      </div>
                    </div>



                    {/* Section: Thông số kỹ thuật */}
                    <div className="mb-0 pt-2 border-top">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-gear text-primary" />
                        </div>
                        <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 13 }}>Thông số kỹ thuật</span>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <textarea className="form-control rounded-3" rows={3} style={{ fontSize: 12 }} placeholder="Chi tiết thông số..." value={form.thongSoKyThuat} onChange={e => setForm({...form, thongSoKyThuat: e.target.value})} />
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
                  <div className="p-3 rounded-4 border shadow-sm" style={{ background: "var(--card)" }}>
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <i className="bi bi-list-ul text-primary" />
                      <span className="fw-bold text-uppercase" style={{ letterSpacing: "0.05em", color: "var(--foreground)", fontSize: 11 }}>Thông tin bổ sung</span>
                    </div>
                    
                    <div className="d-flex flex-column gap-2">
                      <label className="form-label fw-bold small text-muted mb-0" style={{ fontSize: "11px" }}>Nhà cung cấp / Nguồn hàng</label>
                      <input type="text" className="form-control rounded-3" style={{ fontSize: "13px" }} placeholder="Tên đối tác..." value={form.nhaCungCap} onChange={e => setForm({...form, nhaCungCap: e.target.value})} />
                    </div>

                    <div className="d-flex flex-column gap-2 mt-2">
                      <label className="form-label fw-bold small text-muted mb-0" style={{ fontSize: "11px" }}>Thương hiệu</label>
                      <input type="text" className="form-control rounded-3" style={{ fontSize: "13px" }} value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                    </div>

                    <div className="mb-0">
                      <label className="form-label fw-bold small text-muted" style={{ fontSize: "11px" }}>Ghi chú nội bộ</label>
                      <textarea className="form-control rounded-3" rows={3} style={{ fontSize: 12 }} placeholder="Lưu ý đặc biệt cho nhân viên kho..." value={form.ghiChu} onChange={e => setForm({...form, ghiChu: e.target.value})} />
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
