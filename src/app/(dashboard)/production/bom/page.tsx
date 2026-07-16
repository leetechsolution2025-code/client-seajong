"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";


export default function BOMPage() {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [bomData, setBomData] = useState<any>({
    code: "",
    tenDinhMuc: "",
    vatTu: []
  });
  const [loadingBom, setLoadingBom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDeleteBom, setShowConfirmDeleteBom] = useState(false);
  const [deletingBom, setDeletingBom] = useState(false);

  // Material selection state
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchMaterial, setSearchMaterial] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listGroupRef = useRef<HTMLDivElement>(null);


  // Swap material state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [swapOptions, setSwapOptions] = useState<any[]>([]);

  useEffect(() => {
    if (showSwapModal) {
      fetch(`/api/production/materials?search=${encodeURIComponent(swapSearch)}&page=1`)
        .then(res => res.json())
        .then(data => setSwapOptions(data.items || []))
        .catch(console.error);
    }
  }, [swapSearch, showSwapModal]);

  const [swapCounts, setSwapCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (bomData?.vatTu?.length > 0) {
      bomData.vatTu.forEach((row: any) => {
        let query = "";
        if (row.material?.code) {
          const match = row.material.code.match(/^[a-zA-Z]+/);
          if (match) query = match[0];
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
          
          fetch(`/api/production/materials?search=${encodeURIComponent(query)}&page=1`)
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
    defaultWarehouse: "KHO-THANHPHAM",
    notes: ""
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Price setup state
  const [showPriceOffcanvas, setShowPriceOffcanvas] = useState(false);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [loadingMarketPrice, setLoadingMarketPrice] = useState(false);
  const [priceSetup, setPriceSetup] = useState({ cost: 0, haoHutPct: 5, chiPhiSxPct: 20, marginPct: 30, finalPrice: 0 });
  const [applyAllPrice, setApplyAllPrice] = useState(false);
  useEffect(() => {
    fetch("/api/plan-finance/categories?type=nhom_san_pham")
      .then(res => res.json())
      .then(data => setProductGroups(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (newProduct.categoryId) {
      fetch(`/api/production/manufactured-products/generate-code?categoryId=${newProduct.categoryId}`)
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
    setNewProduct({ code: "", name: "", categoryId: "", unit: "bộ", defaultWarehouse: "KHO-THANHPHAM", notes: "" });
    setEditProductId(null);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name.trim()) {
      toastError("Lỗi", "Vui lòng nhập tên sản phẩm");
      return;
    }
    setSavingProduct(true);
    try {
      const url = editProductId ? `/api/production/manufactured-products/${editProductId}` : "/api/production/manufactured-products";
      const method = editProductId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
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
      const res = await fetch(`/api/production/manufactured-products/${editProductId}`, {
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
      const res = await fetch(`/api/production/manufactured-products?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Không thể tải danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  }, [search]);

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

  const fetchBom = async (bomId: string | null, product: any = null) => {
    if (!bomId) {
      const nextIndex = (product?.dinhMucs?.length || 0) + 1;
      const nextSuffix = String(nextIndex).padStart(2, '0');
      setBomData({
        id: undefined,
        code: `DM-${product?.code || Date.now()}-${nextSuffix}`,
        tenDinhMuc: `Định mức ${product?.name || ""}`,
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
      name: product.name || "",
      categoryId: product.categoryId || "",
      unit: product.unit || "bộ",
      defaultWarehouse: product.defaultWarehouse || "KHO-THANHPHAM",
      notes: product.notes || ""
    });
  };

  const handleDeleteBom = async () => {
    if (!bomData.id) return;
    setDeletingBom(true);
    try {
      const res = await fetch(`/api/production/manufactured-products/${selectedProduct.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa định mức");
        setShowConfirmDeleteBom(false);
        fetchProducts(); // Refresh list to update badge/list

        // Reload selected product
        const updatedRes = await fetch(`/api/production/manufactured-products?search=${selectedProduct.code}`);
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
            manufacturedProductId: selectedProduct.id
          })
        });
      }

      if (res.ok) {
        const savedBom = await res.json();
        toastSuccess("Thành công", "Lưu định mức thành công");
        fetchProducts(); // Refresh to update badge

        // Fetch new product info to update selectedProduct dinhMucId
        const updatedRes = await fetch(`/api/production/manufactured-products?search=${selectedProduct.code}`);
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
      const res = await fetch(`/api/production/materials?search=${encodeURIComponent(q)}&page=1`);
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
              <div className="fw-medium text-truncate" title={row.name}>
                {row.name}
              </div>
              {count > 0 && (
                <span className="badge bg-success rounded-circle p-0 d-flex align-items-center justify-content-center text-white flex-shrink-0" style={{ width: 16, height: 16, fontSize: '10px' }}>{count}</span>
              )}
            </div>
            {count === 0 && (
              <div className="mt-1">
                <span className="badge rounded-pill bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25" style={{ fontSize: "0.6rem", padding: "0.15em 0.4em", fontWeight: 500 }}>Chưa có định mức</span>
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
    >
      <div className="bg-white rounded-4 shadow-sm border w-100" style={{ height: "calc(100vh - 150px)", overflow: "hidden" }}>
        <div className="row g-0 h-100">
          {/* LEFT COLUMN: PRODUCT LIST */}
          <div className="col-12 col-md-4 col-lg-4 d-flex flex-column position-relative" style={{ padding: "20px", height: "100%" }}>
            {/* Divider line with gap at top and bottom */}
            <div className="position-absolute border-end d-none d-md-block" style={{ right: 0, top: "24px", bottom: "24px", width: 1, borderColor: "var(--border) !important" }}></div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <SectionTitle title="Sản phẩm sản xuất" icon="bi-box" className="mb-0" />
              <button className="btn btn-sm btn-primary" onClick={() => { resetProductForm(); setShowAddProduct(true); }}>
                <i className="bi bi-plus-lg"></i>
              </button>
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
                      const calculated = Math.round(priceSetup.cost * (1 + val / 100));
                      setPriceSetup(prev => ({ ...prev, marginPct: val, finalPrice: calculated }));
                    }} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium text-primary">Giá bán tính toán (Giá vốn + Lợi nhuận)</label>
                  <input type="text" className="form-control text-primary fw-bold bg-light" disabled value={`${Math.round(priceSetup.cost * (1 + priceSetup.marginPct / 100)).toLocaleString()} đ`} />
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
                    fetch("/api/production/manufactured-products/apply-price-all", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ marginPct: priceSetup.marginPct })
                    }).then(res => res.json()).then(data => {
                      if (data.success) {
                        toastSuccess("Thành công", `Đã cập nhật giá bán cho ${data.updatedCount} sản phẩm`);
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

            <div className="mb-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm mã, tên sản phẩm..."
              />
            </div>
            <div className="flex-grow-1 overflow-auto pe-2">
              <Table
                columns={productColumns}
                rows={products}
                loading={loadingProducts}
                compact={true}
                fixedLayout={false}
                wrapperStyle={{ overflowX: "hidden" }}
                onRowClick={handleSelectProduct}
                rowClassName={(row: any) => row.id === selectedProduct?.id ? "table-active cursor-pointer" : "cursor-pointer"}
              />
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
                    <h5 className="fw-bold text-primary mb-0">{selectedProduct.name}</h5>
                    <button
                      className="btn btn-sm btn-light text-muted border-0 py-0 px-2"
                      onClick={() => {
                        setEditProductId(selectedProduct.id);
                        setNewProduct({
                          code: selectedProduct.code || "",
                          name: selectedProduct.name || "",
                          categoryId: selectedProduct.categoryId || "",
                          unit: selectedProduct.unit || "bộ",
                          defaultWarehouse: selectedProduct.defaultWarehouse || "KHO-THANHPHAM",
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
                    <span><i className="bi bi-tag me-1"></i>ĐVT: {selectedProduct.unit}</span>
                    <span><i className="bi bi-building me-1"></i>Kho: {selectedProduct.defaultWarehouse || "N/A"}</span>
                  </div>
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
                            finalPrice: Math.round(finalP / 1000) * 1000
                          });

                          setMarketPrice(null);
                          setLoadingMarketPrice(true);
                          fetch(`/api/production/market-price?name=${encodeURIComponent(selectedProduct.name)}`)
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
                            const nextIndex = (selectedProduct?.dinhMucs?.length || 0) + 1;
                            const nextSuffix = String(nextIndex).padStart(2, '0');
                            setBomData((prev: any) => ({
                              ...prev,
                              id: undefined,
                              code: `DM-${selectedProduct?.code || Date.now()}-${nextSuffix}`,
                              tenDinhMuc: `${prev.tenDinhMuc || selectedProduct?.name || ""} (Bản sao)`
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
                    <label className="form-label small text-muted">Tên Định Mức</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={bomData.tenDinhMuc || ""}
                      onChange={e => setBomData({ ...bomData, tenDinhMuc: e.target.value })}
                    />
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
                        title="Xóa định mức"
                      >
                        <i className="bi bi-trash"></i> Xóa
                      </button>
                    )}
                    <button className="btn btn-sm btn-primary" onClick={handleSaveBom} disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}
                      Lưu định mức
                    </button>
                  </div>
                </div>

                <div className="flex-grow-1 overflow-auto bg-light rounded">
                  <div className="table-responsive mkt-plan-table-no-min">
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
                              <td className="align-middle fw-medium" style={{ padding: "6px 8px" }}>
                                {row.tenVatTu}
                              </td>
                              <td className="align-middle" style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  className="form-control form-control-sm border-0 bg-transparent px-1"
                                  value={row.donViTinh}
                                  onChange={e => updateMaterialLine(idx, "donViTinh", e.target.value)}
                                />
                              </td>
                              <td className="align-middle" style={{ padding: "6px 8px" }}>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={row.soLuong}
                                  onChange={e => updateMaterialLine(idx, "soLuong", parseFloat(e.target.value) || 0)}
                                  min="0" step="0.1"
                                />
                              </td>
                              <td className="text-center align-middle" style={{ padding: "6px 8px" }}>
                                <div className="d-flex align-items-center justify-content-center gap-1">
                                  {(() => {
                                    let query = "";
                                    if (row.material?.code) {
                                      const match = row.material.code.match(/^[a-zA-Z]+/);
                                      if (match) query = match[0];
                                    }
                                    
                                    const count = query ? (swapCounts[query] || 0) : 0;
                                    const isDisabled = count !== -1 && count <= 1;
                                    return (
                                      <button 
                                        className={`btn btn-sm btn-light text-primary p-1 ${isDisabled ? 'opacity-25' : ''}`} 
                                        title={isDisabled ? "Không có vật tư cùng loại" : "Đổi vật tư"}
                                        disabled={isDisabled}
                                        onClick={() => {
                                          setSwapIndex(idx);
                                          setSwapSearch(query || "");
                                          setShowSwapModal(true);
                                        }}
                                      >
                                        <i className="bi bi-arrow-left-right"></i>
                                      </button>
                                    );
                                  })()}
                                  <button className="btn btn-sm btn-light text-danger p-1" onClick={() => removeMaterialLine(idx)} title="Xóa">
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

      {/* Swap Material Modal */}
      {showSwapModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom-0 bg-light">
                <h6 className="modal-title fw-bold text-primary d-flex align-items-center gap-2">
                  <i className="bi bi-arrow-left-right"></i> Đổi vật tư / Hàng hoá cùng loại
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowSwapModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control form-control-lg bg-light"
                    placeholder="Tìm kiếm vật tư thay thế..."
                    value={swapSearch}
                    onChange={e => setSwapSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="form-text text-muted small mt-2">
                    <i className="bi bi-lightbulb text-warning me-1"></i>
                    Gợi ý tự động dựa trên các ký tự đầu mã định danh
                  </div>
                </div>
                
                <div className="list-group list-group-flush border rounded-3 custom-scrollbar" style={{ height: "300px", overflowY: "auto" }}>
                  {swapOptions.length === 0 ? (
                    <div className="text-center text-muted small py-5 d-flex flex-column align-items-center">
                      <i className="bi bi-search display-6 text-light mb-2"></i>
                      Không tìm thấy vật tư phù hợp
                    </div>
                  ) : (
                    swapOptions.map((m: any) => (
                      <button
                        key={m.id}
                        className="list-group-item list-group-item-action py-2 px-3 border-bottom"
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
                            <div className="fw-semibold text-dark mb-0">{m.tenHang || m.name}</div>
                            <div className="text-muted d-flex gap-3 mt-1" style={{ fontSize: "0.75rem" }}>
                              <span><i className="bi bi-upc-scan me-1"></i> {m.code}</span>
                              <span><i className="bi bi-tag me-1"></i> {m.donVi || m.unit}</span>
                              <span><i className="bi bi-cash me-1"></i> {(m.giaNhap || m.price || 0).toLocaleString()} đ</span>
                            </div>
                          </div>
                          <div className="btn btn-sm btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                            <i className="bi bi-arrow-left-right"></i>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </StandardPage>
  );
}
