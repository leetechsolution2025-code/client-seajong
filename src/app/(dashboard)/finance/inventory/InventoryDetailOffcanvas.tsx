import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { BOMBuilderModal } from "./BOMBuilderModal";
import toast from "react-hot-toast";

interface InventoryDetailOffcanvasProps {
  show: boolean;
  onClose: () => void;
  item: any;
  isMaterial?: boolean;
  onRefresh?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
}

export function InventoryDetailOffcanvas({ show, onClose, item, isMaterial, onRefresh, onEdit, onDelete }: InventoryDetailOffcanvasProps) {
  const [showBOM, setShowBOM] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceVal, setEditPriceVal] = useState<number | string>(0);
  const [savingPrice, setSavingPrice] = useState(false);

  const [showBOMSlide, setShowBOMSlide] = useState(false);
  const [bomData, setBomData] = useState<any>(null);
  const [loadingBOM, setLoadingBOM] = useState(false);
  const [selectedDinhMucId, setSelectedDinhMucId] = useState<string>("");

  React.useEffect(() => {
    setIsEditingPrice(false);
    const hasBom = item?.dinhMucs?.length > 0 || item?.dinhMuc?.id || item?.dinhMucId;
    if (show && hasBom) {
      const defaultBomId = item?.dinhMucs?.length > 0 ? item.dinhMucs[0].id : (item?.dinhMuc?.id || item?.dinhMucId);
      setSelectedDinhMucId(defaultBomId);
      handleOpenBOMSlide(defaultBomId);
    } else {
      setShowBOMSlide(false);
      setBomData(null);
      setLoadingBOM(false);
      
      if (item?.dinhMucs?.length > 0) {
        setSelectedDinhMucId(item.dinhMucs[0].id);
      } else if (item?.dinhMuc?.id || item?.dinhMucId) {
        setSelectedDinhMucId(item.dinhMuc?.id || item.dinhMucId);
      } else {
        setSelectedDinhMucId("");
      }
    }
  }, [item?.id, item?.dinhMucs, show]);

  const handleOpenBOMSlide = async (idToOpen?: string) => {
    setShowBOMSlide(true);
    // Determine which ID to fetch (can be explicitly passed or use state/fallback)
    const id = (typeof idToOpen === 'string' && idToOpen) ? idToOpen : (selectedDinhMucId || item?.dinhMucId || item?.dinhMuc?.id);
    if (id && (!bomData || bomData.id !== id)) {
      setLoadingBOM(true);
      try {
        const res = await fetch(`/api/production/bom/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBomData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBOM(false);
      }
    }
  };

  const handleSavePrice = async () => {
    if (!item?.id) return;
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/production/materials/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giaBan: Number(editPriceVal) })
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      toast.success("Cập nhật giá bán lẻ thành công");
      setIsEditingPrice(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPrice(false);
    }
  };

  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn("offcanvas-backdrop fade", show && "show")} 
        style={{ pointerEvents: show ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Offcanvas Content */}
      <div 
        className={cn("offcanvas offcanvas-end border-0 shadow", show && "show")} 
        style={{ width: 400, visibility: show ? "visible" : "hidden", overflow: "hidden" }}
        tabIndex={-1}
      >
        <div style={{ display: "flex", width: "200%", height: "100%", transition: "transform 0.3s ease", transform: showBOMSlide ? "translateX(-50%)" : "translateX(0)" }}>
          {/* ----- SLIDE 1: MAIN DETAIL ----- */}
          <div style={{ width: "50%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div className="offcanvas-header border-bottom bg-light py-3">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary shadow-sm p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <i className={cn("bi", isMaterial ? "bi-cpu-fill" : "bi-layers-half")} style={{ fontSize: 20 }} />
                </div>
                <div>
                  <h5 className="offcanvas-title fw-bold text-dark mb-0 text-truncate" style={{ fontSize: 16, letterSpacing: "-0.02em", maxWidth: 250 }} title={item.tenHang || item.name}>
                    {item.tenHang || item.name || (isMaterial ? "Chi tiết Vật tư" : "Chi tiết Hàng hoá")}
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-muted border-0 fw-normal p-0" style={{ fontSize: 11 }}>{item.code || "SKU-AUTO"}</span>
                    <span className="text-muted" style={{ fontSize: 10 }}>•</span>
                    <span className="text-muted" style={{ fontSize: 10 }}>ID: {item.id?.substring(0,8)}</span>
                  </div>
                </div>
              </div>
              <button type="button" className="btn-close shadow-none" onClick={onClose} />
            </div>

        <div className="offcanvas-body p-4 custom-scrollbar">
          {/* Image Section */}
          <div className="mb-4 text-center">
            <div 
              className="mx-auto rounded-4 border bg-light d-flex align-items-center justify-content-center overflow-hidden shadow-sm"
              style={{ width: 180, height: 180 }}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.tenHang} className="img-fluid h-100 w-100 object-fit-cover" />
              ) : (
                <i className="bi bi-image text-muted opacity-25" style={{ fontSize: 60 }} />
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="mb-4">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-info-circle-fill" /> Thông tin cơ bản
            </h6>
            <div className="vstack gap-2 px-2">
              <InfoRow label="Tên gọi" value={item.tenHang || item.name} />
              <InfoRow label="Mã sản phẩm" value={item.code} />
              <InfoRow label="Danh mục" value={item.category?.name || "Chưa phân loại"} />
              <InfoRow label="Đơn vị tính" value={item.donVi || "Cái"} />
              <InfoRow label="Thương hiệu" value={item.brand || "Seajong"} />
              <div className="d-flex justify-content-between align-items-start gap-2">
                <span className="text-muted flex-shrink-0" style={{ fontSize: 12 }}>Giá bán niêm yết:</span>
                {isEditingPrice ? (
                  <div className="d-flex align-items-center gap-1">
                    <input 
                      type="number" 
                      className="form-control form-control-sm text-end" 
                      value={editPriceVal} 
                      onChange={e => setEditPriceVal(e.target.value)} 
                      style={{ width: 100, fontSize: 12.5 }}
                    />
                    <button className="btn btn-sm btn-success py-0 px-1" onClick={handleSavePrice} disabled={savingPrice}>
                      <i className="bi bi-check2"></i>
                    </button>
                    <button className="btn btn-sm btn-light py-0 px-1 border" onClick={() => setIsEditingPrice(false)}>
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                ) : (
                  <div className="text-end text-primary fw-bold d-flex align-items-center gap-2" style={{ fontSize: 12.5 }}>
                    {item.giaBan ? `${item.giaBan.toLocaleString("vi-VN")} VNĐ` : "Chưa có giá"}
                    {isMaterial && (
                      <i 
                        className="bi bi-pencil cursor-pointer text-muted ms-1" 
                        style={{ cursor: "pointer", fontSize: 11 }} 
                        onClick={() => { setIsEditingPrice(true); setEditPriceVal(item.giaBan || 0); }} 
                        title="Cập nhật giá bán lẻ"
                      />
                    )}
                  </div>
                )}
              </div>
              {!isMaterial && (
                <InfoRow 
                  label="Mã định mức" 
                  value={
                    item?.dinhMucs && item.dinhMucs.length > 1 ? (
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        <select 
                          className="form-select form-select-sm py-0 shadow-none border-secondary text-end pe-4" 
                          style={{ width: 140, fontSize: 12, height: 24, paddingLeft: 6 }}
                          value={selectedDinhMucId}
                          onChange={e => setSelectedDinhMucId(e.target.value)}
                        >
                          {item.dinhMucs.map((dm: any) => (
                            <option key={dm.id} value={dm.id}>{dm.code || dm.tenDinhMuc || dm.id.substring(0,8)}</option>
                          ))}
                        </select>
                        <i 
                          className="bi bi-box-arrow-in-up-right text-primary cursor-pointer" 
                          style={{ cursor: "pointer", fontSize: 14 }} 
                          title="Xem chi tiết định mức"
                          onClick={() => selectedDinhMucId && handleOpenBOMSlide(selectedDinhMucId)}
                        />
                      </div>
                    ) : (item?.dinhMucs?.length === 1 || item?.dinhMuc?.code) ? (
                      <span 
                        className="text-primary fw-bold text-decoration-underline cursor-pointer" 
                        onClick={() => handleOpenBOMSlide(item?.dinhMucs?.[0]?.id || item?.dinhMuc?.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {item?.dinhMucs?.[0]?.code || item?.dinhMuc?.code}
                      </span>
                    ) : (
                      "Chưa có định mức"
                    )
                  }
                  highlight={!(item?.dinhMucs?.length > 0 || item?.dinhMuc?.code)} 
                />
              )}
            </div>
          </div>

          {isMaterial && (
            <div className="mb-4 p-3 rounded-4 bg-light border-0">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                <i className="bi bi-gear-fill" /> Thông số kỹ thuật
              </h6>
              <div className="vstack gap-2">
                <InfoRow label="Chất liệu" value={item.material} />
                <InfoRow label="Quy cách" value={item.spec} />
                <InfoRow label="Mức tồn tối thiểu" value={`${item.minStock} ${item.donVi}`} highlight />
              </div>
            </div>
          )}

          {/* Inventory Status */}
          <div className="mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-house-door-fill" /> Tình trạng tồn kho
            </h6>
            <div className="p-3 border rounded-4 vstack gap-2">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Tổng tồn kho:</span>
                <span className="fw-bold fs-5 text-primary">{item.soLuong?.toLocaleString("vi-VN")}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Trạng thái:</span>
                <StatusBadge status={item.trangThai} />
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.ghiChu && (
            <div className="mb-4">
              <h6 className="fw-bold text-dark mb-2" style={{ fontSize: 13 }}>Ghi chú</h6>
              <div className="p-3 bg-warning bg-opacity-10 rounded-3 text-muted small border-start border-warning border-3">
                {item.ghiChu}
              </div>
            </div>
          )}
        </div>

            <div className="offcanvas-footer border-top p-3 bg-light d-flex gap-2 justify-content-end mt-auto">
              <button 
                className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 fw-medium px-3" 
                onClick={() => onDelete ? onDelete(item) : toast.error("Tính năng đang phát triển")}
              >
                <i className="bi bi-trash3" /> Xoá
              </button>
              <button 
                className="btn btn-primary btn-sm d-flex align-items-center gap-1 fw-medium px-3" 
                onClick={() => onEdit ? onEdit(item) : toast.error("Tính năng đang phát triển")}
              >
                <i className="bi bi-pencil-square" /> Sửa
              </button>
            </div>
          </div>

          {/* ----- SLIDE 2: BOM DETAIL ----- */}
          <div style={{ width: "50%", flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bs-body-bg)" }}>
            <div className="offcanvas-header border-bottom bg-light py-3 d-flex align-items-center gap-2">
               <button type="button" className="btn btn-sm btn-light border-0 shadow-none px-2" onClick={() => setShowBOMSlide(false)}>
                 <i className="bi bi-chevron-left" style={{ fontSize: 16 }}></i>
               </button>
               <h5 className="offcanvas-title fw-bold text-dark mb-0 flex-grow-1" style={{ fontSize: 16 }}>
                 Chi tiết định mức
               </h5>
            </div>
            <div className="offcanvas-body p-4 custom-scrollbar bg-light">
              {loadingBOM ? (
                <div className="text-center text-muted mt-5"><i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> Đang tải...</div>
              ) : bomData ? (
                <div>
                  <h6 className="fw-bold mb-3">{bomData.tenDinhMuc || "Không tên"}</h6>
                  <div className="d-flex align-items-center gap-2 mb-4">
                    {bomData.code && (
                      <span className="badge bg-danger text-white border-0 px-2 py-1">{bomData.code}</span>
                    )}
                    <span className="text-muted" style={{ fontSize: 12 }}>Tổng: {bomData.vatTu?.length || 0} thành phần</span>
                  </div>
                  
                  <div className="table-responsive">
                    <table className="table table-hover align-middle border bg-white rounded-3 overflow-hidden shadow-sm" style={{ fontSize: 12.5 }}>
                      <thead className="table-light text-muted">
                        <tr>
                          <th className="fw-medium border-0 px-3 py-2 text-center" style={{ width: 40 }}>#</th>
                          <th className="fw-medium border-0 px-3 py-2">Thành phần</th>
                          <th className="fw-medium border-0 px-3 py-2 text-end">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody className="border-top-0">
                        {bomData.vatTu?.map((v: any, idx: number) => (
                          <tr key={v.id || idx}>
                            <td className="px-3 text-center text-muted">{idx + 1}</td>
                            <td className="px-3">
                              <div className="d-flex align-items-center gap-2 py-1">
                                <div className="bg-light rounded d-flex align-items-center justify-content-center flex-shrink-0 border" style={{ width: 36, height: 36 }}>
                                  {v.material?.imageUrl ? (
                                    <img src={v.material.imageUrl} className="w-100 h-100 object-fit-cover rounded" />
                                  ) : (
                                    <i className="bi bi-cpu text-muted" style={{ fontSize: 18 }} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="fw-bold text-dark text-truncate" title={v.tenVatTu}>{v.tenVatTu}</div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>{v.material?.code || 'Không mã'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 text-end">
                              <div className="fw-bold text-primary" style={{ fontSize: 14 }}>{v.soLuong}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>{v.donViTinh || v.material?.donVi || 'cái'}</div>
                            </td>
                          </tr>
                        ))}
                        {(!bomData.vatTu || bomData.vatTu.length === 0) && (
                          <tr><td colSpan={3} className="text-center text-muted py-4">Không có thành phần nào</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-muted text-center mt-5">Không có dữ liệu định mức.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOM Builder Fullscreen Modal */}
      <BOMBuilderModal
        show={showBOM}
        onClose={() => setShowBOM(false)}
        item={item}
        onSaved={() => { setShowBOM(false); onRefresh?.(); }}
      />
    </>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3">
      <span className="text-muted flex-shrink-0" style={{ fontSize: 12 }}>{label}:</span>
      <div className={cn("text-end text-dark fw-medium", highlight && "text-primary fw-bold")} style={{ fontSize: 12.5 }}>
        {value || "---"}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    "con-hang": { label: "Còn hàng", class: "bg-success text-success" },
    "sap-het": { label: "Sắp hết", class: "bg-warning text-warning" },
    "het-hang": { label: "Hết hàng", class: "bg-danger text-danger" },
  };
  const s = config[status] || { label: status, class: "bg-secondary text-secondary" };
  return (
    <span className={cn("badge bg-opacity-10 border px-2 py-1", s.class)} style={{ fontSize: 11 }}>
      {s.label}
    </span>
  );
}
