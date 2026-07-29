"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import BomDiffOffcanvas from "@/components/production/BomDiffOffcanvas";


export default function BOMPage() {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [bomData, setBomData] = useState<any>({
    code: "",
    tenDinhMuc: "",
    vatTu: []
  });
  const [standardBomData, setStandardBomData] = useState<any>(null);
  const [showBomDiff, setShowBomDiff] = useState(false);
  const [loadingBom, setLoadingBom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDeleteBom, setShowConfirmDeleteBom] = useState(false);
  const [deletingBom, setDeletingBom] = useState(false);

  // Material selection state
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchMaterial, setSearchMaterial] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listGroupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Swap material state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [swapSearchMode, setSwapSearchMode] = useState<"exact" | "group">("exact");
  const [swapSearchText, setSwapSearchText] = useState("");
  const [swapBaseExact, setSwapBaseExact] = useState("");
  const [swapBaseGroup, setSwapBaseGroup] = useState("");
  const [swapBaseOptions, setSwapBaseOptions] = useState<any[]>([]);
  
  const swapOptions = swapBaseOptions.filter(m => 
    !swapSearchText || 
    (m.name || m.tenHang || "").toLowerCase().includes(swapSearchText.toLowerCase()) || 
    (m.code || "").toLowerCase().includes(swapSearchText.toLowerCase())
  );

  useEffect(() => {
    if (showSwapModal) {
      if (swapSearchMode === "exact" && !swapBaseExact) {
        setSwapBaseOptions([]);
        return;
      }
      if (swapSearchMode === "group" && !swapBaseGroup) {
        setSwapBaseOptions([]);
        return;
      }

      let url = `/api/logistics/inventory?page=1&nolimit=true`;
      if (swapSearchMode === "exact") {
        url += `&exactCode=${encodeURIComponent(swapBaseExact)}`;
      } else if (swapSearchMode === "group") {
        url += `&categoryId=${encodeURIComponent(swapBaseGroup)}`;
      }
      
      fetch(url)
        .then(res => res.json())
        .then(data => setSwapBaseOptions(data.items || []))
        .catch(console.error);
    }
  }, [swapBaseExact, swapBaseGroup, swapSearchMode, showSwapModal]);

  const [swapCounts, setSwapCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (bomData?.vatTu?.length > 0) {
      bomData.vatTu.forEach((row: any) => {
        let query = "";
        if (row.material?.category?.code) {
          query = row.material.category.code;
        }
        
        // Nếu không có mã thì không gợi ý
        if (!query) {
          setSwapCounts(prev => ({ ...prev, [row.id || row.tenVatTu]: 0 }));
          return;
        }
        
        setSwapCounts(prev => {
          if (prev[query] !== undefined) return prev; // Already fetched or fetching
          
          // Mark as fetching with -1 so we don't refetch
          const next = { ...prev, [query]: -1 };
          
          fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&page=1`)
            .then(res => res.json())
            .then(data => {
              setSwapCounts(p => ({ ...p, [query]: data.items?.length || 0 }));
            })
            .catch(() => {
              setSwapCounts(p => ({ ...p, [query]: 0 }));
            });
            
          return next;
        });
      });
    }
  }, [bomData?.vatTu]);

  // New product state
  const [productGroups, setProductGroups] = useState<{ id: string, name: string }[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: "",
    name: "",
    categoryId: "",
    unit: "bộ",
    defaultWarehouse: "KHO-CHINH",
    notes: ""
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Price setup state
  const [showPriceOffcanvas, setShowPriceOffcanvas] = useState(false);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [loadingMarketPrice, setLoadingMarketPrice] = useState(false);
  const [priceSetup, setPriceSetup] = useState({ cost: 0, haoHutPct: 5, chiPhiSxPct: 20, marginPct: 30, marginType: "cost", finalPrice: 0 });
  const [applyAllPrice, setApplyAllPrice] = useState(false);
  useEffect(() => {
    fetch("/api/plan-finance/categories?hasBom=true")
      .then(res => res.json())
      .then(data => setProductGroups(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (newProduct.categoryId) {
      fetch(`/api/logistics/inventory/generate-code?categoryId=${newProduct.categoryId}`)
        .then(res => res.json())
        .then(data => {
          if (data.code) {
            setNewProduct(prev => ({ ...prev, code: data.code }));
          }
        })
        .catch(console.error);
    }
  }, [newProduct.categoryId]);

  const resetProductForm = () => {
    setNewProduct({ code: "", name: "", categoryId: "", unit: "bộ", defaultWarehouse: "KHO-CHINH", notes: "" });
    setEditProductId(null);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name.trim()) {
      toastError("Lỗi", "Vui lòng nhập tên sản phẩm");
      return;
    }
    setSavingProduct(true);
    try {
      const url = "/api/logistics/inventory";
      const method = editProductId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newProduct, id: editProductId || undefined, warehouseCode: "KHO-CHINH" })
      });
      if (res.ok) {
        toastSuccess("Thành công", editProductId ? "Cập nhật sản phẩm thành công" : "Thêm sản phẩm thành công");
        setShowAddProduct(false);
        resetProductForm();
        fetchProducts();
      } else {
        const error = await res.json();
        toastError("Lỗi", error.error || "Thất bại");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editProductId) return;
    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/logistics/inventory/${editProductId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa sản phẩm");
        setShowAddProduct(false);
        setShowConfirmDelete(false);
        resetProductForm();
        fetchProducts();
        if (selectedProduct?.id === editProductId) {
          setSelectedProduct(null);
        }
      } else {
        const errorData = await res.json();
        toastError("Lỗi", errorData.error || "Không thể xóa sản phẩm");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setDeletingProduct(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/logistics/inventory?warehouseCode=KVP&limit=20&page=${page}&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / 20)));
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Không thể tải danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  }, [search, filterCategoryId, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      const first = products[0];
      setSelectedProduct(first);
      if (first.dinhMucs && first.dinhMucs.length > 0) {
        fetchBom(first.dinhMucs[0].id);
      } else {
        fetchBom(null, first);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.dinhMucs?.length > 0) {
      const standardBomCode = `DM-${selectedProduct.code}`;
      const standardBom = selectedProduct.dinhMucs.find((dm: any) => dm.code === standardBomCode);
      const targetId = standardBom?.id || selectedProduct.dinhMucs[0].id;
      
      fetch(`/api/production/bom/${targetId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setStandardBomData(data);
          else setStandardBomData(null);
        })
        .catch(console.error);
    } else {
      setStandardBomData(null);
    }
  }, [selectedProduct]);

  const isStandardBom = bomData?.code === `DM-${selectedProduct?.code}`;
  
  const isSameAsStandard = useMemo(() => {
    if (isStandardBom) return false;
    if (!standardBomData || !bomData.vatTu) return false;
    
    const standardVatTu = standardBomData.vatTu || [];
    const currentVatTu = bomData.vatTu || [];
    
    if (standardVatTu.length !== currentVatTu.length) return false;
    
    const stdMap = new Map();
    standardVatTu.forEach((v: any) => stdMap.set(v.material?.code || v.maVatTu, v.soLuong));
    
    for (const v of currentVatTu) {
      const key = v.material?.code || v.maVatTu;
      if (!stdMap.has(key)) return false;
      if (stdMap.get(key) !== v.soLuong) return false;
    }
    
    return true;
  }, [bomData.vatTu, standardBomData, isStandardBom]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setSaving(true);
    try {
      const res = await fetch("/api/production/bom/import-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        let msg = `Đã nhập thành công. Tạo mới ${data.bomsCreated}, Cập nhật ${data.bomsUpdated} định mức, thêm ${data.componentsAdded} vật tư.`;
        toastSuccess("Import thành công", msg);
        if (data.missingProducts?.length > 0) {
          toastInfo("Cảnh báo", `Bỏ qua ${data.missingProducts.length} mã sản phẩm không tồn tại: ${data.missingProducts.join(", ")}`);
        }
        if (data.missingMaterials?.length > 0) {
          toastInfo("Cảnh báo", `Thêm ${data.missingMaterials.length} mã vật tư không có trong hệ thống (lưu dạng text).`);
        }
        setSelectedProduct(null); // Xoá lựa chọn hiện tại để tự động load lại dữ liệu mới nhất
        fetchProducts();
      } else {
        toastError("Lỗi Import", data.error || "Có lỗi xảy ra khi import");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchBom = async (bomId: string | null, product: any = null) => {
    if (!bomId) {
      const nextIndex = (product?.dinhMucs?.length || 0) + 1;
      const nextSuffix = String(nextIndex).padStart(2, '0');
      setBomData({
        id: undefined,
        code: `DM-${product?.code || Date.now()}-${nextSuffix}`,
        tenDinhMuc: `Định mức ${(product?.tenHang || product?.name) || ""}`,
        vatTu: []
      });
      return;
    }
    setLoadingBom(true);
    try {
      const res = await fetch(`/api/production/bom/${bomId}`);
      if (res.ok) {
        const data = await res.json();
        setBomData(data);
      } else {
        toastError("Lỗi", "Không tìm thấy định mức");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi khi tải định mức");
    } finally {
      setLoadingBom(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    if (product.dinhMucs && product.dinhMucs.length > 0) {
      fetchBom(product.dinhMucs[0].id);
    } else {
      fetchBom(null, product);
    }
    setEditProductId(product.id);
    setNewProduct({
      code: product.code || "",
      name: (product.tenHang || product.name) || "",
      categoryId: product.categoryId || "",
      unit: (product.donVi || product.unit) || "bộ",
      defaultWarehouse: product.defaultWarehouse || "KHO-CHINH",
      notes: product.notes || ""
    });
  };

  const handleDeleteBom = async () => {
    if (!bomData.id) return;
    setDeletingBom(true);
    try {
      const res = await fetch(`/api/production/bom/${bomData.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa định mức");
        setShowConfirmDeleteBom(false);
        fetchProducts(); // Refresh list to update badge/list

        // Reload selected product
        const updatedRes = await fetch(`/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}`);
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          const match = updatedData.items.find((p: any) => p.id === selectedProduct.id);
          if (match) {
            setSelectedProduct(match);
            fetchBom(match.dinhMucs?.[0]?.id || null, match);
          }
        }
      } else {
        const errorData = await res.json();
        toastError("Lỗi", errorData.error || "Không thể xóa định mức");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setDeletingBom(false);
    }
  };

  const handleSaveBom = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      let res;
      if (bomData.id) {
        res = await fetch(`/api/production/bom/${selectedProduct?.id || bomData?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bomData)
        });
      } else {
        res = await fetch(`/api/production/bom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bomData,
            materialItemId: selectedProduct.id
          })
        });
      }

      if (res.ok) {
        const savedBom = await res.json();
        toastSuccess("Thành công", "Lưu định mức thành công");
        fetchProducts(); // Refresh to update badge

        // Fetch new product info to update selectedProduct dinhMucId
        const updatedRes = await fetch(`/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}`);
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          const match = updatedData.items.find((p: any) => p.id === selectedProduct.id);
          if (match) {
            setSelectedProduct(match);
            fetchBom(savedBom?.id || bomData.id || match.dinhMucs?.[0]?.id || null, match);
          }
        }
      } else {
        toastError("Lỗi", "Lưu định mức thất bại");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  // Add material line
  const fetchMaterials = async (q: string) => {
    try {
      const res = await fetch(`/api/logistics/inventory?search=${encodeURIComponent(q)}&page=1`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMaterials(searchMaterial);
  }, [searchMaterial]);

  const addMaterialLine = (material: any) => {
    if (bomData.vatTu.find((v: any) => v.materialId === material.id)) {
      toastError("Lỗi", "Vật tư này đã có trong định mức");
      return;
    }
    setBomData((prev: any) => ({
      ...prev,
      vatTu: [
        ...prev.vatTu,
        {
          materialId: material.id,
          tenVatTu: material.tenHang || material.name,
          soLuong: 1,
          donViTinh: material.donVi || material.unit || "cái",
          ghiChu: "",
          material: material
        }
      ]
    }));
  };

  const removeMaterialLine = (index: number) => {
    setBomData((prev: any) => {
      const newVatTu = [...prev.vatTu];
      newVatTu.splice(index, 1);
      return { ...prev, vatTu: newVatTu };
    });
  };

  const updateMaterialLine = (index: number, field: string, value: any) => {
    setBomData((prev: any) => {
      const newVatTu = [...prev.vatTu];
      newVatTu[index] = { ...newVatTu[index], [field]: value };
      return { ...prev, vatTu: newVatTu };
    });
  };

  const productColumns: TableColumn<any>[] = [
    {
      header: "Tên sản phẩm",
      width: "100%",
      render: (row: any) => {
        const count = row.dinhMucs?.length || 0;
        return (
          <div className="d-flex flex-column align-items-start w-100">
            <div className="d-flex align-items-center gap-2 w-100">
              <div className="fw-medium text-truncate" title={(row.tenHang || row.name)}>
                {(row.tenHang || row.name)}
              </div>
              {count > 0 && (
                <span className="badge bg-success rounded-circle p-0 d-flex align-items-center justify-content-center text-white flex-shrink-0" style={{ width: 16, height: 16, fontSize: '10px' }}>{count}</span>
              )}
            </div>
            {count === 0 && (
              <div className="mt-1">
                <span className="badge rounded-pill bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: "0.6rem", padding: "0.15em 0.4em", fontWeight: 500 }}>Chưa có định mức</span>
              </div>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <StandardPage
      title="Xây dựng định mức"
      description="Thiết lập định mức nguyên vật liệu (BOM) cho sản phẩm sản xuất"
      icon="bi-diagram-3"
      color="indigo"
      useCard={false}
      hideTicker={true}
    >
      <div className="bg-white rounded-4 shadow-sm border w-100 h-100 d-flex flex-column" style={{ overflow: "hidden" }}>
        <div className="row g-0 h-100">
          {/* LEFT COLUMN: PRODUCT LIST */}
          <div className="col-12 col-md-4 col-lg-4 d-flex flex-column position-relative" style={{ padding: "20px", height: "100%" }}>
            {/* Divider line with gap at top and bottom */}
            <div className="position-absolute border-end d-none d-md-block" style={{ right: 0, top: "24px", bottom: "24px", width: 1, borderColor: "var(--border) !important" }}></div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <SectionTitle title={<>Sản phẩm sản xuất <span className="badge bg-primary rounded-pill ms-2" style={{fontSize: "0.75rem", transform: "translateY(-2px)"}}>{products.length}</span></>} icon="bi-box" className="mb-0" />
              <div className="d-flex gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="d-none"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                />
                <button
                  className="btn btn-sm btn-outline-success"
                  title="Import Excel"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                >
                  <i className="bi bi-upload"></i>
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => { resetProductForm(); setShowAddProduct(true); }}>
                  <i className="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>

            {/* Offcanvas Add Product */}
            <div className={`offcanvas offcanvas-end shadow ${showAddProduct ? "show" : ""}`} tabIndex={-1} style={{ width: "400px", visibility: showAddProduct ? "visible" : "hidden", zIndex: 1050 }}>
              <div className="offcanvas-header border-bottom">
                <h6 className="offcanvas-title fw-bold">{editProductId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</h6>
                <button type="button" className="btn-close" onClick={() => { setShowAddProduct(false); resetProductForm(); }}></button>
              </div>
              <div className="offcanvas-body">
                <div className="row g-3 mb-3">
                  <div className="col-4">
                    <label className="form-label small fw-medium">Mã sản phẩm</label>
                    <input type="text" className="form-control" placeholder="VD: 01S" value={newProduct.code} onChange={e => setNewProduct({ ...newProduct, code: e.target.value })} />
                  </div>
                  <div className="col-8">
                    <label className="form-label small fw-medium">Nhóm sản phẩm</label>
                    <select
                      className="form-select"
                      value={(newProduct as any).categoryId || ""}
                      onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value } as any)}
                    >
                      <option value="">Chọn nhóm...</option>
                      {productGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-medium text-danger">Tên sản phẩm *</label>
                  <input type="text" className="form-control" placeholder="Nhập tên sản phẩm..." value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label small fw-medium">Đơn vị tính</label>
                    <input type="text" className="form-control" placeholder="bộ" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Kho mặc định</label>
                    <input type="text" className="form-control" disabled value="Kho thành phẩm" />
                  </div>
                </div>
              </div>
              <div className="offcanvas-footer p-3 border-top mt-auto bg-light">
                {editProductId ? (
                  <div className="d-flex gap-2">
                    <button className="btn btn-danger flex-grow-0" onClick={() => setShowConfirmDelete(true)} title="Xóa">
                      <i className="bi bi-trash"></i>
                    </button>
                    <button className="btn btn-primary flex-grow-1" onClick={handleSaveProduct} disabled={savingProduct}>
                      {savingProduct ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}
                      Cập nhật
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-primary w-100" onClick={handleSaveProduct} disabled={savingProduct}>
                    {savingProduct ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}
                    Lưu sản phẩm
                  </button>
                )}
              </div>
            </div>
            {showAddProduct && <div className="offcanvas-backdrop fade show" onClick={() => { setShowAddProduct(false); resetProductForm(); }} style={{ zIndex: 1040 }}></div>}

            {/* Offcanvas Update Price */}
            <div className={`offcanvas offcanvas-end shadow ${showPriceOffcanvas ? "show" : ""}`} tabIndex={-1} style={{ width: "400px", visibility: showPriceOffcanvas ? "visible" : "hidden", zIndex: 1050 }}>
              <div className="offcanvas-header border-bottom">
                <h6 className="offcanvas-title fw-bold">Tính và cập nhật giá bán</h6>
                <button type="button" className="btn-close" onClick={() => setShowPriceOffcanvas(false)}></button>
              </div>
              <div className="offcanvas-body">
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-medium">Giá vốn vật tư</label>
                    <input type="text" className="form-control bg-light" disabled value={`${Math.round(priceSetup.cost).toLocaleString()} đ`} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Lợi nhuận kỳ vọng (%)</label>
                    <input type="number" step="0.1" className="form-control" value={priceSetup.marginPct} onChange={(e) => {
                      const val = Number(e.target.value);
                      const calculated = priceSetup.marginType === "revenue" 
                        ? (val < 100 ? Math.round(priceSetup.cost / (1 - val / 100)) : 0)
                        : Math.round(priceSetup.cost * (1 + val / 100));
                      setPriceSetup(prev => ({ ...prev, marginPct: val, finalPrice: calculated }));
                    }} />
                  </div>
                  <div className="col-12 mt-2">
                    <label className="form-label small fw-medium">Phương pháp tính lợi nhuận</label>
                    <select className="form-select form-select-sm" value={priceSetup.marginType} onChange={(e) => {
                      const newType = e.target.value;
                      const calculated = newType === "revenue" 
                        ? (priceSetup.marginPct < 100 ? Math.round(priceSetup.cost / (1 - priceSetup.marginPct / 100)) : 0)
                        : Math.round(priceSetup.cost * (1 + priceSetup.marginPct / 100));
                      setPriceSetup(prev => ({ ...prev, marginType: newType, finalPrice: calculated }));
                    }}>
                      <option value="cost">Trên giá vốn (Giá bán = Giá vốn x (1 + %Lợi nhuận))</option>
                      <option value="revenue">Trên doanh thu (Giá bán = Giá vốn / (1 - %Lợi nhuận))</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium text-primary">Giá bán tính toán</label>
                  <input type="text" className="form-control text-primary fw-bold bg-light" disabled value={`${(priceSetup.marginType === "revenue" ? (priceSetup.marginPct < 100 ? Math.round(priceSetup.cost / (1 - priceSetup.marginPct / 100)) : 0) : Math.round(priceSetup.cost * (1 + priceSetup.marginPct / 100))).toLocaleString()} đ`} />
                </div>
                <hr className="my-3" />
                <div className="mb-3">
                  <label className="form-label small fw-bold text-success">Giá bán chính thức áp dụng *</label>
                  <input type="text" className="form-control form-control-lg text-success fw-bold" value={(priceSetup.finalPrice || 0).toLocaleString()} onChange={(e) => {
                    const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                    setPriceSetup(prev => ({ ...prev, finalPrice: val }));
                  }} />
                  <div className="form-text text-muted" style={{ fontSize: '11px' }}>
                    {loadingMarketPrice ? (
                      <span><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" style={{width: '10px', height: '10px'}}></span> Đang tra cứu giá thị trường...</span>
                    ) : (
                      marketPrice ? `Giá phổ biến trên thị trường: ${marketPrice.toLocaleString()} đồng. Giá trị này chỉ mang tính tham khảo.` : "Giá phổ biến trên thị trường: Không rõ. Giá trị này chỉ mang tính tham khảo."
                    )}
                  </div>
                </div>
              </div>
              <div className="offcanvas-footer p-3 border-top mt-auto bg-light">
                <div className="form-check mb-2 text-start">
                  <input className="form-check-input" type="checkbox" id="applyAllPrice" checked={applyAllPrice} onChange={e => setApplyAllPrice(e.target.checked)} />
                  <label className="form-check-label small" htmlFor="applyAllPrice">
                    Áp dụng cho tất cả sản phẩm
                  </label>
                </div>
                <button className="btn btn-success w-100" onClick={() => {
                  if (applyAllPrice) {
                    toastInfo("Đang xử lý", "Đang tính toán và áp dụng cho tất cả...");
                    fetch("/api/logistics/inventory/update-price-ratio", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ marginPct: priceSetup.marginPct, marginType: priceSetup.marginType })
                    }).then(res => res.json()).then(data => {
                      if (data.success) {
                        toastSuccess("Thành công", `Đã cập nhật giá bán cho ${data.updatedCount} sản phẩm`);
                        setSelectedProduct((prev: any) => prev ? { ...prev, giaBan: priceSetup.finalPrice } : prev);
                        fetchProducts();
                        setShowPriceOffcanvas(false);
                      } else {
                        toastError("Lỗi", data.error || "Có lỗi xảy ra");
                      }
                    }).catch(e => {
                      console.error(e);
                      toastError("Lỗi", "Lỗi kết nối máy chủ");
                    });
                    return;
                  }

                  fetch(`/api/production/bom/${bomData.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ giaBan: priceSetup.finalPrice })
                  })
                    .then(async res => {
                      if (res.ok) {
                        setSelectedProduct((prev: any) => prev ? { ...prev, giaBan: priceSetup.finalPrice } : prev);
                        fetchProducts(); // Refresh list to get updated giaBan
                        setShowPriceOffcanvas(false);
                        toastSuccess("Thành công", "Cập nhật giá bán thành công");
                      } else {
                        const data = await res.json().catch(() => ({}));
                        toastError("Lỗi", data.error || "Có lỗi xảy ra khi lưu giá bán");
                      }
                    })
                    .catch(e => {
                      console.error("Lưu giá bán lỗi:", e);
                      toastError("Lỗi", "Lỗi kết nối máy chủ");
                    });
                }}>
                  <i className="bi bi-check2-circle me-2"></i>
                  Lưu giá bán
                </button>
              </div>
            </div>
            {showPriceOffcanvas && <div className="offcanvas-backdrop fade show" onClick={() => setShowPriceOffcanvas(false)} style={{ zIndex: 1040 }}></div>}

            <div className="mb-3 d-flex gap-2">
              <select
                className="form-select form-select-sm"
                style={{ width: "200px" }}
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
              >
                <option value="">-- Tất cả nhóm hàng --</option>
                {productGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <div className="flex-grow-1">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Tìm kiếm hàng hoá..."
                />
              </div>
            </div>
            <div className="flex-grow-1 d-flex flex-column pe-2" style={{ minHeight: 0 }}>
              <Table
                columns={productColumns}
                rows={products}
                loading={loadingProducts}
                compact={true}
                fixedLayout={false}
                wrapperStyle={{ overflowX: "hidden", overflowY: "auto", flexGrow: 1 }}
                onRowClick={handleSelectProduct}
                rowClassName={(row: any) => row.id === selectedProduct?.id ? "table-active cursor-pointer" : "cursor-pointer"}
              />
              {totalPages > 1 && (
                <div className="mt-3">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: BOM EDITOR */}
          <div className="col-12 col-md-8 col-lg-8 d-flex flex-column bg-white" style={{ padding: "24px", height: "100%", fontSize: "0.9rem" }}>
            {!selectedProduct ? (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                <div className="text-center">
                  <i className="bi bi-box-seam display-1 mb-3"></i>
                  <h5>Chọn một sản phẩm để xem và chỉnh sửa định mức</h5>
                </div>
              </div>
            ) : loadingBom ? (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <div className="d-flex flex-column h-100">
                <div className="mb-3 pb-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h5 className="fw-bold text-primary mb-0">{(selectedProduct.tenHang || selectedProduct.name)}</h5>
                    <button
                      className="btn btn-sm btn-light text-muted border-0 py-0 px-2"
                      onClick={() => {
                        setEditProductId(selectedProduct.id);
                        setNewProduct({
                          code: selectedProduct.code || "",
                          name: (selectedProduct.tenHang || selectedProduct.name) || "",
                          categoryId: selectedProduct.categoryId || "",
                          unit: (selectedProduct.donVi || selectedProduct.unit) || "bộ",
                          defaultWarehouse: selectedProduct.defaultWarehouse || "KHO-CHINH",
                          notes: selectedProduct.notes || ""
                        });
                        setShowAddProduct(true);
                      }}
                      title="Cập nhật sản phẩm"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-3 text-muted small mb-1">
                    <span><i className="bi bi-upc-scan me-1"></i>Mã: {selectedProduct.code || "N/A"}</span>
                    <span><i className="bi bi-tag me-1"></i>ĐVT: {(selectedProduct.donVi || selectedProduct.unit)}</span>
                    <span><i className="bi bi-building me-1"></i>Kho: {selectedProduct.defaultWarehouse || "N/A"}</span>
                  </div>
                  {bomData?.id && (
                    <div className="d-flex flex-wrap gap-3 align-items-center bg-light px-2 py-1 rounded w-100 mt-1">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Giá vốn vật tư:</span>
                        <span className="fw-bold text-dark me-3">
                          {bomData.vatTu.reduce((sum: number, item: any) => sum + (Number(item.soLuong) || 0) * (item.material?.price || item.material?.giaNhap || 0), 0).toLocaleString()} đ
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Giá bán đề xuất:</span>
                        <span className="fw-bold text-success">{selectedProduct.giaBan ? `${selectedProduct.giaBan.toLocaleString()} đ` : "--- đ"}</span>
                        <button
                          className="btn btn-sm btn-outline-success py-0 px-2"
                          title="Cập nhật giá bán"
                          onClick={() => {
                            const cost = bomData.vatTu.reduce((sum: number, item: any) => sum + (Number(item.soLuong) || 0) * (item.material?.price || item.material?.giaNhap || 0), 0);
                            const suggested = Math.round((cost * 1.30) / 1000) * 1000; // Default 30% margin, rounded to thousands
                            const finalP = selectedProduct.giaBan || suggested;
                            setPriceSetup({
                              cost,
                              haoHutPct: 0,
                              chiPhiSxPct: 0,
                              marginPct: 30,
                              marginType: "cost",
                              finalPrice: Math.round(finalP / 1000) * 1000
                            });

                            setMarketPrice(null);
                            setLoadingMarketPrice(true);
                            fetch(`/api/production/market-price?name=${encodeURIComponent((selectedProduct.tenHang || selectedProduct.name))}`)
                              .then(res => res.json())
                              .then(data => setMarketPrice(data.price))
                              .catch(() => setMarketPrice(null))
                              .finally(() => setLoadingMarketPrice(false));

                            setShowPriceOffcanvas(true);
                          }}
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="row mb-4">
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Mã định mức</label>
                    {bomData.id ? (
                      <select
                        className="form-select form-select-sm"
                        value={bomData.id}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "NEW") {
                            const nextIndex = selectedProduct?.dinhMucs?.length || 1;
                            const nextSuffix = String(nextIndex).padStart(2, '0');
                            setBomData((prev: any) => ({
                              ...prev,
                              id: undefined,
                              code: `DM-${selectedProduct?.code || Date.now()}-${nextSuffix}`,
                              tenDinhMuc: `Biến thể của định mức tiêu chuẩn ${(selectedProduct?.tenHang || selectedProduct?.name) || ""}`
                            }));
                          } else {
                            fetchBom(val);
                          }
                        }}
                      >
                        {selectedProduct.dinhMucs?.map((dm: any) => (
                          <option key={dm.id} value={dm.id}>{dm.code}</option>
                        ))}
                        <option value="NEW">+ Tạo định mức mới</option>
                      </select>
                    ) : (
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={bomData.code || ""}
                          onChange={e => setBomData({ ...bomData, code: e.target.value })}
                          placeholder="Nhập mã ĐM mới"
                        />
                        {selectedProduct.dinhMucs?.length > 0 && (
                          <button className="btn btn-outline-secondary" type="button" onClick={() => fetchBom(selectedProduct.dinhMucs[0].id)}>
                            Hủy
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-md-8">
                    <label className="form-label small text-muted">{isStandardBom ? "Mô tả định mức" : "Mô tả định mức biến thể"}</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control"
                        value={bomData.tenDinhMuc || ""}
                        onChange={e => setBomData({ ...bomData, tenDinhMuc: e.target.value })}
                        disabled={isStandardBom}
                      />
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button"
                        title={isStandardBom ? "Đây là định mức tiêu chuẩn" : "Đối soát vật tư với tiêu chuẩn"}
                        disabled={isStandardBom}
                        onClick={() => setShowBomDiff(true)}
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Thành phần nguyên vật liệu</h6>

                  <div className="d-flex gap-2">
                    {/* Dropdown Add Material */}
                    <div className="dropdown">
                      <button
                        className="btn btn-sm btn-outline-primary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        data-bs-auto-close="outside"
                        onClick={() => {
                          setTimeout(() => {
                            searchInputRef.current?.focus();
                          }, 100);
                        }}
                        disabled={isStandardBom}
                      >
                        <i className="bi bi-plus-lg me-1"></i> Thêm vật tư
                      </button>
                      <div className="dropdown-menu dropdown-menu-end p-3 shadow" style={{ width: "350px", zIndex: 1050 }}>
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="form-control form-control-sm mb-3"
                          placeholder="Tìm kiếm vật tư..."
                          value={searchMaterial}
                          onChange={e => setSearchMaterial(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              const firstBtn = listGroupRef.current?.querySelector('button');
                              if (firstBtn) (firstBtn as HTMLButtonElement).focus();
                            }
                          }}
                        />
                        <div className="list-group list-group-flush" style={{ maxHeight: "300px", overflowY: "auto" }} ref={listGroupRef}>
                          {materials.length === 0 ? (
                            <div className="text-center text-muted small py-3">Không tìm thấy vật tư</div>
                          ) : (
                            materials.map((m: any) => (
                              <button
                                key={m.id}
                                className="list-group-item list-group-item-action py-2 px-1 border-0"
                                onClick={() => {
                                  addMaterialLine(m);
                                  searchInputRef.current?.focus();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    const next = e.currentTarget.nextElementSibling as HTMLButtonElement;
                                    if (next) next.focus();
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    const prev = e.currentTarget.previousElementSibling as HTMLButtonElement;
                                    if (prev) prev.focus();
                                    else searchInputRef.current?.focus();
                                  } else if (e.key === "Enter") {
                                    e.preventDefault();
                                    addMaterialLine(m);
                                    searchInputRef.current?.focus();
                                  }
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <div className="small fw-semibold text-truncate" style={{ maxWidth: "200px" }}>{m.tenHang || m.name}</div>
                                    <div className="text-muted" style={{ fontSize: "0.7rem" }}>Mã: {m.code} | ĐVT: {m.donVi || m.unit}</div>
                                  </div>
                                  <i className="bi bi-plus-circle text-primary"></i>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    {bomData.id && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setShowConfirmDeleteBom(true)}
                        title={bomData.code === `DM-${selectedProduct?.code}` ? "Không thể xoá định mức tiêu chuẩn" : "Xóa định mức"}
                        disabled={bomData.code === `DM-${selectedProduct?.code}`}
                      >
                        <i className="bi bi-trash"></i> Xóa
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-primary" 
                      onClick={handleSaveBom} 
                      disabled={saving || isSameAsStandard || isStandardBom}
                      title={isStandardBom ? "Không thể sửa định mức tiêu chuẩn" : isSameAsStandard ? "Danh sách vật tư trùng khớp hoàn toàn với tiêu chuẩn, vui lòng thay đổi để lưu bản biến thể" : ""}
                    >
                      {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}
                      Lưu định mức
                    </button>
                  </div>
                </div>

                <div className="flex-grow-1 d-flex flex-column bg-light rounded" style={{ minHeight: 0 }}>
                  <div className="table-responsive mkt-plan-table-no-min flex-grow-1 overflow-auto">
                    <table className="table table-hover mb-0 bg-white" style={{ fontSize: "0.8125rem" }}>
                      <thead className="table-light sticky-top">
                        <tr>
                          <th className="text-center" style={{ width: "50px", padding: "6px 8px" }}>STT</th>
                          <th style={{ padding: "6px 8px" }}>Tên vật tư</th>
                          <th style={{ width: "100px", padding: "6px 8px" }}>Đơn vị</th>
                          <th style={{ width: "120px", padding: "6px 8px" }}>Số lượng</th>
                          <th className="text-center" style={{ width: "60px", padding: "6px 8px" }}><i className="bi bi-gear"></i></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomData.vatTu.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4">Chưa có thành phần vật tư nào</td>
                          </tr>
                        ) : (
                          bomData.vatTu.map((row: any, idx: number) => (
                            <tr key={idx}>
                              <td className="text-center align-middle text-muted" style={{ padding: "6px 8px" }}>{idx + 1}</td>
                              <td className="align-middle" style={{ padding: "6px 8px" }}>
                                <div className="fw-medium text-dark">{row.material?.tenHang || row.tenVatTu || "Chưa xác định"}</div>
                                <div className="small text-muted font-monospace mt-1"><i className="bi bi-upc-scan me-1"></i>{row.material?.code || row.maVatTu || "Không có mã"}</div>
                              </td>
                              <td className="align-middle" style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  className="form-control form-control-sm border-0 bg-transparent px-1"
                                  value={row.donViTinh}
                                  onChange={e => updateMaterialLine(idx, "donViTinh", e.target.value)}
                                  disabled={isStandardBom}
                                />
                              </td>
                              <td className="align-middle" style={{ padding: "6px 8px" }}>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={row.soLuong}
                                  onChange={e => updateMaterialLine(idx, "soLuong", parseFloat(e.target.value) || 0)}
                                  min="0" step="0.1"
                                  disabled={isStandardBom}
                                />
                              </td>
                              <td className="text-center align-middle" style={{ padding: "6px 8px" }}>
                                <div className="d-flex align-items-center justify-content-center gap-1">
                                  {(() => {
                                    let query = "";
                                    if (row.material?.category?.code) {
                                      query = row.material.category.code;
                                    }
                                    
                                    const count = query ? (swapCounts[query] || 0) : 0;
                                    const isDisabled = count !== -1 && count <= 1;
                                    return (
                                      <button 
                                        className="btn btn-sm btn-light text-primary p-1" 
                                        title="Đổi vật tư"
                                        onClick={() => {
                                          setSwapIndex(idx);
                                          const rowMaThayThe = row.material?.maThayThe || row.material?.code || "";
                                          const rowCategoryId = row.material?.category?.id || "";
                                          setSwapBaseExact(rowMaThayThe);
                                          setSwapBaseGroup(rowCategoryId);
                                          setSwapSearchMode("exact");
                                          setSwapSearchText("");
                                          setShowSwapModal(true);
                                        }}
                                        disabled={isStandardBom}
                                      >
                                        <i className="bi bi-arrow-left-right"></i>
                                      </button>
                                    );
                                  })()}
                                  <button className="btn btn-sm btn-light text-danger p-1" onClick={() => removeMaterialLine(idx)} title="Xóa" disabled={isStandardBom}>
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDelete}
        title="Xóa sản phẩm"
        message="Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác."
        variant="danger"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleDeleteProduct}
        onCancel={() => setShowConfirmDelete(false)}
        loading={deletingProduct}
      />

      <ConfirmDialog
        open={showConfirmDeleteBom}
        title="Xóa định mức"
        message="Bạn có chắc chắn muốn xóa định mức này không? Hành động này không thể hoàn tác."
        variant="danger"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleDeleteBom}
        onCancel={() => setShowConfirmDeleteBom(false)}
        loading={deletingBom}
      />

      {/* Swap Material Offcanvas */}
      {showSwapModal && (
        <>
          <div className="offcanvas offcanvas-end show border-0 shadow-lg" tabIndex={-1} style={{ width: "400px", visibility: "visible", zIndex: 1055 }}>
            <div className="offcanvas-header border-bottom bg-light">
              <h6 className="offcanvas-title fw-bold text-primary d-flex align-items-center gap-2">
                <i className="bi bi-arrow-left-right"></i> Đổi vật tư / Hàng hoá cùng loại
              </h6>
              <button type="button" className="btn-close shadow-none" onClick={() => setShowSwapModal(false)}></button>
            </div>
            <div className="offcanvas-body p-4 d-flex flex-column h-100">
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control form-control-lg bg-light"
                  placeholder="Tìm kiếm vật tư thay thế..."
                  value={swapSearchText}
                  onChange={e => setSwapSearchText(e.target.value)}
                  autoFocus
                />
                {swapIndex !== null && bomData?.vatTu?.[swapIndex] && (() => {
                  const r = bomData.vatTu[swapIndex];
                  const fullName = r.material?.tenHang || r.material?.name || r.tenVatTu;
                  return (
                    <div className="mt-2 p-2 bg-white rounded border border-light shadow-sm">
                      <div className="text-muted small mb-1 fst-italic">
                        Đang thay đổi cho: <strong className="text-dark">{fullName}</strong>
                      </div>
                      <div className="d-flex flex-wrap gap-3 text-secondary" style={{ fontSize: "0.75rem" }}>
                        <span>Mã TP: <strong className="text-dark">{r.material?.code || "N/A"}</strong></span>
                        <span>Mã nhóm PM: <strong className="text-dark">{r.material?.category?.code || "N/A"}</strong></span>
                        <span>Mã thay thế: <strong className="text-dark">{r.material?.maThayThe || "N/A"}</strong></span>
                      </div>
                    </div>
                  );
                })()}
                <div className="d-flex align-items-center gap-3 mt-2 ms-1">
                  <div className="form-check form-check-inline m-0">
                    <input className="form-check-input" type="radio" name="swapMode" id="modeExact" value="exact" checked={swapSearchMode === "exact"} onChange={() => {
                      setSwapSearchMode("exact");
                    }} />
                    <label className="form-check-label small cursor-pointer" htmlFor="modeExact">Chính xác</label>
                  </div>
                  <div className="form-check form-check-inline m-0">
                    <input className="form-check-input" type="radio" name="swapMode" id="modeGroup" value="group" checked={swapSearchMode === "group"} onChange={() => {
                      setSwapSearchMode("group");
                    }} />
                    <label className="form-check-label small cursor-pointer" htmlFor="modeGroup">Theo nhóm</label>
                  </div>
                </div>
              </div>
              
              <div className="list-group list-group-flush border rounded-3 custom-scrollbar flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }}>
                {swapOptions.length === 0 ? (
                  <div className="text-center text-muted small py-5 d-flex flex-column align-items-center">
                    <i className="bi bi-search display-6 text-light mb-2"></i>
                    Không tìm thấy vật tư phù hợp
                  </div>
                ) : (
                  swapOptions.map((m: any) => (
                    <button
                      key={m.id}
                      className="list-group-item list-group-item-action py-1 px-3 border-bottom"
                      onClick={() => {
                        if (swapIndex !== null) {
                          setBomData((prev: any) => {
                            const newVatTu = [...prev.vatTu];
                            // Chỉ cập nhật các trường liên quan đến vật tư, giữ nguyên số lượng
                            newVatTu[swapIndex] = {
                              ...newVatTu[swapIndex],
                              materialId: m.id,
                              tenVatTu: m.tenHang || m.name,
                              donViTinh: m.donVi || m.unit || "cái",
                              material: m
                            };
                            return { ...prev, vatTu: newVatTu };
                          });
                        }
                        setShowSwapModal(false);
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold text-dark mb-0 lh-sm" style={{ fontSize: "0.85rem" }}>{m.tenHang || m.name}</div>
                          <div className="text-muted d-flex column-gap-3 row-gap-1 mt-1" style={{ fontSize: "0.75rem", flexWrap: "wrap" }}>
                            <span><i className="bi bi-upc-scan me-1"></i> {m.code}</span>
                            <span><i className="bi bi-tag me-1"></i> {m.donVi || m.unit}</span>
                            <span><i className="bi bi-cash me-1"></i> {(m.giaNhap || m.price || 0).toLocaleString()} đ</span>
                            <span><i className="bi bi-box-seam me-1"></i> Tồn kho: <span className={m.soLuong > 0 ? "text-success fw-bold" : "text-danger fw-bold"}>{m.soLuong || 0}</span></span>
                          </div>
                        </div>
                        <div className="btn btn-sm btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center flex-shrink-0 ms-2" style={{ width: 32, height: 32 }}>
                          <i className="bi bi-arrow-left-right"></i>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" onClick={() => setShowSwapModal(false)} style={{ zIndex: 1050 }}></div>
        </>
      )}

      <BomDiffOffcanvas 
        show={showBomDiff} 
        onClose={() => setShowBomDiff(false)} 
        bomData={bomData} 
        standardBomData={standardBomData} 
        productName={(selectedProduct?.tenHang || selectedProduct?.name) || selectedProduct?.tenHang || ""} 
      />
    </StandardPage>
  );
}
