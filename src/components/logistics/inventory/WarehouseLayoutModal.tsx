"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

interface LayoutElement {
  id: string;
  type: "rack" | "zone" | "entrance" | "wall";
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  color?: string;
  rows?: number;
  cols?: number;
  prefix?: string;
  index?: number;
  rotation?: number;
  fontSize?: number;
}

interface Props {
  warehouse: any;
  onClose: () => void;
  onSave: (layout: LayoutElement[]) => void;
}

const MM_TO_PX = 0.1; // 1mm = 0.1px => 1000mm (1m) = 100px

export function WarehouseLayoutModal({ warehouse, onClose, onSave }: Props) {
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const [gridSize, setGridSize] = useState(100); // in px (100px = 1000mm)
  const [isCollapsed, setIsCollapsed] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, el: LayoutElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    setDraggingId(el.id);
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elX: el.x,
      elY: el.y
    };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, el: LayoutElement) => {
    if (draggingId !== el.id || !dragStartRef.current) return;
    
    const dx = (e.clientX - dragStartRef.current.x) / (zoom * MM_TO_PX);
    const dy = (e.clientY - dragStartRef.current.y) / (zoom * MM_TO_PX);
    
    let newX = dragStartRef.current.elX + dx;
    let newY = dragStartRef.current.elY + dy;
    
    const snapSize = gridSize / MM_TO_PX;
    newX = Math.round(newX / snapSize) * snapSize;
    newY = Math.round(newY / snapSize) * snapSize;
    
    newX = Math.max(0, Math.min(5000 / MM_TO_PX - el.w, newX));
    newY = Math.max(0, Math.min(5000 / MM_TO_PX - el.h, newY));
    
    if (newX !== el.x || newY !== el.y) {
      updateElement(el.id, { x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    dragStartRef.current = null;
  };

  useEffect(() => {
    if (warehouse?.layoutJson) {
      try {
        setElements(JSON.parse(warehouse.layoutJson));
      } catch (e) {
        console.error("Failed to parse layout JSON", e);
      }
    }
  }, [warehouse]);

  const addElement = (type: "rack" | "zone" | "entrance" | "wall") => {
    const rackCount = elements.filter(el => el.type === "rack").length;
    const nextChar = String.fromCharCode(65 + Math.floor(rackCount / 10));
    const nextIdx = (rackCount % 10) + 1;

    let spawnX = 1000;
    let spawnY = 1000;

    if (canvasRef.current) {
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;
      const clientWidth = canvasRef.current.clientWidth;
      const clientHeight = canvasRef.current.clientHeight;

      const centerX = (scrollLeft + clientWidth / 2) / zoom;
      const centerY = (scrollTop + clientHeight / 2) / zoom;

      spawnX = centerX / MM_TO_PX;
      spawnY = centerY / MM_TO_PX;
    }

    const snapSize = gridSize / MM_TO_PX;
    spawnX = Math.round(spawnX / snapSize) * snapSize;
    spawnY = Math.round(spawnY / snapSize) * snapSize;

    const width = type === "rack" ? 2400 : type === "zone" ? 5000 : type === "wall" ? 10000 : 1200;
    const height = type === "rack" ? 1000 : type === "zone" ? 5000 : type === "wall" ? 200 : 1200;

    spawnX = spawnX - width / 2;
    spawnY = spawnY - height / 2;

    spawnX = Math.round(spawnX / snapSize) * snapSize;
    spawnY = Math.round(spawnY / snapSize) * snapSize;

    spawnX = Math.max(0, Math.min(5000 / MM_TO_PX - width, spawnX));
    spawnY = Math.max(0, Math.min(5000 / MM_TO_PX - height, spawnY));

    const newEl: LayoutElement = {
      id: `el-${Date.now()}`,
      type,
      x: spawnX,
      y: spawnY,
      w: width,
      h: height,
      name: type === "rack" ? `${nextChar}${nextIdx}` : type === "zone" ? "Khu vực" : type === "wall" ? "Tường" : "Lối vào",
      color: type === "rack" ? "#4f46e5" : type === "zone" ? "#10b981" : type === "wall" ? "#64748b" : "#f59e0b",
      rows: type === "rack" ? 4 : undefined,
      cols: type === "rack" ? 5 : undefined,
      prefix: type === "rack" ? nextChar : undefined,
      index: type === "rack" ? nextIdx : undefined,
      rotation: 0,
      fontSize: 11,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const updateElement = (id: string, updates: Partial<LayoutElement>) => {
    setElements(elements.map(el => {
      if (el.id === id) {
        const merged = { ...el, ...updates };
        if (el.type === "rack" && (updates.prefix || updates.index !== undefined)) {
          merged.name = `${merged.prefix}${merged.index}`;
        }
        return merged;
      }
      return el;
    }));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(elements);
    setIsSaving(false);
  };

  const selectedEl = elements.find(el => el.id === selectedId);

  const copiedElementRef = useRef<LayoutElement | null>(null);

  // ── Keyboard Controls ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || !selectedEl) return;
      
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      // Rotate shortcut
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        updateElement(selectedId, { rotation: (selectedEl.rotation || 0) + 90 });
        return;
      }

      // Delete shortcut
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteElement(selectedId);
        return;
      }

      // Copy shortcut
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        copiedElementRef.current = selectedEl;
        return;
      }

      // Paste shortcut
      if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        const el = copiedElementRef.current;
        if (el) {
          const snapSize = gridSize / MM_TO_PX;
          const rackCount = elements.filter(x => x.type === "rack").length;
          const nextChar = String.fromCharCode(65 + Math.floor(rackCount / 10));
          const nextIdx = (rackCount % 10) + 1;

          const newEl: LayoutElement = {
            ...el,
            id: `el-${Date.now()}`,
            x: Math.max(0, Math.min(5000 / MM_TO_PX - el.w, el.x + snapSize)),
            y: Math.max(0, Math.min(5000 / MM_TO_PX - el.h, el.y + snapSize)),
            index: el.type === "rack" ? nextIdx : el.index,
            prefix: el.type === "rack" ? nextChar : el.prefix,
            name: el.type === "rack" ? `${nextChar}${nextIdx}` : el.name,
          };
          setElements([...elements, newEl]);
          setSelectedId(newEl.id);
        }
        return;
      }

      const moveStep = e.shiftKey ? 100 : 10;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -moveStep;
      else if (e.key === "ArrowRight") dx = moveStep;
      else if (e.key === "ArrowUp") dy = -moveStep;
      else if (e.key === "ArrowDown") dy = moveStep;
      else return;

      e.preventDefault();
      
      let newX = selectedEl.x + dx;
      let newY = selectedEl.y + dy;
      
      // Boundary check
      newX = Math.max(0, Math.min(5000 / MM_TO_PX - selectedEl.w, newX));
      newY = Math.max(0, Math.min(5000 / MM_TO_PX - selectedEl.h, newY));

      updateElement(selectedId, { x: newX, y: newY });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedEl, elements, gridSize]);

  const zoomToFit = () => {
    if (elements.length === 0) {
      setZoom(0.8);
      return;
    }
    const minX = Math.min(...elements.map(el => el.x));
    const minY = Math.min(...elements.map(el => el.y));
    const maxX = Math.max(...elements.map(el => el.x + el.w));
    const maxY = Math.max(...elements.map(el => el.y + el.h));
    
    const padding = 1000; // in mm
    const contentW = (maxX - minX + padding) * MM_TO_PX;
    const contentH = (maxY - minY + padding) * MM_TO_PX;
    
    const viewportW = canvasRef.current?.clientWidth || 800;
    const viewportH = canvasRef.current?.clientHeight || 600;
    
    const scaleX = viewportW / contentW;
    const scaleY = viewportH / contentH;
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    
    const finalZoom = Math.max(0.2, newZoom);
    setZoom(finalZoom);
    
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.scrollTo({
          left: (minX - padding/2) * MM_TO_PX * finalZoom,
          top: (minY - padding/2) * MM_TO_PX * finalZoom,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  const zoomToSelection = () => {
    if (!selectedEl) return;
    const targetZoom = 1.2;
    setZoom(targetZoom);
    
    setTimeout(() => {
      if (canvasRef.current) {
        const viewportW = canvasRef.current.clientWidth;
        const viewportH = canvasRef.current.clientHeight;
        canvasRef.current.scrollTo({
          left: (selectedEl.x + selectedEl.w/2) * MM_TO_PX * targetZoom - viewportW/2,
          top: (selectedEl.y + selectedEl.h/2) * MM_TO_PX * targetZoom - viewportH/2,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column" style={{ zIndex: 1060, background: "#f8fafc" }}>
      {/* ── Top Bar ── */}
      <div className="bg-white border-bottom px-4 py-2 d-flex align-items-center justify-content-between shadow-sm position-relative" style={{ zIndex: 30 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-link p-0 text-dark" onClick={onClose}>
            <i className="bi bi-arrow-left fs-4" />
          </button>
          <div>
            <h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>{warehouse?.name}</h6>
            <div className="d-flex align-items-center gap-2">
               <div className="d-flex align-items-center gap-1 bg-light rounded-pill px-2 border" style={{ height: 24 }}>
                  <span className="text-muted fw-bold" style={{ fontSize: 9 }}>GRID:</span>
                  {[50, 100, 250, 500].map(s => (
                    <button 
                      key={s} 
                      className={`btn btn-link p-0 px-1 border-0 ${gridSize === s/10 ? 'text-primary fw-bold' : 'text-muted'}`} 
                      style={{ fontSize: 9, textDecoration: 'none' }}
                      onClick={() => setGridSize(s/10)}
                    >
                      {s}mm
                    </button>
                  ))}
               </div>
               <div className="d-flex align-items-center gap-1 bg-light rounded-pill px-2 border" style={{ height: 24 }}>
                  <button className="btn btn-link p-0 text-muted" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} title="Thu nhỏ"><i className="bi bi-dash" /></button>
                  <span className="small fw-bold px-1" style={{ fontSize: 10, minWidth: 35, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
                  <button className="btn btn-link p-0 text-muted" onClick={() => setZoom(Math.min(2, zoom + 0.1))} title="Phóng to"><i className="bi bi-plus" /></button>
                  <div className="vr mx-1" style={{ height: 12, marginTop: 6 }} />
                  <button className="btn btn-link p-0 text-muted" onClick={zoomToFit} title="Xem toàn bộ layout"><i className="bi bi-arrows-fullscreen" style={{ fontSize: 10 }} /></button>
                  <button className={`btn btn-link p-0 ${selectedId ? 'text-primary' : 'text-muted disabled'}`} onClick={zoomToSelection} title="Zoom vào đối tượng chọn"><i className="bi bi-cursor-fill" style={{ fontSize: 10 }} /></button>
               </div>
            </div>
          </div>
        </div>

        {/* ── Mini Floating Toolbar (Selected Element) ── */}
        <AnimatePresence>
          {selectedEl && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="position-absolute start-50 translate-middle-x bg-white border shadow-lg rounded-4 p-1 d-flex flex-column"
              style={{ top: 70, zIndex: 40, minWidth: 500 }}
            >
              {/* Toolbar Actions Row */}
              <div className="d-flex align-items-center gap-3 px-3 py-2 border-bottom">
                <div className="d-flex align-items-center gap-2 border-end pe-3">
                   <span className="small text-muted" style={{ fontSize: 10 }}>NAME:</span>
                   {selectedEl.type === "rack" ? (
                     <div className="d-flex gap-1">
                        <input type="text" className="form-control form-control-sm p-0 text-center fw-bold border-0 bg-light" style={{ width: 25, height: 22, fontSize: 11 }} value={selectedEl.prefix} onChange={e => updateElement(selectedEl.id, { prefix: e.target.value.toUpperCase() })} />
                        <input type="number" className="form-control form-control-sm p-0 text-center fw-bold border-0 bg-light" style={{ width: 30, height: 22, fontSize: 11 }} value={selectedEl.index} onChange={e => updateElement(selectedEl.id, { index: Number(e.target.value) })} />
                     </div>
                   ) : (
                     <input type="text" className="form-control form-control-sm border-0 bg-light fw-bold" style={{ width: 100, height: 22, fontSize: 11 }} value={selectedEl.name} onChange={e => updateElement(selectedEl.id, { name: e.target.value })} />
                   )}
                </div>

                <div className="d-flex align-items-center gap-2 border-end pe-3">
                   <span className="small text-muted" style={{ fontSize: 10 }}>SIZE:</span>
                   <input type="number" className="form-control form-control-sm p-0 text-center border-0 bg-light fw-bold" style={{ width: 60, height: 22, fontSize: 10 }} value={selectedEl.w} onChange={e => updateElement(selectedEl.id, { w: Number(e.target.value) })} />
                   <span className="small text-muted">x</span>
                   <input type="number" className="form-control form-control-sm p-0 text-center border-0 bg-light fw-bold" style={{ width: 60, height: 22, fontSize: 10 }} value={selectedEl.h} onChange={e => updateElement(selectedEl.id, { h: Number(e.target.value) })} />
                </div>

                {selectedEl.type === "rack" && (
                  <div className="d-flex align-items-center gap-2 border-end pe-3">
                     <span className="small text-muted" style={{ fontSize: 10 }}>Ô/TẦNG:</span>
                     <div className="d-flex align-items-center gap-1 bg-light rounded px-1">
                        <button className="btn btn-link p-0 text-muted" onClick={() => updateElement(selectedEl.id, { rows: Math.max(1, (selectedEl.rows || 1) - 1) })}><i className="bi bi-dash" /></button>
                        <span className="small fw-bold px-1" style={{ fontSize: 10 }}>{selectedEl.rows}T</span>
                        <button className="btn btn-link p-0 text-muted" onClick={() => updateElement(selectedEl.id, { rows: (selectedEl.rows || 1) + 1 })}><i className="bi bi-plus" /></button>
                     </div>
                     <div className="d-flex align-items-center gap-1 bg-light rounded px-1">
                        <button className="btn btn-link p-0 text-muted" onClick={() => updateElement(selectedEl.id, { cols: Math.max(1, (selectedEl.cols || 1) - 1) })}><i className="bi bi-dash" /></button>
                        <span className="small fw-bold px-1" style={{ fontSize: 10 }}>{selectedEl.cols}Ô</span>
                        <button className="btn btn-link p-0 text-muted" onClick={() => updateElement(selectedEl.id, { cols: (selectedEl.cols || 1) + 1 })}><i className="bi bi-plus" /></button>
                     </div>
                  </div>
                )}

                <div className="d-flex align-items-center gap-2 border-end pe-3">
                   <span className="small text-muted" style={{ fontSize: 10 }}>FONT:</span>
                   <div className="d-flex align-items-center gap-1 bg-light rounded px-1">
                      <button className="btn btn-link p-0 text-muted" onClick={() => updateElement(selectedEl.id, { fontSize: Math.max(6, (selectedEl.fontSize || 11) - 1) })}><i className="bi bi-dash" /></button>
                      <span className="small fw-bold px-1" style={{ fontSize: 10 }}>{selectedEl.fontSize}px</span>
                      <button className="btn btn-link p-0 text-muted" onClick={() => updateElement(selectedEl.id, { fontSize: Math.min(24, (selectedEl.fontSize || 11) + 1) })}><i className="bi bi-plus" /></button>
                   </div>
                </div>

                 <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-light rounded-circle p-0" style={{ width: 28, height: 28 }} onClick={() => updateElement(selectedEl.id, { rotation: (selectedEl.rotation || 0) + 90 })}><i className="bi bi-arrow-clockwise" /></button>
                    <button className="btn btn-light rounded-circle p-0 text-danger" style={{ width: 28, height: 28 }} onClick={() => deleteElement(selectedEl.id)}><i className="bi bi-trash" /></button>
                 </div>

                 {selectedEl.type === "rack" && (
                   <div className="d-flex align-items-center gap-2 border-start ps-3 ms-2">
                      <button 
                        className="btn btn-light rounded-circle p-0" 
                        style={{ width: 28, height: 28, transition: "transform 0.3s" }} 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                      >
                        <i className={`bi bi-chevron-${isCollapsed ? 'down' : 'up'}`} />
                      </button>
                   </div>
                 )}
              </div>

              {/* Elevation View Row for Racks */}
              <AnimatePresence>
                {selectedEl.type === "rack" && !isCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="p-3 bg-light-subtle rounded-bottom-4">
                       <div className="small fw-bold text-muted uppercase mb-2" style={{ fontSize: 9 }}>Mặt đứng kệ hàng: {selectedEl.name}</div>
                       <div className="d-flex flex-column-reverse gap-1 border p-2 bg-white rounded-3 shadow-inner" style={{ width: 'fit-content', minWidth: 200 }}>
                          {Array.from({ length: selectedEl.rows || 1 }).map((_, rIdx) => (
                            <div key={rIdx} className="d-flex gap-1">
                               <div className="small text-muted d-flex align-items-center" style={{ fontSize: 8, width: 20 }}>T{rIdx + 1}</div>
                               {Array.from({ length: selectedEl.cols || 1 }).map((_, cIdx) => (
                                 <div 
                                   key={cIdx} 
                                   className="border rounded-1 d-flex align-items-center justify-content-center" 
                                   style={{ width: 30, height: 25, background: '#f8fafc', fontSize: 8, color: '#94a3b8' }}
                                 >
                                   {cIdx + 1}
                                 </div>
                               ))}
                            </div>
                          ))}
                          <div className="d-flex gap-1 border-top pt-1 mt-1">
                             <div style={{ width: 20 }} />
                             {Array.from({ length: selectedEl.cols || 1 }).map((_, cIdx) => (
                               <div key={cIdx} className="text-center" style={{ width: 30, fontSize: 8, color: '#94a3b8' }}>Ô{cIdx + 1}</div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary rounded-pill px-3 fw-bold" onClick={() => setIsPrintOpen(true)}>
             <i className="bi bi-printer me-1" /> In Layout
          </button>
          <button className="btn btn-light rounded-pill px-4 fw-medium" style={{ fontSize: 13 }} onClick={onClose}>Huỷ bỏ</button>
          <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" style={{ fontSize: 13 }} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu thiết kế"}
          </button>
        </div>
      </div>

      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* ── Left Sidebar (Tools) ── */}
        <div className="bg-white border-end p-2 d-flex flex-column gap-2 shadow-sm" style={{ width: 70, zIndex: 10 }}>
          <div className="tool-btn rounded-3 border d-flex align-items-center justify-content-center bg-light-subtle" onClick={() => addElement("wall")} title="Tường ngăn" style={{ width: 50, height: 50, cursor: "pointer" }}><i className="bi bi-dash-lg fs-4" /></div>
          <div className="tool-btn rounded-3 border d-flex align-items-center justify-content-center bg-light-subtle" onClick={() => addElement("rack")} title="Kệ hàng" style={{ width: 50, height: 50, cursor: "pointer" }}><i className="bi bi-grid-3x3 fs-4" /></div>
          <div className="tool-btn rounded-3 border d-flex align-items-center justify-content-center bg-light-subtle" onClick={() => addElement("zone")} title="Khu vực" style={{ width: 50, height: 50, cursor: "pointer" }}><i className="bi bi-bounding-box fs-4" /></div>
          <div className="tool-btn rounded-3 border d-flex align-items-center justify-content-center bg-light-subtle" onClick={() => addElement("entrance")} title="Lối vào" style={{ width: 50, height: 50, cursor: "pointer" }}><i className="bi bi-door-open fs-4" /></div>
          <style jsx>{`
            .tool-btn { transition: all 0.2s; }
            .tool-btn:hover { background: var(--primary-subtle) !important; color: var(--primary); border-color: var(--primary) !important; transform: scale(1.05); }
          `}</style>
        </div>

        {/* ── Main Canvas ── */}
        <div 
          ref={canvasRef}
          className="flex-grow-1 overflow-auto bg-slate-100 position-relative" 
          style={{ backgroundColor: "#f1f5f9", overflow: "scroll" }} 
          onClick={() => setSelectedId(null)}
        >
          <div 
            className="position-relative" 
            style={{ 
              width: 5000, height: 5000,
              transform: `scale(${zoom})`, transformOrigin: "0 0",
              backgroundImage: `linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)`, 
              backgroundSize: `${gridSize}px ${gridSize}px`,
              transition: "transform 0.1s ease-out"
            }}
          >
            {elements.map((el) => (
              <motion.div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, el)}
                onPointerMove={(e) => handlePointerMove(e, el)}
                onPointerUp={handlePointerUp}
                onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                style={{
                  position: "absolute", left: el.x * MM_TO_PX, top: el.y * MM_TO_PX,
                  width: el.w * MM_TO_PX, height: el.h * MM_TO_PX,
                  backgroundColor: el.type === "wall" ? el.color : el.color + "22",
                  border: el.type === "wall" ? "none" : `2px ${selectedId === el.id ? "solid" : "dashed"} ${el.color}`,
                  borderRadius: el.type === "wall" ? 0 : 4,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "move", zIndex: selectedId === el.id ? 10 : (el.type === "wall" ? 1 : 2),
                  boxShadow: selectedId === el.id ? "0 10px 25px -5px rgba(0,0,0,0.2)" : "none",
                  touchAction: "none",
                }}
                animate={{ rotate: el.rotation || 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {el.type !== "wall" && (
                  <div className="text-center px-2">
                    <div className="fw-bold" style={{ color: el.color, fontSize: el.fontSize || 11 }}>{el.name}</div>
                    {el.type === "rack" && (
                      <div className="small text-muted fw-medium" style={{ fontSize: (el.fontSize || 11) * 0.7 }}>{el.rows}T|{el.cols}Ô</div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {/* ── Print Preview Modal omitted for brevity ── */}

      {/* ── Print Preview Modal ── */}
      {isPrintOpen && (
        <PrintPreviewModal 
          title={`Sơ đồ kho: ${warehouse?.name}`}
          subtitle="Bản vẽ layout hệ thống logistics"
          onClose={() => setIsPrintOpen(false)}
          printOrientation="landscape"
          actions={
            <button 
              className="btn btn-primary btn-sm px-3 rounded-pill fw-bold"
              onClick={() => printDocumentById("layout-print-doc", "landscape")}
            >
              <i className="bi bi-printer me-1" /> Thực hiện in
            </button>
          }
          document={
            <div className="pdf-content-page">
               <div style={{ padding: '20px', borderBottom: '2px solid #000', marginBottom: '30px' }}>
                  <h2 style={{ margin: 0 }}>SƠ ĐỒ LAYOUT KHO HÀNG</h2>
                  <p style={{ margin: 0, color: '#666' }}>{warehouse?.name} - {warehouse?.code}</p>
               </div>
               
               <div style={{ 
                 position: 'relative', 
                 width: '100%', 
                 height: '600px', 
                 background: '#f8fafc',
                 border: '1px solid #cbd5e1',
                 overflow: 'hidden'
               }}>
                  {elements.map(el => (
                    <div
                      key={el.id}
                      style={{
                        position: "absolute",
                        left: (el.x * MM_TO_PX),
                        top: (el.y * MM_TO_PX),
                        width: (el.w * MM_TO_PX),
                        height: (el.h * MM_TO_PX),
                        backgroundColor: el.type === "wall" ? el.color : el.color + "33",
                        border: el.type === "wall" ? "none" : `1px solid ${el.color}`,
                        borderRadius: el.type === "wall" ? 0 : 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `rotate(${el.rotation || 0}deg)`,
                      }}
                    >
                      {el.type !== "wall" && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold', fontSize: (el.fontSize || 11) * 0.8, color: el.color }}>{el.name}</div>
                          {el.type === "rack" && (
                            <div style={{ fontSize: (el.fontSize || 11) * 0.5, color: '#666' }}>{el.rows}T|{el.cols}Ô</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
               </div>

               <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                     * Đơn vị đo: mm | Tỉ lệ: 1:10<br/>
                     * Ngày in: {new Date().toLocaleDateString('vi-VN')}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontWeight: 'bold' }}>Quản lý kho</div>
                     <div style={{ marginTop: '60px' }}>(Ký và ghi rõ họ tên)</div>
                  </div>
               </div>
            </div>
          }
          documentId="layout-print-doc"
        />
      )}
    </div>
  );
}
