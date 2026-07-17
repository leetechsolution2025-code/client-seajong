"use client";

import React, { useState, useEffect, useRef } from "react";
import { StandardPage } from "@/components/layout/StandardPage";

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
};

type InvoiceItem = {
  name: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
  taxRate: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  supplier: string;
  supplierTaxCode: string;
  supplierAddress?: string;
  buyerName?: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
  items?: InvoiceItem[];
  totalAmount: number;
  taxAmount: number;
  statusTaxCode: "active" | "inactive" | "suspended";
  statusSignature: "valid" | "invalid" | "missing";
  statusAi: "green" | "yellow" | "red";
  aiNotes: string;
};

export default function InvoicesCheckPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Email Settings
  const [emailConfig, setEmailConfig] = useState({ email: "", password: "", syncMode: "UNSEEN" });
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInvoices();
    const savedEmail = localStorage.getItem("taxbot_email") || "";
    const savedPass = localStorage.getItem("taxbot_password") || "";
    const savedMode = localStorage.getItem("taxbot_sync_mode") || "UNSEEN";
    setEmailConfig({ email: savedEmail, password: savedPass, syncMode: savedMode });
  }, []);

  const saveSettings = () => {
    localStorage.setItem("taxbot_email", emailConfig.email);
    localStorage.setItem("taxbot_password", emailConfig.password);
    localStorage.setItem("taxbot_sync_mode", emailConfig.syncMode);
    setShowSettings(false);
    alert("Đã lưu cấu hình email thành công!");
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/finance/tax/invoices-check");
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncEmails = async () => {
    if (!emailConfig.email || !emailConfig.password) {
      alert("Vui lòng cấu hình Email và Mật khẩu ứng dụng trước khi đồng bộ.");
      setShowSettings(true);
      return;
    }

    setIsProcessingUpload(true);
    try {
      const res = await fetch("/api/finance/tax/invoices-check/sync-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: emailConfig.email, 
          password: emailConfig.password,
          syncMode: emailConfig.syncMode
        })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.data && data.data.length > 0) {
          setInvoices(prev => [...data.data, ...prev]);
          alert(`Thành công! ${data.message}`);
        } else {
          alert("Không có hóa đơn mới nào trong hòm thư.");
        }
      } else {
        alert("Lỗi đồng bộ: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi hệ thống khi kết nối IMAP.");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml")) {
      alert("Hệ thống hiện tại (phiên bản không dùng OCR) chỉ hỗ trợ file Hóa đơn XML chuẩn.");
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
      return;
    }

    setIsProcessingUpload(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/finance/tax/invoices-check/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
        setInvoices(prev => [data.data, ...prev]);
      } else {
        alert("Lỗi khi quét hóa đơn: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi kết nối tới AI Parser.");
    } finally {
      setIsProcessingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Stats
  const totalInvoices = invoices.length;
  const greenInvoices = invoices.filter(i => i.statusAi === "green").length;
  const yellowInvoices = invoices.filter(i => i.statusAi === "yellow").length;
  const redInvoices = invoices.filter(i => i.statusAi === "red").length;

  const customTickerNews = [
    { text: `• Tổng hóa đơn đã quét: <span class="fw-bold text-primary">${totalInvoices}</span>`, type: 'text' },
    { text: `• Hợp lệ (Sẵn sàng kê khai): <span class="fw-bold text-success">${greenInvoices}</span>`, type: 'text' },
    { text: `• Cảnh báo (Cần giải trình): <span class="fw-bold text-warning">${yellowInvoices}</span>`, type: 'text' },
    { text: `• Rủi ro (Không hợp lệ): <span class="fw-bold text-danger">${redInvoices}</span>`, type: 'text' }
  ];

  return (
    <StandardPage
      title="Kiểm tra hóa đơn tự động"
      description="Đối soát hóa đơn đầu vào, đầu ra tự động từ cơ quan Thuế."
      useCard={false}
      color="indigo"
      customTickerNews={customTickerNews}
    >
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0, gap: "1rem" }}>
        <div className="row g-4 flex-shrink-0">
          {/* Email Auto Forward & Drag Drop Area */}
        <div className="col-12">
          <div className="app-card border-0 shadow-sm bg-white">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-6 border-end pe-4">
                  <h6 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
                    <span><i className="bi bi-envelope-paper text-primary me-2"></i>Email nhận hóa đơn tự động</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowSettings(true)} title="Cài đặt kết nối IMAP">
                      <i className="bi bi-gear"></i> Cài đặt
                    </button>
                  </h6>
                  <p className="text-muted small mb-3">
                    Hệ thống sẽ tự động đăng nhập vào hòm thư bằng IMAP để quét và tải các file Hóa đơn XML về thay vì tải lên thủ công.
                  </p>
                  
                  <div className="d-flex align-items-center mb-3">
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-envelope"></i></span>
                      <input type="text" className="form-control bg-light" 
                        value={emailConfig.email || "Chưa cấu hình Email"} readOnly />
                    </div>
                    <button className="btn btn-primary ms-2 text-nowrap d-flex align-items-center" onClick={syncEmails} disabled={isProcessingUpload}>
                      {isProcessingUpload ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span> Đang chạy...</>
                      ) : (
                        <><i className="bi bi-arrow-repeat me-2"></i> Đồng bộ ngay</>
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-md-6 ps-4">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="d-none" 
                    accept=".xml" 
                    onChange={handleFileChange} 
                  />
                  <div 
                    className={`border rounded-3 d-flex flex-column align-items-center justify-content-center p-4 text-center transition-all ${isDragging ? 'border-primary bg-primary-subtle border-2' : 'border-dashed text-muted bg-light'}`}
                    style={{ minHeight: "140px", borderStyle: "dashed", cursor: "pointer" }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    {isProcessingUpload ? (
                      <>
                        <div className="spinner-border text-primary mb-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <h6 className="fw-bold mb-1 text-primary">AI đang quét và đối chiếu...</h6>
                        <span className="small">Vui lòng chờ trong giây lát</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up fs-2 mb-2 text-primary"></i>
                        <h6 className="fw-bold mb-1">Kéo thả XML/PDF hóa đơn vào đây</h6>
                        <span className="small">Hoặc click để chọn tệp (Hỗ trợ .zip, .rar)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white border rounded-4 d-flex flex-column flex-grow-1 position-relative shadow-sm overflow-hidden p-0" style={{ minHeight: 400 }}>
          <div className="card-body p-0 d-flex flex-column h-100">
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light flex-shrink-0">
              <h6 className="fw-bold mb-0"><i className="bi bi-list-columns-reverse text-primary me-2"></i>Danh sách Hóa đơn & Kết quả Audit</h6>
              <div className="d-flex gap-2">
                <input type="text" className="form-control form-control-sm" placeholder="Tìm kiếm MST, Số HĐ..." style={{ width: "200px" }} />
                <button className="btn btn-sm btn-outline-secondary"><i className="bi bi-funnel"></i> Lọc</button>
              </div>
            </div>
            
            <div className="table-responsive flex-grow-1 h-100 overflow-auto">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: "13.5px" }}>
              <thead className="table-light text-nowrap">
                <tr>
                  <th className="ps-3 py-3">Mã Hóa Đơn / Ngày</th>
                  <th>Nhà cung cấp / MST</th>
                  <th className="text-end">Tiền Hàng / Tiền Thuế</th>
                  <th className="text-center">Trạng thái MST</th>
                  <th className="text-center">Chữ ký số</th>
                  <th>Kết luận AI Audit</th>
                  <th className="text-center pe-3">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <span className="spinner-border spinner-border-sm text-primary me-2"></span> Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      Không có hóa đơn nào
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className={inv.statusAi === "red" ? "table-danger" : ""}>
                      <td className="ps-3">
                        <div className="fw-bold">{inv.invoiceNumber}</div>
                        <div className="text-muted small">{inv.date}</div>
                      </td>
                      <td style={{ maxWidth: "250px" }}>
                        <div className="fw-medium text-dark text-truncate" title={inv.supplier}>{inv.supplier}</div>
                        <div className="text-muted small text-truncate" title={`MST: ${inv.supplierTaxCode}`}>MST: {inv.supplierTaxCode}</div>
                      </td>
                      <td className="text-end">
                        <div className="fw-bold">{formatCurrency(inv.totalAmount)}</div>
                        <div className="small text-muted">Thuế: {formatCurrency(inv.taxAmount)}</div>
                      </td>
                      <td className="text-center">
                        {inv.statusTaxCode === "active" ? (
                          <span className="badge bg-success-subtle text-success border border-success">Đang HĐ</span>
                        ) : (
                          <span className="badge bg-danger text-white">Đã Đóng</span>
                        )}
                      </td>
                      <td className="text-center">
                        {inv.statusSignature === "valid" ? (
                          <span className="badge bg-success-subtle text-success border border-success">Hợp lệ</span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger border border-danger">Lỗi CKS</span>
                        )}
                      </td>
                      <td>
                        {inv.statusAi === "green" && (
                          <div className="d-flex align-items-center text-success">
                            <i className="bi bi-circle-fill me-2 small"></i>
                            <span>{inv.aiNotes}</span>
                          </div>
                        )}
                        {inv.statusAi === "yellow" && (
                          <div className="d-flex align-items-center text-warning fw-medium">
                            <i className="bi bi-exclamation-circle-fill me-2"></i>
                            <span style={{ maxWidth: "250px", display: "inline-block" }}>{inv.aiNotes}</span>
                          </div>
                        )}
                        {inv.statusAi === "red" && (
                          <div className="d-flex align-items-start text-danger fw-bold">
                            <i className="bi bi-shield-x me-2 mt-1 fs-6"></i>
                            <span style={{ maxWidth: "250px", display: "inline-block" }}>{inv.aiNotes}</span>
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <button 
                          className="btn btn-sm btn-outline-primary rounded-circle" 
                          title="Xem chi tiết"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {inv.statusAi === "yellow" && (
                          <button className="btn btn-sm btn-success rounded-pill px-3 ms-1">
                            Duyệt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>

      {/* Fullscreen Invoice Modal */}
      {selectedInvoice && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-fullscreen">
            <div className="modal-content bg-light">
              <div className="modal-header bg-white border-bottom shadow-sm z-1">
                <h5 className="modal-title fw-bold">
                  KẾT QUẢ KIỂM TRA HÓA ĐƠN
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedInvoice(null)}></button>
              </div>
              <div className="modal-body p-4 overflow-auto">
                <div className="row g-4 h-100">
                  
                  {/* Left Column: Invoice Mockup */}
                  <div className="col-lg-8">
                    <div className="card border-0 shadow-sm h-100 rounded-3">
                      <div className="card-body p-5">
                        <div className="text-center mb-5 border-bottom pb-4">
                          <h4 className="fw-bold text-uppercase text-primary mb-2">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h4>
                          <p className="text-muted mb-0">Bản thể hiện của hóa đơn điện tử</p>
                        </div>

                        <div className="row mb-5">
                          <div className="col-md-7">
                            <h6 className="fw-bold text-uppercase text-dark mb-1">{selectedInvoice.supplier}</h6>
                            <p className="mb-1 small"><span className="text-muted">Mã số thuế:</span> <span className="fw-medium">{selectedInvoice.supplierTaxCode}</span></p>
                            <p className="mb-0 small"><span className="text-muted">Địa chỉ:</span> {selectedInvoice.supplierAddress}</p>
                          </div>
                          <div className="col-md-5 text-md-end border-start">
                            <p className="mb-1 small"><span className="text-muted">Mẫu số:</span> 1</p>
                            <p className="mb-1 small"><span className="text-muted">Ký hiệu:</span> {selectedInvoice.invoiceNumber.split('/')[0]}</p>
                            <p className="mb-1 small"><span className="text-muted">Số hóa đơn:</span> <span className="fw-bold text-danger">{selectedInvoice.invoiceNumber.split('/')[1]}</span></p>
                            <p className="mb-0 small"><span className="text-muted">Ngày lập:</span> {selectedInvoice.date}</p>
                          </div>
                        </div>

                        <div className="bg-light p-3 rounded-3 mb-4">
                          <h6 className="fw-bold mb-2">Thông tin người mua hàng</h6>
                          <p className="mb-1 small"><span className="text-muted">Tên đơn vị:</span> {selectedInvoice.buyerName}</p>
                          <p className="mb-1 small"><span className="text-muted">Mã số thuế:</span> <span className="fw-medium">{selectedInvoice.buyerTaxCode}</span></p>
                          <p className="mb-0 small"><span className="text-muted">Địa chỉ:</span> {selectedInvoice.buyerAddress}</p>
                        </div>

                        <div className="table-responsive mb-4">
                          <table className="table table-bordered table-sm align-middle">
                            <thead className="table-light text-center small">
                              <tr>
                                <th>STT</th>
                                <th>Tên hàng hóa, dịch vụ</th>
                                <th>ĐVT</th>
                                <th>Số lượng</th>
                                <th>Đơn giá</th>
                                <th>Thuế suất</th>
                                <th>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody className="small">
                              {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                                selectedInvoice.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="text-center">{idx + 1}</td>
                                    <td>{item.name}</td>
                                    <td className="text-center">{item.unit}</td>
                                    <td className="text-end">{item.quantity}</td>
                                    <td className="text-end">{formatCurrency(item.price)}</td>
                                    <td className="text-center">{item.taxRate}</td>
                                    <td className="text-end fw-medium">{formatCurrency(item.total)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan={7} className="text-center text-muted">Không có dữ liệu chi tiết hàng hóa</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="row justify-content-end">
                          <div className="col-md-6">
                            <table className="table table-sm table-borderless small mb-0">
                              <tbody>
                                <tr>
                                  <td className="text-end text-muted">Cộng tiền hàng:</td>
                                  <td className="text-end fw-medium" style={{ width: "150px" }}>{formatCurrency(selectedInvoice.totalAmount - selectedInvoice.taxAmount)}</td>
                                </tr>
                                <tr>
                                  <td className="text-end text-muted">Tiền thuế GTGT:</td>
                                  <td className="text-end fw-medium">{formatCurrency(selectedInvoice.taxAmount)}</td>
                                </tr>
                                <tr className="border-top">
                                  <td className="text-end fw-bold">Tổng tiền thanh toán:</td>
                                  <td className="text-end fw-bold text-primary">{formatCurrency(selectedInvoice.totalAmount)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Right Column: AI Audit Results */}
                  <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100 rounded-3">
                      <div className="card-header bg-white border-bottom py-3">
                        <h6 className="fw-bold mb-0 text-primary">KẾT QUẢ KIỂM TRA (AI AUDITOR)</h6>
                      </div>
                      <div className="card-body p-4 bg-light">
                        
                        {/* Overall Status */}
                        <div className={`alert border-0 shadow-sm mb-4 ${selectedInvoice.statusAi === 'green' ? 'alert-success' : selectedInvoice.statusAi === 'yellow' ? 'alert-warning' : 'alert-danger'}`}>
                          <div className="d-flex align-items-center">
                            <i className={`fs-3 me-3 bi ${selectedInvoice.statusAi === 'green' ? 'bi-check-circle-fill' : selectedInvoice.statusAi === 'yellow' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill'}`}></i>
                            <div>
                              <h6 className="fw-bold mb-1">
                                {selectedInvoice.statusAi === 'green' ? 'HÓA ĐƠN HỢP LỆ' : selectedInvoice.statusAi === 'yellow' ? 'CẢNH BÁO RỦI RO NHẸ' : 'HÓA ĐƠN RỦI RO CAO'}
                              </h6>
                              <span className="small">{selectedInvoice.aiNotes}</span>
                            </div>
                          </div>
                        </div>

                        {/* Checklist */}
                        <div className="bg-white p-3 rounded-3 shadow-sm mb-4 border">
                          <h6 className="fw-bold small text-muted text-uppercase mb-3 border-bottom pb-2">Hệ thống cơ quan thuế</h6>
                          <div className="d-flex align-items-start mb-3">
                            <i className={`bi ${selectedInvoice.statusTaxCode === 'active' ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} mt-1 me-2`}></i>
                            <div>
                              <p className="mb-0 fw-medium text-dark small">Tình trạng người nộp thuế</p>
                              <p className="mb-0 text-muted" style={{ fontSize: "12px" }}>
                                {selectedInvoice.statusTaxCode === 'active' ? 'Doanh nghiệp đang hoạt động bình thường.' : 'Doanh nghiệp ngừng hoạt động hoặc bỏ trốn.'}
                              </p>
                            </div>
                          </div>
                          
                          <h6 className="fw-bold small text-muted text-uppercase mb-3 mt-4 border-bottom pb-2">Chứng thực điện tử</h6>
                          <div className="d-flex align-items-start">
                            <i className={`bi ${selectedInvoice.statusSignature === 'valid' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning'} mt-1 me-2`}></i>
                            <div>
                              <p className="mb-0 fw-medium text-dark small">Chữ ký số nhà cung cấp</p>
                              <p className="mb-0 text-muted" style={{ fontSize: "12px" }}>
                                {selectedInvoice.statusSignature === 'valid' ? 'Chữ ký điện tử hợp lệ, nguyên vẹn.' : 'Không tìm thấy hoặc chứng thư số lỗi.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="d-grid mt-auto">
                          <button className="btn btn-outline-primary" onClick={() => setSelectedInvoice(null)}>
                            Đóng cửa sổ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offcanvas Settings */}
      {showSettings && (
        <>
          <div className="offcanvas-backdrop fade show" onClick={() => setShowSettings(false)}></div>
          <div className="offcanvas offcanvas-end show" tabIndex={-1} style={{ visibility: "visible" }}>
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title fw-bold">Cài đặt kết nối Email</h5>
              <button type="button" className="btn-close" onClick={() => setShowSettings(false)}></button>
            </div>
            <div className="offcanvas-body">
              <div className="alert alert-info border-0 bg-primary-subtle text-primary-emphasis mb-4 small">
                <i className="bi bi-info-circle-fill me-2"></i>
                Hệ thống sử dụng giao thức IMAP an toàn để tự động tải Hóa đơn XML từ hòm thư của bạn. Vui lòng sử dụng <strong>Mật khẩu ứng dụng (App Password)</strong> thay vì mật khẩu đăng nhập gốc để đảm bảo bảo mật.
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Địa chỉ Email (Gmail)</label>
                <input type="email" className="form-control" placeholder="ketoan@gmail.com" 
                  value={emailConfig.email} onChange={e => setEmailConfig({...emailConfig, email: e.target.value})} />
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium">Mật khẩu ứng dụng (App Password)</label>
                <input type="password" className="form-control" placeholder="16 ký tự, ví dụ: abcd efgh ijkl mnop" 
                  value={emailConfig.password} onChange={e => setEmailConfig({...emailConfig, password: e.target.value})} />
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium">Chế độ đồng bộ</label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="syncMode" id="modeUnseen" 
                      checked={emailConfig.syncMode === "UNSEEN"} 
                      onChange={() => setEmailConfig({...emailConfig, syncMode: "UNSEEN"})} />
                    <label className="form-check-label text-muted" htmlFor="modeUnseen">
                      Hóa đơn mới (Chưa đọc)
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="syncMode" id="modeAll" 
                      checked={emailConfig.syncMode === "ALL"} 
                      onChange={() => setEmailConfig({...emailConfig, syncMode: "ALL"})} />
                    <label className="form-check-label text-muted" htmlFor="modeAll">
                      Tất cả thư
                    </label>
                  </div>
                </div>
              </div>

              <div className="card border-0 bg-light rounded-3 mb-4">
                <div className="card-body p-3 small">
                  <h6 className="fw-bold mb-2">Hướng dẫn tạo App Password:</h6>
                  <ol className="mb-0 ps-3 text-muted">
                    <li className="mb-1">Truy cập vào <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">Tài khoản Google &gt; Bảo mật</a>.</li>
                    <li className="mb-1">Đảm bảo bạn đã bật <strong>Xác minh 2 bước</strong>.</li>
                    <li className="mb-1">Tìm mục <strong>Mật khẩu ứng dụng (App passwords)</strong>.</li>
                    <li className="mb-1">Tạo mật khẩu mới cho ứng dụng "Thư (Mail)".</li>
                    <li>Copy đoạn mã 16 ký tự màu vàng và dán vào ô bên trên.</li>
                  </ol>
                </div>
              </div>

            </div>
            <div className="offcanvas-footer p-3 border-top d-flex justify-content-end gap-2 bg-light">
              <button className="btn btn-light border" onClick={() => setShowSettings(false)}>Hủy bỏ</button>
              <button className="btn btn-primary px-4" onClick={saveSettings}>Lưu cấu hình</button>
            </div>
          </div>
        </>
      )}
    </StandardPage>
  );
}
