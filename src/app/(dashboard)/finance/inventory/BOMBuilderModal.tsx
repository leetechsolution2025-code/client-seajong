"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface MaterialItem {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  material: string | null;
  spec: string | null;
  thongSoKyThuat: string | null;
  imageUrl: string | null;
  category?: { name: string } | null;
}

interface BOMLine {
  id?: string;         // ID của DinhMucVatTu nếu đã tồn tại
  materialId: string | null;
  tenVatTu: string;
  soLuong: number;
  donViTinh: string;
  ghiChu: string;
  material?: MaterialItem | null;
}

interface BOMBuilderModalProps {
  show: boolean;
  onClose: () => void;
  item: any; // InventoryItem
  onSaved?: () => void;
}

export function BOMBuilderModal({ show, onClose, item, onSaved }: BOMBuilderModalProps) {
  const { success, error } = useToast();

  const [dinhMucCode, setDinhMucCode] = useState("");
  const [tenDinhMuc, setTenDinhMuc] = useState("");
  const [lines, setLines] = useState<BOMLine[]>([]);
  const [dinhMucId, setDinhMucId] = useState<string | null>(null);

  const [materialSearch, setMaterialSearch] = useState("");
  const [materialResults, setMaterialResults] = useState<MaterialItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSearchRow, setActiveSearchRow] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Load existing BOM when item changes
  useEffect(() => {
    if (!show || !item) return;
    if (item.dinhMucId) {
      fetchExistingBOM(item.dinhMucId);
    } else {
      // Khởi tạo mới
      setDinhMucId(null);
      setDinhMucCode(`BOM-${item.code || item.id.substring(0, 6)}`);
      setTenDinhMuc(`Định mức: ${item.tenHang}`);
      setLines([emptyLine()]);
    }
  }, [show, item]);

  const fetchExistingBOM = async (id: string) => {
    try {
      const res = await fetch(`/api/production/bom/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setDinhMucId(data.id);
      setDinhMucCode(data.code || "");
      setTenDinhMuc(data.tenDinhMuc || "");
      setLines(data.vatTu?.length > 0 ? data.vatTu.map((v: any) => ({
        id: v.id,
        materialId: v.materialId,
        tenVatTu: v.tenVatTu,
        soLuong: v.soLuong,
        donViTinh: v.donViTinh || "",
        ghiChu: v.ghiChu || "",
        material: v.material,
      })) : [emptyLine()]);
    } catch {
      setLines([emptyLine()]);
    }
  };

  const emptyLine = (): BOMLine => ({
    materialId: null,
    tenVatTu: "",
    soLuong: 1,
    donViTinh: "cái",
    ghiChu: "",
    material: null,
  });

  // Tìm kiếm vật tư
  const searchMaterials = useCallback(async (q: string) => {
    if (!q.trim()) { setMaterialResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/production/materials?search=${encodeURIComponent(q)}&pageSize=20`);
      const data = await res.json();
      setMaterialResults(data.items || []);
      setSelectedIndex(-1);
    } catch {
      setMaterialResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchMaterials(materialSearch), 300);
    return () => clearTimeout(timer);
  }, [materialSearch, searchMaterials]);

  const selectMaterial = (rowIdx: number, mat: MaterialItem) => {
    setLines(prev => prev.map((l, i) => i === rowIdx ? {
      ...l,
      materialId: mat.id,
      tenVatTu: mat.tenHang,
      donViTinh: (mat as any).unit || mat.donVi || "cái",
      material: mat,
    } : l));
    setMaterialSearch("");
    setMaterialResults([]);
    setActiveSearchRow(null);
    setSelectedIndex(-1);
  };

  const updateLine = (idx: number, field: keyof BOMLine, value: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const removeLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const validLines = lines.filter(l => l.tenVatTu.trim());
    if (validLines.length === 0) {
      error("Vui lòng thêm ít nhất một vật tư vào định mức");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: dinhMucCode,
        tenDinhMuc,
        inventoryItemId: item.id,
        vatTu: validLines.map(l => ({
          id: l.id,
          materialId: l.materialId,
          tenVatTu: l.tenVatTu,
          soLuong: l.soLuong,
          donViTinh: l.donViTinh,
          ghiChu: l.ghiChu,
        }))
      };

      const url = dinhMucId ? `/api/production/bom/${dinhMucId}` : "/api/production/bom";
      const method = dinhMucId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Lỗi khi lưu định mức");

      success("Đã lưu định mức thành công!");
      onSaved?.();
      onClose();
    } catch (e: any) {
      error(e.message || "Không thể lưu định mức");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dinhMucId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production/bom/${dinhMucId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi khi xoá định mức");
      success("Đã xoá định mức thành công!");
      onSaved?.();
      onClose();
    } catch (e: any) {
      error(e.message || "Không thể xoá định mức");
    } finally {
      setSaving(false);
    }
  };

  if (!show || !item) return null;

  return (
    <>
      <style>{`
        .bom-modal { 
          position: fixed; inset: 0; z-index: 1060;
          background: var(--background, #fff);
          display: flex; flex-direction: column;
          animation: bom-slide-in 0.25s ease;
        }
        @keyframes bom-slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bom-line-row:hover .bom-remove-btn { opacity: 1; }
        .bom-remove-btn { opacity: 0; transition: opacity 0.15s; }
        .mat-suggestion { cursor: pointer; transition: background 0.1s; }
        .mat-suggestion:hover { background: #f0f4ff; }
      `}</style>

      <div className="bom-modal">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="border-bottom px-4 py-3 d-flex align-items-center justify-content-between bg-white shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary rounded-3 d-flex align-items-center justify-content-center text-white shadow-sm"
              style={{ width: 42, height: 42 }}>
              <i className="bi bi-diagram-3-fill" style={{ fontSize: 20 }} />
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: 17 }}>
                Xây dựng Định mức sản xuất
              </h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className="text-muted" style={{ fontSize: 12 }}>Hàng hoá:</span>
                <span className="fw-semibold text-primary" style={{ fontSize: 12 }}>{item.tenHang}</span>
                <span className="text-muted" style={{ fontSize: 11 }}>•</span>
                <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>{item.code}</span>
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {dinhMucId && (
              <button 
                className="btn btn-sm btn-outline-danger fw-medium d-flex align-items-center rounded-pill px-3 shadow-sm"
                onClick={() => setConfirmDel(true)}
                disabled={saving}
              >
                <i className="bi bi-trash3 me-1" /> Xoá định mức
              </button>
            )}
            <button 
              className="btn btn-sm btn-primary fw-medium d-flex align-items-center rounded-pill px-3 shadow-sm"
              onClick={handleSave} 
              disabled={saving}
            >
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />Đang xử lý...</>
                : <><i className="bi bi-check2-all me-1" />Lưu định mức</>}
            </button>
            <div className="vr mx-1" style={{ height: 24, opacity: 0.15 }} />
            <button className="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: 36, height: 36 }} onClick={onClose}>
              <i className="bi bi-x-lg" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        {/* ── Meta ────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-bottom bg-light d-flex align-items-center gap-4 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <label className="text-muted fw-medium mb-0" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              Mã định mức:
            </label>
            <input
              className="form-control form-control-sm"
              style={{ width: 180, fontSize: 12 }}
              value={dinhMucCode}
              onChange={e => setDinhMucCode(e.target.value)}
              placeholder="VD: BOM-SP001"
            />
          </div>
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            <label className="text-muted fw-medium mb-0" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              Tên định mức:
            </label>
            <input
              className="form-control form-control-sm flex-grow-1"
              style={{ fontSize: 12 }}
              value={tenDinhMuc}
              onChange={e => setTenDinhMuc(e.target.value)}
              placeholder="VD: Định mức lắp đặt Sen cây cao cấp"
            />
          </div>
        </div>

        {/* ── Body – BOM Table ────────────────────────────────── */}
        <div className="flex-grow-1 overflow-auto px-4 py-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: 14 }}>
                <i className="bi bi-list-check text-primary me-2" />
                Danh sách vật tư / phụ kiện
              </h6>
              <small className="text-muted">Nhấn vào ô Tên vật tư để tìm kiếm vật tư từ kho</small>
            </div>
            <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={addLine}>
              <i className="bi bi-plus-lg me-1" /> Thêm dòng
            </button>
          </div>

          {/* Table */}
          <div className="border rounded-4 shadow-sm" style={{ overflow: "visible" }}>
            <table className="table table-sm mb-0" style={{ fontSize: 14 }}>
              <thead style={{ background: "var(--background, #f8fafc)" }}>
                <tr>
                  <th style={{ width: 40, padding: "10px 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground, #94a3b8)", fontWeight: 700 }}>#</th>
                  <th style={{ padding: "10px 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground, #94a3b8)", fontWeight: 700 }}>Tên vật tư / Phụ kiện</th>
                  <th style={{ width: 100, padding: "10px 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground, #94a3b8)", fontWeight: 700, textAlign: "right" }}>Số lượng</th>
                  <th style={{ width: 120, padding: "10px 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground, #94a3b8)", fontWeight: 700 }}>Đơn vị</th>
                  <th style={{ padding: "10px 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground, #94a3b8)", fontWeight: 700 }}>Ghi chú</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="bom-line-row" style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                    <td style={{ padding: "8px 14px", color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>

                    {/* Tên vật tư – có searchbox */}
                    <td style={{ padding: "6px 14px", position: "relative" }}>
                      <div className="d-flex align-items-center gap-2">
                        {line.material ? (
                          <div className="d-flex align-items-center gap-2 flex-grow-1">
                            {line.material?.imageUrl ? (
                              <img 
                                src={line.material.imageUrl} 
                                alt="" 
                                className="rounded-2 object-fit-cover flex-shrink-0 shadow-sm border" 
                                style={{ width: 38, height: 38 }}
                              />
                            ) : (
                              <div className="bg-light rounded-2 d-flex align-items-center justify-content-center text-muted flex-shrink-0 border"
                                style={{ width: 38, height: 38, backgroundColor: "#f8fafc" }}>
                                <i className="bi bi-image" style={{ fontSize: 18, opacity: 0.5 }} />
                              </div>
                            )}
                            <div className="flex-grow-1 min-w-0">
                              <div className="fw-medium text-dark text-truncate" style={{ fontSize: 14 }}>
                                {line.material?.category?.name ? `${line.material.category.name} - ` : ""}{line.tenVatTu}
                                {line.material?.code ? `: ${line.material.code}` : ""}
                              </div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {line.material?.thongSoKyThuat || ""}
                              </div>
                            </div>
                            <button className="btn btn-xs p-0 text-muted border-0 flex-shrink-0"
                              onClick={() => { updateLine(idx, "material", null); updateLine(idx, "materialId", null); updateLine(idx, "tenVatTu", ""); }}
                              title="Thay đổi vật tư">
                              <i className="bi bi-arrow-repeat" style={{ fontSize: 13 }} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-grow-1 position-relative">
                            <input
                              ref={el => { inputRefs.current[idx] = el; }}
                              className="form-control form-control-sm"
                              style={{ fontSize: 14, paddingLeft: 30, height: 38 }}
                              placeholder="Tìm vật tư..."
                              value={activeSearchRow === idx ? materialSearch : line.tenVatTu}
                              onFocus={() => {
                                setActiveSearchRow(idx);
                                setMaterialSearch(line.tenVatTu);
                                const el = inputRefs.current[idx];
                                if (el) {
                                  const rect = el.getBoundingClientRect();
                                  setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                                }
                              }}
                              onChange={e => { setMaterialSearch(e.target.value); updateLine(idx, "tenVatTu", e.target.value); }}
                              onKeyDown={e => {
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setSelectedIndex(prev => (prev < materialResults.length - 1 ? prev + 1 : prev));
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                                } else if (e.key === "Enter" && selectedIndex >= 0) {
                                  e.preventDefault();
                                  selectMaterial(idx, materialResults[selectedIndex]);
                                } else if (e.key === "Escape") {
                                  setActiveSearchRow(null);
                                }
                              }}
                            />
                            <i className="bi bi-search position-absolute text-muted"
                              style={{ left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, pointerEvents: "none" }} />

                            {/* Search results dropdown – dùng fixed để thoát khỏi overflow */}
                            {activeSearchRow === idx && dropdownPos && (searching || materialResults.length > 0 || materialSearch) && (
                              <div
                                style={{
                                  position: "fixed",
                                  top: dropdownPos.top,
                                  left: dropdownPos.left,
                                  width: dropdownPos.width,
                                  zIndex: 9999,
                                  maxHeight: 240,
                                  overflowY: "auto",
                                  background: "#fff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                }}
                              >
                                {searching && (
                                  <div className="px-3 py-2 text-muted d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                                    <span className="spinner-border spinner-border-sm" /> Đang tìm...
                                  </div>
                                )}
                                {!searching && materialResults.map((mat, mIdx) => (
                                  <div 
                                    key={mat.id} 
                                    className="mat-suggestion px-3 py-2 d-flex align-items-center gap-2"
                                    onMouseDown={() => selectMaterial(idx, mat)}
                                    onMouseEnter={() => setSelectedIndex(mIdx)}
                                    style={{ 
                                      backgroundColor: selectedIndex === mIdx ? "rgba(0, 48, 135, 0.08)" : "transparent",
                                      borderLeft: selectedIndex === mIdx ? "4px solid var(--primary)" : "4px solid transparent",
                                      transition: "all 0.1s ease",
                                      cursor: "pointer"
                                    }}
                                  >
                                    {mat.imageUrl ? (
                                      <img 
                                        src={mat.imageUrl} 
                                        alt="" 
                                        className="rounded-2 object-fit-cover flex-shrink-0 shadow-sm border" 
                                        style={{ width: 32, height: 32 }}
                                      />
                                    ) : (
                                      <div className="bg-light rounded-2 d-flex align-items-center justify-content-center text-muted flex-shrink-0 border"
                                        style={{ width: 32, height: 32, backgroundColor: "#f8fafc" }}>
                                        <i className="bi bi-image" style={{ fontSize: 14, opacity: 0.5 }} />
                                      </div>
                                    )}
                                    <div className="flex-grow-1 min-w-0">
                                      <div className="fw-medium" style={{ fontSize: 13.5, color: selectedIndex === mIdx ? "var(--primary)" : "var(--foreground)" }}>
                                        {mat.category?.name ? `${mat.category.name} - ` : ""}{mat.tenHang}
                                        {mat.code ? `: ${mat.code}` : ""}
                                      </div>
                                      <div className="text-muted" style={{ fontSize: 11.5, marginTop: 1, opacity: selectedIndex === mIdx ? 1 : 0.7 }}>
                                        {mat.thongSoKyThuat || ""}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {!searching && materialResults.length === 0 && materialSearch && (
                                  <div className="px-3 py-2 text-muted" style={{ fontSize: 12 }}>Không tìm thấy vật tư</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Số lượng */}
                    <td style={{ padding: "6px 14px" }}>
                      <input
                        type="number"
                        min={0.001}
                        step={0.001}
                        className="form-control form-control-sm text-end"
                        style={{ fontSize: 13, width: 80 }}
                        value={line.soLuong}
                        onChange={e => updateLine(idx, "soLuong", parseFloat(e.target.value) || 1)}
                      />
                    </td>

                    {/* Đơn vị */}
                    <td style={{ padding: "6px 14px" }}>
                      <input
                        className="form-control form-control-sm"
                        style={{ fontSize: 12, width: 100 }}
                        value={line.donViTinh}
                        onChange={e => updateLine(idx, "donViTinh", e.target.value)}
                        placeholder="cái, m, kg..."
                      />
                    </td>

                    {/* Ghi chú */}
                    <td style={{ padding: "6px 14px" }}>
                      <input
                        className="form-control form-control-sm"
                        style={{ fontSize: 12 }}
                        value={line.ghiChu}
                        onChange={e => updateLine(idx, "ghiChu", e.target.value)}
                        placeholder="Tuỳ chọn..."
                      />
                    </td>

                    {/* Xoá dòng */}
                    <td style={{ padding: "6px 8px" }}>
                      <button
                        className="btn btn-sm bom-remove-btn text-danger border-0 d-flex align-items-center justify-content-center"
                        style={{ width: 28, height: 28, padding: 0, background: "transparent" }}
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        title="Xoá dòng này"
                      >
                        <i className="bi bi-trash3" style={{ fontSize: 13 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc" }}>
                  <td colSpan={6} style={{ padding: "10px 14px" }}>
                    <button className="btn btn-sm text-primary border-0 bg-transparent fw-medium d-flex align-items-center gap-1"
                      style={{ fontSize: 12 }} onClick={addLine}>
                      <i className="bi bi-plus-circle-fill" /> Thêm dòng vật tư
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-3 d-flex align-items-center justify-content-between px-1">
            <span className="text-muted" style={{ fontSize: 12 }}>
              <i className="bi bi-info-circle me-1" />
              Tổng <b>{lines.filter(l => l.tenVatTu).length}</b> loại vật tư
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        open={confirmDel}
        variant="danger"
        title="Xoá định mức sản xuất?"
        message={`Bạn có chắc chắn muốn xoá toàn bộ định mức của hàng hoá "${item.tenHang}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá định mức"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
        loading={saving}
      />
    </>
  );
}
