"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface InboundTicket {
  id: string;
  code: string;
  type: "H2" | "H3"; // H2: Mua hàng NCC, H3: Nhập thành phẩm
  sourceCode: string; // PO Code or Work Order Code
  supplierName?: string;
  departmentName?: string;
  status: "draft" | "receiving" | "qc_checking" | "accounting_pending" | "completed" | "faulty_handling";
  items: InboundItem[];
  createdAt: string;
  qcResult?: "pass" | "fail";
}

interface InboundItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  expectedQty: number;
  receivedQty: number;
  passedQty: number;
  failedQty: number;
}

export function LogisticsInbound() {
  const toast = useToast();
  const [tickets, setTickets] = useState<InboundTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<InboundTicket | null>(null);

  // Mock data for initial development - purely business focused
  useEffect(() => {
    setTickets([
      {
        id: "1",
        code: "PNK-240428-001",
        type: "H2",
        sourceCode: "PO-SEA-8821",
        supplierName: "Nhà cung cấp Kính Seajong",
        status: "qc_checking",
        items: [
          { id: "i1", productId: "p1", productName: "Kính cường lực 10mm", sku: "SJ-KCL10", expectedQty: 100, receivedQty: 100, passedQty: 0, failedQty: 0 }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        code: "PNK-240428-002",
        type: "H3",
        sourceCode: "WO-PROD-990",
        departmentName: "Xưởng Lắp Ráp A",
        status: "accounting_pending",
        qcResult: "pass",
        items: [
          { id: "i2", productId: "p2", productName: "Bàn cầu S-0139", sku: "SJ-BC0139", expectedQty: 50, receivedQty: 50, passedQty: 50, failedQty: 0 }
        ],
        createdAt: new Date().toISOString()
      }
    ]);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string, color: string }> = {
      "draft": { label: "Bản nháp", color: "secondary" },
      "receiving": { label: "Đang nhận hàng", color: "info" },
      "qc_checking": { label: "Đang kiểm tra QC", color: "warning" },
      "accounting_pending": { label: "Chờ Kế toán duyệt", color: "primary" },
      "completed": { label: "Đã nhập kho", color: "success" },
      "faulty_handling": { label: "Xử lý hàng lỗi", color: "danger" }
    };
    const s = config[status] || { label: status, color: "secondary" };
    return <span className={`badge bg-${s.color}-subtle text-${s.color} border border-${s.color} border-opacity-10 rounded-pill px-3`}>{s.label}</span>;
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Action Bar */}
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          <button 
            className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <i className="bi bi-plus-lg me-2" />
            Lập phiếu nhập kho mới
          </button>
        </div>
        
        <div className="d-flex gap-2 bg-white p-1 rounded-pill shadow-sm border">
          <button 
            className={`btn btn-sm rounded-pill px-3 ${filterType === "all" ? "btn-primary shadow-sm" : "btn-link text-muted text-decoration-none"}`}
            onClick={() => setFilterType("all")}
          >Tất cả</button>
          <button 
            className={`btn btn-sm rounded-pill px-3 ${filterType === "H2" ? "btn-primary shadow-sm" : "btn-link text-muted text-decoration-none"}`}
            onClick={() => setFilterType("H2")}
          >Nhập mua hàng (H2)</button>
          <button 
            className={`btn btn-sm rounded-pill px-3 ${filterType === "H3" ? "btn-primary shadow-sm" : "btn-link text-muted text-decoration-none"}`}
            onClick={() => setFilterType("H3")}
          >Nhập thành phẩm (H3)</button>
        </div>
      </div>

      {/* Ticket List */}
      <div className="app-card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 20 }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr style={{ height: 50 }}>
                <th className="ps-4 text-uppercase small fw-bold text-muted" style={{ width: 180 }}>Mã phiếu / Ngày</th>
                <th className="text-uppercase small fw-bold text-muted">Loại nghiệp vụ</th>
                <th className="text-uppercase small fw-bold text-muted">Chứng từ gốc (PO/WO)</th>
                <th className="text-uppercase small fw-bold text-muted">Đối tác / Bộ phận</th>
                <th className="text-uppercase small fw-bold text-muted text-center">Trạng thái</th>
                <th className="pe-4 text-uppercase small fw-bold text-muted text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tickets.filter(t => filterType === "all" || t.type === filterType).map(ticket => (
                <tr key={ticket.id} style={{ height: 75 }} className="cursor-pointer" onClick={() => setActiveTicket(ticket)}>
                  <td className="ps-4">
                    <div className="fw-bold">{ticket.code}</div>
                    <div className="text-muted small">{new Date(ticket.createdAt).toLocaleDateString("vi-VN")}</div>
                  </td>
                  <td>
                    <span className={`fw-bold ${ticket.type === "H2" ? "text-primary" : "text-success"}`}>
                      {ticket.type === "H2" ? "Nhập mua hàng" : "Nhập thành phẩm"}
                    </span>
                  </td>
                  <td><code className="bg-light px-2 py-1 rounded text-dark">{ticket.sourceCode}</code></td>
                  <td>{ticket.supplierName || ticket.departmentName}</td>
                  <td className="text-center">{getStatusBadge(ticket.status)}</td>
                  <td className="pe-4 text-end">
                    <button className="btn btn-icon btn-light rounded-circle me-1"><i className="bi bi-eye" /></button>
                    <button className="btn btn-icon btn-primary rounded-circle"><i className="bi bi-play-fill" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <InboundForm 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreated={(newTicket) => {
            setTickets([newTicket, ...tickets]);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Simplified Logic Modal Placeholder */}
      {activeTicket && (
        <InboundProcessModal 
          ticket={activeTicket} 
          onClose={() => setActiveTicket(null)} 
          onUpdate={(updated) => {
            setTickets(tickets.map(t => t.id === updated.id ? updated : t));
            setActiveTicket(null);
          }}
        />
      )}
    </div>
  );
}

// ── CREATE MODAL ────────────────────────────────────────────────────────────

function InboundForm({ onClose, onCreated }: { onClose: () => void, onCreated: (t: InboundTicket) => void }) {
  const [type, setType] = useState<"manual" | "po">("manual");
  const [form, setForm] = useState({
    code: `PN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    date: new Date().toISOString().split("T")[0],
    warehouseId: "KHO-TONG",
    assignee: "",
    reason: "Nhập kho hàng hoá",
    notes: "",
  });

  const [items, setItems] = useState<any[]>([
    { id: "1", productId: "", productName: "", unit: "Cái", expectedQty: 1, actualQty: 1, row: "", col: "", tier: "", price: 0 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), productId: "", productName: "", unit: "Cái", expectedQty: 1, actualQty: 1, row: "", col: "", tier: "", price: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSave = () => {
    const newTicket: InboundTicket = {
      id: Math.random().toString(36).substr(2, 9),
      code: form.code,
      type: "H2", // Default to H2 for now
      sourceCode: type === "po" ? "PO-REQUIRED" : "MANUAL",
      status: "qc_checking",
      items: items.map(i => ({
        id: i.id,
        productId: i.productId || "p-gen",
        productName: i.productName || "Sản phẩm mới",
        sku: "SKU-GEN",
        expectedQty: i.expectedQty,
        receivedQty: i.actualQty,
        passedQty: 0,
        failedQty: 0
      })),
      createdAt: new Date(form.date).toISOString()
    };
    onCreated(newTicket);
  };

  const totalQty = items.reduce((acc, i) => acc + i.actualQty, 0);
  const totalValue = items.reduce((acc, i) => acc + (i.actualQty * i.price), 0);

  return (
    <div className="fixed-top vh-100 vw-100 bg-white d-flex flex-column" style={{ zIndex: 6500, animation: "fadeIn 0.2s ease" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .inbound-sidebar { width: 320px; border-right: 1px solid #e2e8f0; background: #f8fafc; overflow-y: auto; }
        .inbound-main { flex: 1; overflow-y: auto; background: #fff; }
        .form-label-sm { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-uppercase; letter-spacing: 0.02em; }
        .table-input { border: 1px solid transparent; background: transparent; transition: all 0.2s; padding: 4px 8px; border-radius: 4px; font-size: 13px; width: 100%; }
        .table-input:focus { border-color: var(--primary); background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(0,48,135,0.1); }
        .table-input:hover { background: #f1f5f9; }
      `}</style>

      {/* Header Bar */}
      <div className="px-4 d-flex align-items-center justify-content-between border-bottom" style={{ height: 60, flexShrink: 0 }}>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
              <i className="bi bi-box-arrow-in-down" />
            </div>
            <div>
              <h6 className="fw-bold mb-0">Phiếu nhập kho</h6>
              <span className="text-muted small" style={{ fontSize: 10 }}>{form.code}</span>
            </div>
          </div>

          <div className="d-flex bg-light p-1 rounded-pill ms-4 shadow-inner" style={{ border: "1px solid #e2e8f0" }}>
            <button 
              className={`btn btn-sm rounded-pill px-3 fw-bold ${type === "manual" ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => setType("manual")}
              style={{ fontSize: 11 }}
            >
              <i className="bi bi-pencil-square me-1" /> Nhập thủ công
            </button>
            <button 
              className={`btn btn-sm rounded-pill px-3 fw-bold ${type === "po" ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => setType("po")}
              style={{ fontSize: 11 }}
            >
              <i className="bi bi-file-earmark-text me-1" /> Theo đơn mua (PO)
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2 shadow-sm" onClick={handleSave} style={{ height: 38 }}>
            <i className="bi bi-check2-circle" /> Xác nhận nhập kho
          </button>
          <button className="btn btn-light rounded-circle p-0 d-flex align-items-center justify-content-center" onClick={onClose} style={{ width: 32, height: 32 }}>
            <i className="bi bi-x-lg text-muted" />
          </button>
        </div>
      </div>

      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Sidebar Info */}
        <div className="inbound-sidebar p-4 d-flex flex-column gap-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-file-earmark-text text-primary" />
              <span className="fw-bold small text-uppercase" style={{ letterSpacing: "0.05em" }}>Thông tin phiếu</span>
            </div>
            
            <div className="mb-3">
              <label className="form-label-sm">Số phiếu nhập</label>
              <input type="text" className="form-control bg-light" value={form.code} readOnly />
            </div>

            <div className="mb-3">
              <label className="form-label-sm">Ngày nhập kho</label>
              <input type="date" className="form-control" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>

            <div className="mb-3">
              <label className="form-label-sm">Kho nhập *</label>
              <select className="form-select" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})}>
                <option value="KHO-TONG">Tổng kho (KHO-TONG)</option>
                <option value="KHO-TP">Kho thành phẩm</option>
                <option value="KHO-LK">Kho linh kiện</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label-sm">Người thực hiện</label>
              <input type="text" className="form-control" placeholder="Tên thủ kho / người nhập" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} />
            </div>

            <div className="mb-3">
              <label className="form-label-sm">Lý do nhập kho</label>
              <textarea className="form-control" rows={2} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>

            <div className="mb-0">
              <label className="form-label-sm">Ghi chú</label>
              <textarea className="form-control" rows={4} placeholder="Ghi chú thêm..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Main Content: Item List */}
        <div className="inbound-main d-flex flex-column p-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
              Danh sách hàng hoá nhập kho
              <span className="badge bg-secondary-subtle text-secondary rounded-pill fw-normal" style={{ fontSize: 10 }}>{items.length} dòng</span>
            </h6>
            <div className="d-flex gap-4 small fw-bold">
              <div><span className="text-muted text-uppercase">Tổng SL:</span> <span className="text-primary ms-1">{totalQty}</span></div>
              <div><span className="text-muted text-uppercase">Giá trị:</span> <span className="text-success ms-1">{totalValue.toLocaleString("vi-VN")} đ</span></div>
            </div>
          </div>

          <div className="border rounded-4 overflow-hidden shadow-sm">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th className="ps-3 text-center text-muted" style={{ width: 40 }}>#</th>
                  <th className="text-muted">HÀNG HOÁ</th>
                  <th className="text-center text-muted" style={{ width: 80 }}>ĐVT</th>
                  <th className="text-center bg-light bg-opacity-50 text-muted" style={{ width: 100 }}>THEO CT</th>
                  <th className="text-center bg-light bg-opacity-50 text-muted" style={{ width: 100 }}>THỰC TẾ</th>
                  <th className="text-center text-muted" style={{ width: 80 }}>HÀNG</th>
                  <th className="text-center text-muted" style={{ width: 80 }}>CỘT</th>
                  <th className="text-center text-muted" style={{ width: 80 }}>TẦNG</th>
                  <th className="text-end text-muted" style={{ width: 120 }}>ĐƠN GIÁ (đ)</th>
                  <th className="text-end text-muted" style={{ width: 140 }}>THÀNH TIỀN</th>
                  <th className="pe-3" style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="ps-3 text-center text-muted small">{idx + 1}</td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input fw-bold" 
                        placeholder="Chọn hoặc nhập tên hàng hoá..." 
                        value={item.productName} 
                        onChange={e => setItems(items.map(it => it.id === item.id ? {...it, productName: e.target.value} : it))}
                      />
                    </td>
                    <td className="text-center">
                      <input type="text" className="table-input text-center" value={item.unit} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, unit: e.target.value} : it))} />
                    </td>
                    <td className="text-center bg-light bg-opacity-25">
                      <input type="number" className="table-input text-center" value={item.expectedQty} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, expectedQty: Number(e.target.value)} : it))} />
                    </td>
                    <td className="text-center bg-light bg-opacity-25">
                      <input type="number" className="table-input text-center fw-bold text-primary" value={item.actualQty} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, actualQty: Number(e.target.value)} : it))} />
                    </td>
                    <td><input type="text" className="table-input text-center" placeholder="Hàng" value={item.row} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, row: e.target.value} : it))} /></td>
                    <td><input type="text" className="table-input text-center" placeholder="Cột" value={item.col} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, col: e.target.value} : it))} /></td>
                    <td><input type="text" className="table-input text-center" placeholder="Tầng" value={item.tier} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, tier: e.target.value} : it))} /></td>
                    <td>
                      <input type="number" className="table-input text-end" value={item.price} onChange={e => setItems(items.map(it => it.id === item.id ? {...it, price: Number(e.target.value)} : it))} />
                    </td>
                    <td className="text-end fw-bold">{(item.actualQty * item.price).toLocaleString("vi-VN")}</td>
                    <td className="pe-3 text-center">
                      {items.length > 1 && (
                        <button className="btn btn-link btn-sm text-danger p-0" onClick={() => handleRemoveItem(item.id)}>
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-link btn-sm text-primary fw-bold text-decoration-none m-3 p-0" onClick={handleAddItem}>
              <i className="bi bi-plus-circle me-2" /> Thêm dòng hàng hoá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROCESS MODAL (THE CORE LOGIC) ──────────────────────────────────────────

function InboundProcessModal({ ticket, onClose, onUpdate }: { ticket: InboundTicket, onClose: () => void, onUpdate: (t: InboundTicket) => void }) {
  const [step, setStep] = useState(ticket.status);
  const [items, setItems] = useState<InboundItem[]>([...ticket.items]);

  const handleStepComplete = (nextStatus: InboundTicket["status"], data: Partial<InboundTicket> = {}) => {
    onUpdate({ ...ticket, status: nextStatus, items, ...data });
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 6000 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 6001 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 24 }}>
            <div className="modal-header border-0 p-4">
              <div>
                <h5 className="modal-title fw-bold">Xử lý nhập kho: {ticket.code}</h5>
                <p className="text-muted small mb-0">Luồng: {ticket.type === "H2" ? "Nhập mua hàng từ NCC" : "Nhập kho thành phẩm"}</p>
              </div>
              <button className="btn-close" onClick={onClose} />
            </div>
            
            <div className="modal-body p-4 pt-0">
              {/* Process Stepper */}
              <div className="d-flex justify-content-between mb-5 position-relative">
                <div className="position-absolute top-50 start-0 end-0 border-top" style={{ zIndex: -1, marginTop: -8 }} />
                {["receiving", "qc_checking", ticket.type === "H3" ? "accounting_pending" : null, "completed"].filter(Boolean).map((s, idx) => {
                   const isActive = s === ticket.status;
                   const isPast = ["completed", "accounting_pending", "qc_checking", "receiving"].indexOf(ticket.status) > ["completed", "accounting_pending", "qc_checking", "receiving"].indexOf(s as any);
                   return (
                     <div key={s} className="bg-white px-2 text-center" style={{ width: "25%" }}>
                       <div className={`rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center shadow-sm ${isActive ? "bg-primary text-white" : isPast ? "bg-success text-white" : "bg-light text-muted"}`} style={{ width: 36, height: 36, fontWeight: "bold" }}>
                         {isPast ? <i className="bi bi-check-lg" /> : idx + 1}
                       </div>
                       <div className={`small fw-bold ${isActive ? "text-primary" : "text-muted"}`} style={{ fontSize: 10 }}>{s?.toUpperCase()}</div>
                     </div>
                   );
                })}
              </div>

              {/* Step Content */}
              <div className="bg-light p-4 rounded-4">
                {ticket.status === "qc_checking" && (
                  <div className="animate__animated animate__fadeIn">
                    <h6 className="fw-bold mb-3"><i className="bi bi-shield-check me-2" />Kiểm tra chất lượng (QC)</h6>
                    <table className="table table-sm bg-transparent">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th className="text-center">Tổng nhận</th>
                          <th className="text-center">Đạt (OK)</th>
                          <th className="text-center">Lỗi (NG)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td className="text-center">{item.receivedQty}</td>
                            <td className="text-center">
                              <input type="number" className="form-control form-control-sm text-center mx-auto" style={{ width: 80 }} value={item.passedQty} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, passedQty: Number(e.target.value)} : i))} />
                            </td>
                            <td className="text-center text-danger fw-bold">{item.receivedQty - item.passedQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="d-flex gap-3 mt-4">
                      <button className="btn btn-success flex-grow-1 fw-bold" onClick={() => handleStepComplete(ticket.type === "H3" ? "accounting_pending" : "completed", { qcResult: "pass" })}>
                        Xác nhận Đạt & Chuyển bước
                      </button>
                      <button className="btn btn-outline-danger flex-grow-1 fw-bold" onClick={() => handleStepComplete("faulty_handling", { qcResult: "fail" })}>
                        Có hàng lỗi - Lập biên bản
                      </button>
                    </div>
                  </div>
                )}

                {ticket.status === "accounting_pending" && (
                  <div className="text-center py-4">
                    <i className="bi bi-calculator fs-1 text-primary mb-3" />
                    <h6 className="fw-bold">Đang chờ Kế toán duyệt nhập kho</h6>
                    <p className="text-muted small">Thông tin đã được gửi đến bộ phận Tài chính - Kế toán để xác nhận giá thành thành phẩm.</p>
                    <button className="btn btn-primary px-5 fw-bold mt-3" onClick={() => handleStepComplete("completed")}>
                      Mô phỏng: Kế toán đã duyệt
                    </button>
                  </div>
                )}

                {ticket.status === "completed" && (
                  <div className="text-center py-4">
                    <i className="bi bi-check-circle-fill fs-1 text-success mb-3" />
                    <h6 className="fw-bold">Nhập kho hoàn tất</h6>
                    <p className="text-muted small">Hàng hóa đã được ghi nhận vào tồn kho thực tế.</p>
                    <button className="btn btn-outline-secondary px-5 fw-bold mt-3" onClick={onClose}>Đóng</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
