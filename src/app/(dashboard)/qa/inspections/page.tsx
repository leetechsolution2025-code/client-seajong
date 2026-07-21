"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import toast from "react-hot-toast";

export default function QaInspectionsPage() {
  const [filterType, setFilterType] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [showIqcModal, setShowIqcModal] = useState(false);
  const [showOqcModal, setShowOqcModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/company')
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setCompanyInfo(data);
      })
      .catch(err => console.error("Error fetching company info:", err));
  }, []);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [tempRejectReason, setTempRejectReason] = useState("");
  const [tempRejectCategories, setTempRejectCategories] = useState<string[]>(["Loại khác"]);
  const [tempRejectFiles, setTempRejectFiles] = useState<File[]>([]);

  const [iqcFormData, setIqcFormData] = useState({
    supplier: "",
    model: "",
    batch: "",
    totalQuantity: "",
    sampleQuantity: "",
    check1: "pass",
    check2: "pass",
    check3: "pass",
    check4: "pass",
    result: "pass",
    rejectReason: "",
    rejectCategories: ["Loại khác"]
  });

  const handleIqcChange = (e: any) => {
    const { name, value } = e.target;
    setIqcFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePassCheck = () => {
    setIqcFormData(prev => ({ ...prev, result: "pass", rejectReason: "", rejectCategories: ["Loại khác"] }));
  };

  const handleFailCheck = () => {
    setTempRejectReason(iqcFormData.rejectReason);
    setTempRejectCategories(iqcFormData.rejectCategories);
    setTempRejectFiles([]);
    setShowRejectModal(true);
  };

  const [oqcFormData, setOqcFormData] = useState({
    assemblyTeam: "",
    productionOrder: "",
    bomCode: "",
    model: "",
    batch: "",
    totalQuantity: "",
    sampleQuantity: "",
    check1: "pass",
    check2: "pass",
    check3: "pass",
    check4: "pass",
    check5: "pass",
    result: "pass",
    rejectReason: "",
    rejectCategories: ["Loại khác"]
  });

  const handleOqcChange = (e: any) => {
    const { name, value } = e.target;
    setOqcFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOqcPassCheck = () => {
    setOqcFormData(prev => ({ ...prev, result: "pass", rejectReason: "", rejectCategories: ["Loại khác"] }));
  };

  const handleOqcFailCheck = () => {
    setTempRejectReason(oqcFormData.rejectReason);
    setTempRejectCategories(oqcFormData.rejectCategories);
    setTempRejectFiles([]);
    setShowRejectModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setTempRejectFiles(prev => [...prev, ...newFiles]);
    }
  };

  const submitRejectReason = () => {
    if (showIqcModal) {
      setIqcFormData(prev => ({ 
        ...prev, 
        result: "fail", 
        rejectReason: tempRejectReason || "Không có lý do",
        rejectCategories: tempRejectCategories.length > 0 ? tempRejectCategories : ["Loại khác"]
      }));
    } else if (showOqcModal) {
      setOqcFormData(prev => ({ 
        ...prev, 
        result: "fail", 
        rejectReason: tempRejectReason || "Không có lý do",
        rejectCategories: tempRejectCategories.length > 0 ? tempRejectCategories : ["Loại khác"]
      }));
    }
    setShowRejectModal(false);
  };

  const handleCategoryChange = (category: string) => {
    setTempRejectCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSaveOqcResult = async () => {
    if (!selectedInspection) return;
    try {
      const res = await fetch(`/api/qa/inspections/${selectedInspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          result: oqcFormData.result === "pass" ? "Đạt" : "Không đạt",
          notes: oqcFormData.rejectReason || ""
        })
      });
      if (res.ok) {
        toast.success("Đã lưu kết quả OQC!");
        setShowOqcModal(false);
        setSelectedInspection(null);
        // refresh list
        fetch('/api/qa/inspections').then(r=>r.json()).then(data => {
          if (Array.isArray(data)) {
            setInspections(data.map(d => ({
              id: d.code,
              type: d.type,
              product: d.productName || d.inventoryItem?.tenHang || "Không xác định",
              inspector: d.requesterName || d.inspectorName || "Không xác định",
              department: d.requesterDept || "Khác",
              date: new Date(d.executionTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
              result: d.status === "Chưa thực hiện" ? "Pending" : (d.result === "Đạt" ? "Pass" : "Fail"),
              notes: d.notes,
              poNumber: "",
              deliveryNote: ""
            })));
          }
        });
      } else {
        toast.error("Lỗi khi lưu kết quả");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi hệ thống");
    }
  };

  const [inspections, setInspections] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/qa/inspections')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map(d => ({
            id: d.code,
            type: d.type,
            product: d.productName || d.inventoryItem?.tenHang || "Không xác định",
            inspector: d.requesterName || d.inspectorName || "Không xác định",
            department: d.requesterDept || "Khác",
            date: new Date(d.executionTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
            result: d.status === "Chưa thực hiện" ? "Pending" : (d.result === "Đạt" ? "Pass" : "Fail"),
            notes: d.notes,
            poNumber: "",
            deliveryNote: ""
          }));
          setInspections(formatted);
        }
      })
      .catch(err => console.error("Error fetching inspections:", err));
  }, []);

  const filteredInspections = inspections.filter(ins => {
    if (filterType !== "ALL" && ins.type !== filterType) return false;
    if (filterDepartment === "MUA_HANG" && !ins.department.includes("Mua hàng")) return false;
    if (filterDepartment === "SAN_XUAT" && !ins.department.includes("Sản xuất")) return false;
    if (filterDepartment === "KHO" && !ins.department.includes("Kho vận")) return false;
    if (filterStatus === "PENDING" && ins.result !== "Pending") return false;
    if (filterStatus === "COMPLETED" && ins.result === "Pending") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!ins.id.toLowerCase().includes(q) && !ins.inspector.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getTypeColor = (type: string) => {
    switch(type) {
      case "IQC": return "primary";
      case "OQC": return "warning";
      default: return "secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case "IQC": return "IQC (Đầu vào)";
      case "OQC": return "OQC (Đầu ra)";
      default: return type;
    }
  };

  const getStatusText = (result: string) => {
    switch(result) {
      case "Completed": return "Đã hoàn thành";
      case "Pending": return "Chưa thực hiện";
      case "Pass": return "Đã hoàn thành";
      case "Fail": return "Đã hoàn thành";
      default: return result;
    }
  };

  const getStatusColor = (result: string) => {
    switch(result) {
      case "Completed": return "text-success";
      case "Pass": return "text-success";
      case "Fail": return "text-success";
      case "Pending": return "text-warning";
      default: return "text-secondary";
    }
  };

  const columns: TableColumn<typeof inspections[0]>[] = [
    {
      header: <input type="checkbox" className="form-check-input m-0" />,
      width: 40,
      align: "center",
      render: () => <input type="checkbox" className="form-check-input m-0" />
    },
    {
      header: "Mã phiếu",
      render: (row) => (
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center">
            <span className="fw-bold text-dark small">{row.id}</span>
            <span className="text-muted mx-1">|</span>
            <span className={`fw-medium small ${getStatusColor(row.result)}`}>{getStatusText(row.result)}</span>
          </div>
          <span className="text-muted mt-1" style={{ fontSize: 11 }}>
            {row.date} <span className="mx-1">|</span> {getTypeLabel(row.type)}
          </span>
        </div>
      )
    },
    {
      header: "Sản phẩm / Vật tư",
      render: (row) => <span className="fw-medium text-dark small">{row.product}</span>
    },
    {
      header: "Người yêu cầu",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-medium text-dark small">{row.inspector}</span>
          <span className="text-muted" style={{ fontSize: 12 }}>{row.department}</span>
        </div>
      )
    },
    {
      header: "Thời gian thực hiện",
      render: (row) => <span className="text-muted small">{row.date}</span>
    },
    {
      header: "Ghi chú",
      render: (row) => (
        <span className="text-muted small d-inline-block text-truncate" style={{ maxWidth: 200 }}>
          {row.notes}
        </span>
      )
    }
  ];

  return (
    <StandardPage
      title="Kiểm tra chất lượng"
      description="Ghi nhận và tra cứu kết quả kiểm tra chất lượng (IQC, OQC)"
      color="blue"
      icon="bi-search"
      useCard={false}
    >
      <style>{`
        .qa-inspections-toolbar .form-control,
        .qa-inspections-toolbar .form-select { font-size: 13.5px !important; }
        .qa-inspections-toolbar .search-icon { font-size: 14px; }
        .qa-inspections-table td { font-size: 13.5px !important; padding-top: 6px !important; padding-bottom: 6px !important; }
        .qa-inspections-table th { font-size: 12.5px !important; padding-top: 6px !important; padding-bottom: 6px !important; }
        .qa-inspections-table .small { font-size: 13px !important; }
        .qa-inspections-table .badge { font-size: 11.5px !important; }
        .border-dotted { border-style: dotted !important; }
      `}</style>
      <div className="bg-white rounded-top-4 shadow-sm border border-bottom-0 p-3 mb-0 qa-inspections-toolbar">
        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3">
          {/* Các bộ lọc */}
          <div className="d-flex flex-column flex-md-row gap-2">
            {/* Bộ phận yêu cầu */}
            <select 
              className="form-select bg-light border-0 rounded-3 flex-grow-1 flex-xl-grow-0" 
              style={{ minWidth: 160 }}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="ALL">Tất cả bộ phận</option>
              <option value="MUA_HANG">Mua hàng</option>
              <option value="SAN_XUAT">Sản xuất</option>
              <option value="KHO">Kho vận</option>
            </select>

            {/* Phân loại (Loại kiểm tra) */}
            <select 
              className="form-select bg-light border-0 rounded-3 flex-grow-1 flex-xl-grow-0" 
              style={{ minWidth: 180 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Tất cả phân loại</option>
              <option value="IQC">IQC (Kiểm tra Đầu vào)</option>
              <option value="OQC">OQC (Kiểm tra Đầu ra)</option>
            </select>

            {/* Trạng thái */}
            <select 
              className="form-select bg-light border-0 rounded-3 flex-grow-1 flex-xl-grow-0" 
              style={{ minWidth: 150 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chưa thực hiện</option>
              <option value="COMPLETED">Đã hoàn thành</option>
            </select>
          </div>

          {/* Hộp tìm kiếm */}
          <div className="position-relative flex-grow-1" style={{ maxWidth: 400 }}>
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted search-icon"></i>
            <input 
              type="text" 
              className="form-control bg-light border-0 rounded-3" 
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Tìm kiếm mã phiếu, người kiểm tra..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-bottom-4 shadow-sm border p-4 flex-grow-1 overflow-hidden d-flex flex-column">
        <SectionTitle title="Danh sách các yêu cầu đánh giá chất lượng" icon="bi-clipboard-check" className="mb-4" />

        <Table 
          columns={columns}
          rows={filteredInspections}
          wrapperClassName="qa-inspections-table"
          compact={true}
          onRowClick={(row) => setSelectedInspection(row)}
        />
      </div>

      {selectedInspection && !showIqcModal && !showOqcModal && (
        <>
          <div className="offcanvas-backdrop fade show" onClick={() => setSelectedInspection(null)} style={{ zIndex: 1040 }}></div>
          <div 
            className="offcanvas offcanvas-end show border-0 shadow" 
            tabIndex={-1} 
            style={{ width: "400px", zIndex: 1045 }}
          >
            <div className="offcanvas-header border-bottom bg-light px-4 py-3">
              <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>Chi tiết yêu cầu</h5>
              <button type="button" className="btn-close" onClick={() => setSelectedInspection(null)}></button>
            </div>
            <div className="offcanvas-body p-4 custom-scrollbar">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <div className="text-muted small mb-1">Mã phiếu</div>
                  <div className="fw-bold fs-5 text-primary d-flex align-items-center">
                    {selectedInspection.id}
                    <span className="text-muted mx-2 fw-normal" style={{ fontSize: "16px" }}>|</span>
                    <span className={`fw-medium ${getStatusColor(selectedInspection.result)}`} style={{ fontSize: "16px" }}>
                      {getStatusText(selectedInspection.result)}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-muted small mb-1">Loại kiểm tra</div>
                  <span className={`badge ${getTypeColor(selectedInspection.type) === 'primary' ? 'bg-primary text-white' : `bg-${getTypeColor(selectedInspection.type)} bg-opacity-10 text-${getTypeColor(selectedInspection.type)}`} border border-${getTypeColor(selectedInspection.type)} ${getTypeColor(selectedInspection.type) !== 'primary' ? 'border-opacity-25' : ''} px-2 py-1 rounded-pill`}>
                    {getTypeLabel(selectedInspection.type)}
                  </span>
                </div>
              </div>

              <div className="card border-0 bg-light mb-4">
                <div className="card-body p-3">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="text-muted small mb-1">Người yêu cầu</div>
                      <div className="fw-medium text-dark">{selectedInspection.inspector}</div>
                      <div className="text-muted small">{selectedInspection.department}</div>
                    </div>
                    <div className="col-12">
                      <div className="text-muted small mb-1">Sản phẩm / Vật tư</div>
                      <div className="fw-medium text-dark">{selectedInspection.product}</div>
                    </div>
                    <div className="col-12">
                      <div className="text-muted small mb-1">Thời gian thực hiện</div>
                      <div className="fw-medium text-dark">{selectedInspection.date}</div>
                    </div>
                    {selectedInspection.type === "IQC" && (
                      <>
                        <div className="col-12">
                          <div className="text-muted small mb-1">Số đơn mua hàng</div>
                          <div className="fw-medium text-dark">{selectedInspection.poNumber || "---"}</div>
                        </div>
                        <div className="col-12">
                          <div className="text-muted small mb-1">Số phiếu giao hàng</div>
                          <div className="fw-medium text-dark">{selectedInspection.deliveryNote || "---"}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-muted small mb-2 fw-medium">Ghi chú yêu cầu</div>
                <div className="bg-light p-3 rounded-3 text-dark small" style={{ minHeight: "80px" }}>
                  {selectedInspection.notes || "Không có ghi chú thêm."}
                </div>
              </div>
            </div>
            <div className="offcanvas-footer border-top p-3 bg-light d-flex gap-2 justify-content-end">
              <button className="btn btn-light border px-4" onClick={() => setSelectedInspection(null)}>Đóng</button>
              <button 
                className="btn btn-primary px-4"
                disabled={selectedInspection.result !== "Pending"}
                onClick={() => {
                  if (selectedInspection.type === "IQC") {
                    setShowIqcModal(true);
                  } else if (selectedInspection.type === "OQC") {
                    setShowOqcModal(true);
                  }
                }}
              >
                <i className="bi bi-check-circle me-2"></i>Thực hiện
              </button>
            </div>
          </div>
        </>
      )}

      {showIqcModal && selectedInspection && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-fullscreen">
              <div className="modal-content bg-light">
                <div className="modal-header border-bottom bg-white px-4 py-3">
                  <h5 className="modal-title fw-bold">Biên bản đánh giá chất lượng (IQC)</h5>
                  <button type="button" className="btn-close" onClick={() => setShowIqcModal(false)}></button>
                </div>
                <div className="modal-body p-0 d-flex flex-column flex-xl-row" style={{ backgroundColor: "#e9ecef" }}>
                  
                  {/* Left Panel */}
                  <div className="bg-white border-end p-4 custom-scrollbar flex-shrink-0" style={{ width: "380px", overflowY: "auto" }}>
                    <h6 className="fw-bold mb-4">THÔNG TIN BIÊN BẢN</h6>
                    
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Nhà cung cấp</label>
                      <input type="text" className="form-control form-control-sm" name="supplier" value={iqcFormData.supplier} onChange={handleIqcChange} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã sản phẩm (Model/SKU)</label>
                      <input type="text" className="form-control form-control-sm" name="model" value={iqcFormData.model} onChange={handleIqcChange} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã số lô hàng (Batch/Lot)</label>
                      <input type="text" className="form-control form-control-sm" name="batch" value={iqcFormData.batch} onChange={handleIqcChange} />
                    </div>
                    <div className="row g-2 mb-4">
                      <div className="col-6">
                        <label className="form-label small fw-medium">SL giao (N)</label>
                        <input type="number" className="form-control form-control-sm" name="totalQuantity" value={iqcFormData.totalQuantity} onChange={handleIqcChange} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-medium">Mẫu rút (n)</label>
                        <input type="number" className="form-control form-control-sm" name="sampleQuantity" value={iqcFormData.sampleQuantity} onChange={handleIqcChange} />
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - A4 Preview */}
                  <div className="flex-grow-1 p-4 p-md-5 custom-scrollbar" style={{ overflowY: "auto" }}>
                    <div 
                      className="bg-white shadow border mx-auto position-relative" 
                      style={{ 
                        width: "21cm", 
                        minHeight: "29.7cm", 
                        padding: "1.5cm 2cm",
                        color: "black",
                        fontFamily: "'Roboto Condensed', sans-serif" 
                      }}
                    >
                    
                    {/* Header */}
                    <div className="row mb-4 align-items-center">
                      <div className="col-8 d-flex align-items-center">
                        {companyInfo?.logoUrl && (
                          <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px", marginRight: "12px", objectFit: "contain" }} />
                        )}
                        <div>
                          <div className="fw-bold text-uppercase" style={{ fontSize: "10pt" }}>
                            {companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM"}
                          </div>
                          <div style={{ fontSize: "9pt" }}>
                            Địa chỉ: {companyInfo?.address || "Đường số 3, KCN Yên Phong, Bắc Ninh"}
                          </div>
                          <div style={{ fontSize: "9pt" }}>
                            SĐT: {companyInfo?.phone || "0222.368.6868"}
                          </div>
                        </div>
                      </div>
                      <div className="col-4 text-end">
                        <div style={{ fontSize: "11pt" }}>
                          <div>Số phiếu: <span className="fw-bold">{selectedInspection.id}</span></div>
                          <div className="fst-italic">Ngày lập: {selectedInspection.date.split(' ')[0]}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 mt-2 text-center">
                      <h4 className="fw-bold text-uppercase mb-1" style={{ fontSize: "16pt" }}>BIÊN BẢN KIỂM TRA CHẤT LƯỢNG HÀNG NHẬP KHO</h4>
                      <div className="fw-bold" style={{ fontSize: "11pt" }}>Bộ phận thực hiện: KIỂM SOÁT CHẤT LƯỢNG</div>
                    </div>

                    {/* Section I */}
                    <div className="mb-4" style={{ fontSize: "11pt", lineHeight: "1.8" }}>
                      <div className="fw-bold text-uppercase mb-2">I. THÔNG TIN CHUNG</div>
                      <div className="row g-2 mb-2">
                        <div className="col-12 d-flex align-items-end">
                          <span className="me-2 text-nowrap">Nhà cung cấp:</span>
                          <span className="fw-bold flex-grow-1 border-bottom border-dark ps-2 text-uppercase" style={{ borderStyle: 'dotted !important', minHeight: '1.2em' }}>{iqcFormData.supplier}</span>
                        </div>
                        <div className="col-6 d-flex align-items-end mt-2">
                          <span className="me-2 text-nowrap">Đơn mua hàng (PO No.):</span>
                          <span className="fw-bold flex-grow-1 border-bottom border-dark text-center" style={{ borderStyle: 'dotted !important', minHeight: '1.2em' }}>{selectedInspection.poNumber || ""}</span>
                        </div>
                        <div className="col-6 d-flex align-items-end mt-2">
                          <span className="me-2 text-nowrap">Số phiếu giao hàng:</span>
                          <span className="fw-bold flex-grow-1 border-bottom border-dark text-center" style={{ borderStyle: 'dotted !important', minHeight: '1.2em' }}>{selectedInspection.deliveryNote || ""}</span>
                        </div>
                        <div className="col-12 mt-4">
                          <div className="fw-bold text-uppercase mb-2">II. Danh sách đối tượng kiểm tra</div>
                          <table className="table table-bordered border-dark mb-0 text-center align-middle" style={{ borderColor: 'black', fontSize: "10pt" }}>
                            <thead className="table-light">
                              <tr>
                                <th className="border-dark" style={{ width: "5%" }}>STT</th>
                                <th className="border-dark" style={{ width: "35%" }}>Tên linh kiện / Sản phẩm</th>
                                <th className="border-dark" style={{ width: "20%" }}>Mã sản phẩm<br/>(Model/SKU)</th>
                                <th className="border-dark" style={{ width: "20%" }}>Mã số lô hàng<br/>(Batch/Lot)</th>
                                <th className="border-dark" style={{ width: "10%" }}>SL giao<br/>(N)</th>
                                <th className="border-dark" style={{ width: "10%" }}>Mẫu rút<br/>(n)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border-dark">1</td>
                                <td className="border-dark text-start fw-bold">{selectedInspection.product}</td>
                                <td className="border-dark fw-bold">{iqcFormData.model}</td>
                                <td className="border-dark fw-bold">{iqcFormData.batch}</td>
                                <td className="border-dark fw-bold">{iqcFormData.totalQuantity}</td>
                                <td className="border-dark fw-bold">{iqcFormData.sampleQuantity}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Section III */}
                    <div className="mb-4 mt-4">
                      <div className="fw-bold text-uppercase mb-2" style={{ fontSize: "11pt" }}>III. BẢNG ĐÁNH GIÁ CHẤT LƯỢNG</div>
                      <div className="fst-italic mb-3" style={{ fontSize: "10pt" }}>
                        QC đối chiếu trực tiếp sản phẩm rút mẫu với các tiêu chuẩn kỹ thuật quy định dưới đây:
                      </div>
                      
                      <table className="table table-bordered border-dark align-middle mb-0" style={{ borderColor: 'black', fontSize: "9pt" }}>
                        <thead className="table-light text-center align-middle">
                          <tr>
                            <th style={{ width: "5%" }} className="border-dark">STT</th>
                            <th style={{ width: "20%" }} className="border-dark">Đặc tính kiểm tra</th>
                            <th style={{ width: "50%" }} className="border-dark">Tiêu chuẩn chất lượng Seajong quy định</th>
                            <th style={{ width: "25%" }} className="border-dark">Phương pháp & Công cụ test nhanh tại kho</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="text-center border-dark">1</td>
                            <td className="fw-medium border-dark">Bao bì & Quy cách</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Đầy đủ giấy tờ chứng chỉ xuất xưởng (COA).</li>
                                <li>Có màng xốp bọc lót chống va đập giữa các sản phẩm.</li>
                                <li>Xốp định hình dày &ge; 3cm (cho đồ sứ/kính).</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Kiểm tra hồ sơ bàn giao.</li>
                                <li>Quan sát cách xếp hàng trong hộp carton.</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">2</td>
                            <td className="fw-medium border-dark">Ngoại quan bề mặt (Thẩm mỹ & Men)</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Nhóm xi mạ/PVD/Inox: Sáng bóng soi gương, không nổ mạ (mụn nước), không xước dăm dài &gt; 2mm ở mặt tiền.</li>
                                <li>Nhóm Sứ/Kính: Men phủ đều 100%, láng mịn, không nứt chân chim, không lỗ châm kim đen (&gt; 0.5mm).</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Quan sát bằng mắt thường dưới ánh sáng đèn bàn test (&ge; 500 Lux).</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">3</td>
                            <td className="fw-medium border-dark">Độ chuẩn ren nối (Cơ khí)</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Ren kết nối chuẩn côn G1/2B hoặc G3/4B (ISO 228-1).</li>
                                <li>Không mẻ ren, không dập ren, không bavia ren (&gt; 0.1mm).</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Vặn thử bằng tay vào Dưỡng ren chuẩn / Linh kiện mẫu chuẩn (Master Sample).<br/>&rarr; Yêu cầu: Trơn tru, khít chặt, không rơ lắc.</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">4</td>
                            <td className="fw-medium border-dark">Vật liệu & Độ dày (Cơ lý)</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Độ biến dạng nén: Gioăng cao su đàn hồi tốt, kéo giãn gấp đôi phải co lại ngay, không bị nứt nẻ, biến dạng.</li>
                                <li>Độ phẳng bề mặt: Độ hở bập bênh của đế sứ/mặt chậu lavabo khi đặt phẳng không quá 1 mm.</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Dùng tay co kéo thử độ đàn hồi.</li>
                                <li>Đặt úp sản phẩm lên bàn phẳng chuẩn của kho để kiểm tra độ bập bênh.</li>
                              </ul>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section IV */}
                    <div style={{ fontSize: "11pt" }}>
                      <div className="fw-bold text-uppercase mb-3">IV. KẾT QUẢ KIỂM TRA CHẤT LƯỢNG</div>
                      
                      <table className="table table-bordered border-dark mb-4 text-center align-middle" style={{ borderColor: 'black', fontSize: "10pt" }}>
                        <thead className="table-light">
                          <tr>
                            <th className="border-dark" style={{ width: "5%" }}>STT</th>
                            <th className="border-dark" style={{ width: "40%" }}>Tên linh kiện / Sản phẩm</th>
                            <th className="border-dark" style={{ width: "15%" }}>Đạt</th>
                            <th className="border-dark" style={{ width: "15%" }}>Không đạt</th>
                            <th className="border-dark" style={{ width: "25%" }}>Kết luận</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border-dark">1</td>
                            <td className="border-dark text-start">
                              <div className="fw-bold">{selectedInspection.product}</div>
                              {iqcFormData.result === "fail" && (
                                <div className="text-danger small mt-1 fst-italic">
                                  Lý do: [{iqcFormData.rejectCategories.join(", ")}] {iqcFormData.rejectReason}
                                </div>
                              )}
                            </td>
                            <td className="border-dark fw-bold">
                              <input 
                                type="checkbox" 
                                className="form-check-input border-dark" 
                                style={{ transform: "scale(1.2)" }}
                                checked={iqcFormData.result === "pass"} 
                                onChange={handlePassCheck} 
                              />
                            </td>
                            <td className="border-dark fw-bold">
                              <input 
                                type="checkbox" 
                                className="form-check-input border-dark" 
                                style={{ transform: "scale(1.2)" }}
                                checked={iqcFormData.result === "fail"} 
                                onChange={handleFailCheck} 
                              />
                            </td>
                            <td className="border-dark fw-bold">
                              {iqcFormData.result === "pass" ? "CHẤP NHẬN" : ""}
                              {iqcFormData.result === "fail" ? "TỪ CHỐI" : ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="row text-center mt-5 pt-4">
                        <div className="col-4">
                          <div className="fw-bold">ĐẠI DIỆN GIAO HÀNG</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="col-4">
                          <div className="fw-bold">THỦ KHO</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="col-4">
                          <div className="fw-bold">NGƯỜI LẬP</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                      </div>
                      <div style={{ height: "120px" }}></div>
                    </div>

                  </div>
                </div>
              </div>
              <div className="modal-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                 <button className="btn btn-light border px-4" onClick={() => { setShowIqcModal(false); setSelectedInspection(null); }}>Hủy</button>
                 <button className="btn btn-primary px-4"><i className="bi bi-printer me-2"></i>In biên bản</button>
                 <button className="btn btn-success px-4" onClick={() => { setShowIqcModal(false); setSelectedInspection(null); }}><i className="bi bi-floppy me-2"></i>Lưu kết quả</button>
              </div>
            </div>
          </div>
        </div>
      </>
      )}

      {showOqcModal && selectedInspection && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-fullscreen">
              <div className="modal-content bg-light">
                <div className="modal-header border-bottom bg-white px-4 py-3">
                  <h5 className="modal-title fw-bold">Biên bản đánh giá chất lượng (OQC)</h5>
                  <button type="button" className="btn-close" onClick={() => setShowOqcModal(false)}></button>
                </div>
                <div className="modal-body p-0 d-flex flex-column flex-xl-row" style={{ backgroundColor: "#e9ecef" }}>
                  
                  {/* Left Panel */}
                  <div className="bg-white border-end p-4 custom-scrollbar flex-shrink-0" style={{ width: "380px", overflowY: "auto" }}>
                    <h6 className="fw-bold mb-4">THÔNG TIN BIÊN BẢN</h6>
                    
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Tổ lắp ráp / Ca sản xuất</label>
                      <input type="text" className="form-control form-control-sm" name="assemblyTeam" value={oqcFormData.assemblyTeam} onChange={handleOqcChange} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Lệnh sản xuất</label>
                      <input type="text" className="form-control form-control-sm" name="productionOrder" value={oqcFormData.productionOrder} onChange={handleOqcChange} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã định mức (nếu có)</label>
                      <input type="text" className="form-control form-control-sm" name="bomCode" value={oqcFormData.bomCode} onChange={handleOqcChange} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã sản phẩm (Model/SKU)</label>
                      <input type="text" className="form-control form-control-sm" name="model" value={oqcFormData.model} onChange={handleOqcChange} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã số lô sản xuất (Lot No)</label>
                      <input type="text" className="form-control form-control-sm" name="batch" value={oqcFormData.batch} onChange={handleOqcChange} />
                    </div>
                    <div className="row g-2 mb-4">
                      <div className="col-6">
                        <label className="form-label small fw-medium">Tổng sản lượng</label>
                        <input type="number" className="form-control form-control-sm" name="totalQuantity" value={oqcFormData.totalQuantity} onChange={handleOqcChange} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-medium">Số lượng mẫu</label>
                        <input type="number" className="form-control form-control-sm" name="sampleQuantity" value={oqcFormData.sampleQuantity} onChange={handleOqcChange} />
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - A4 Preview */}
                  <div className="flex-grow-1 p-4 p-md-5 custom-scrollbar" style={{ overflowY: "auto" }}>
                    <div 
                      className="bg-white shadow border mx-auto position-relative" 
                      style={{ 
                        width: "21cm", 
                        minHeight: "29.7cm", 
                        padding: "1.5cm 2cm",
                        color: "black",
                        fontFamily: "'Roboto Condensed', sans-serif" 
                      }}
                    >
                    
                    {/* Header */}
                    <div className="row mb-4 align-items-center">
                      <div className="col-8 d-flex align-items-center">
                        {companyInfo?.logoUrl && (
                          <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px", marginRight: "12px", objectFit: "contain" }} />
                        )}
                        <div>
                          <div className="fw-bold text-uppercase" style={{ fontSize: "10pt" }}>
                            {companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM"}
                          </div>
                          <div style={{ fontSize: "9pt" }}>
                            Địa chỉ: {companyInfo?.address || "Đường số 3, KCN Yên Phong, Bắc Ninh"}
                          </div>
                          <div style={{ fontSize: "9pt" }}>
                            SĐT: {companyInfo?.phone || "0222.368.6868"}
                          </div>
                        </div>
                      </div>
                      <div className="col-4 text-end">
                        <div style={{ fontSize: "11pt" }}>
                          <div>Số phiếu: <span className="fw-bold">{selectedInspection.id}</span></div>
                          <div className="fst-italic">Ngày lập: {selectedInspection.date.split(' ')[0]}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 mt-2 text-center">
                      <h4 className="fw-bold text-uppercase mb-1" style={{ fontSize: "16pt" }}>BIÊN BẢN KIỂM TRA CHẤT LƯỢNG THÀNH PHẨM SẢN XUẤT</h4>
                      <div className="fw-bold" style={{ fontSize: "11pt" }}>Bộ phận thực hiện: KIỂM SOÁT CHẤT LƯỢNG ĐẦU RA (OQC)</div>
                    </div>

                    {/* Section I */}
                    <div className="mb-4" style={{ fontSize: "11pt", lineHeight: "1.8" }}>
                      <div className="fw-bold text-uppercase mb-2">I. THÔNG TIN CHUNG</div>
                      <div className="row g-2 mb-2">
                        <div className="col-12 d-flex align-items-end">
                          <span className="me-2 text-nowrap">Tổ lắp ráp / Ca sản xuất:</span>
                          <span className="fw-bold flex-grow-1 border-bottom border-dark ps-2 text-uppercase" style={{ borderStyle: 'dotted !important', minHeight: '1.2em' }}>{oqcFormData.assemblyTeam}</span>
                        </div>
                        <div className="col-6 d-flex align-items-end mt-2">
                          <span className="me-2 text-nowrap">Lệnh sản xuất:</span>
                          <span className="fw-bold flex-grow-1 border-bottom border-dark text-center" style={{ borderStyle: 'dotted !important', minHeight: '1.2em' }}>{oqcFormData.productionOrder}</span>
                        </div>
                        <div className="col-6 d-flex align-items-end mt-2">
                          <span className="me-2 text-nowrap">Mã định mức:</span>
                          <span className="fw-bold flex-grow-1 border-bottom border-dark text-center" style={{ borderStyle: 'dotted !important', minHeight: '1.2em' }}>{oqcFormData.bomCode}</span>
                        </div>
                        <div className="col-12 mt-4">
                          <div className="fw-bold text-uppercase mb-2">II. DANH SÁCH ĐỐI TƯỢNG KIỂM TRA</div>
                          <table className="table table-bordered border-dark mb-0 text-center align-middle" style={{ borderColor: 'black', fontSize: "10pt" }}>
                            <thead className="table-light">
                              <tr>
                                <th className="border-dark" style={{ width: "5%" }}>STT</th>
                                <th className="border-dark" style={{ width: "35%" }}>Tên linh kiện / Sản phẩm</th>
                                <th className="border-dark" style={{ width: "20%" }}>Mã sản phẩm<br/>(Model/SKU)</th>
                                <th className="border-dark" style={{ width: "20%" }}>Mã số lô hàng<br/>(Batch/Lot)</th>
                                <th className="border-dark" style={{ width: "10%" }}>SL giao<br/>(N)</th>
                                <th className="border-dark" style={{ width: "10%" }}>Mẫu rút<br/>(n)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border-dark">1</td>
                                <td className="border-dark text-start fw-bold">{selectedInspection.product}</td>
                                <td className="border-dark fw-bold">{oqcFormData.model}</td>
                                <td className="border-dark fw-bold">{oqcFormData.batch}</td>
                                <td className="border-dark fw-bold">{oqcFormData.totalQuantity}</td>
                                <td className="border-dark fw-bold">{oqcFormData.sampleQuantity}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Section III */}
                    <div className="mb-4 mt-4">
                      <div className="fw-bold text-uppercase mb-2" style={{ fontSize: "11pt" }}>III. BẢNG ĐÁNH GIÁ CHẤT LƯỢNG</div>
                      <div className="fst-italic mb-3" style={{ fontSize: "10pt" }}>
                        QC đối chiếu trực tiếp sản phẩm rút mẫu với các tiêu chuẩn kỹ thuật quy định dưới đây:
                      </div>
                      
                      <table className="table table-bordered border-dark align-middle mb-0" style={{ borderColor: 'black', fontSize: "9pt" }}>
                        <thead className="table-light text-center align-middle">
                          <tr>
                            <th style={{ width: "5%" }} className="border-dark">STT</th>
                            <th style={{ width: "20%" }} className="border-dark">Đặc tính kiểm tra</th>
                            <th style={{ width: "50%" }} className="border-dark">Tiêu chuẩn chất lượng Seajong quy định</th>
                            <th style={{ width: "25%" }} className="border-dark">Phương pháp & Thao tác kiểm tra tại chuyền</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="text-center border-dark">1</td>
                            <td className="fw-medium border-dark">Độ kín khít & Áp lực<br/>(Cho đồ dẫn nước)</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Thử áp lực khí/nước: Chịu áp tĩnh từ 4 bar - 6 bar trong vòng 10 giây.</li>
                                <li>Đánh giá: Thân vòi khô ráo hoàn toàn. Không rò rỉ nước, không thấm ẩm hoặc sủi bong bóng khí.</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Đấu nối sản phẩm vào gá kẹp nhanh của máy thử áp tĩnh cuối chuyền.</li>
                                <li>Quan sát bằng mắt thường dưới đèn soi.</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">2</td>
                            <td className="fw-medium border-dark">Cơ cấu đóng mở & Chuyển động</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Lực gạt van (Cần gạt): Đầm tay, đều lực, không sương rít, không tự trôi vị trí.</li>
                                <li>Bản lề cánh tủ/Nắp bồn cầu: Rơi êm từ từ (Soft-close), không rơi tự do tạo tiếng động mạnh.</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Thao tác trực tiếp bằng tay: Gạt cần nóng lạnh, nhấn nút bộ xả, thử đóng nắp bồn cầu 3-5 lần để cảm nhận.</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">3</td>
                            <td className="fw-medium border-dark">Độ nảy & Phản hồi hồi vị</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Các nút nhấn xả nước, nút chuyển ngả sen tắm phải có độ nảy đàn hồi tốt.</li>
                                <li>Phải tự động trả về vị trí ban đầu ngay sau khi buông tay hoặc ngắt áp lực nước.</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Nhấn thả thủ công liên tục bằng tay.</li>
                                <li>Quan sát hành trình nảy hồi vị của lò xo/piston.</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">4</td>
                            <td className="fw-medium border-dark">Mạch điện & Cảm ứng<br/>(Cho đồ điện tử)</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Bảng điều khiển cảm ứng (Bếp từ/Hút mùi) nhận tín hiệu nhạy bằng cả tay khô/ướt.</li>
                                <li>Đèn LED hiển thị đủ nét, không mờ nhòe.</li>
                                <li>Motor quạt chạy êm, không phát ra tiếng va quệt, vỏ không rung lắc mạnh.</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Cắm nguồn điện trực tiếp.</li>
                                <li>Thao tác chạm cảm ứng thử các phím chức năng, tăng giảm công suất quạt.</li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-center border-dark">5</td>
                            <td className="fw-medium border-dark">Vệ sinh & Đóng gói xuất xưởng</td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Sản phẩm phải được lau khô tuyệt đối nước thử trước khi đóng gói.</li>
                                <li>Bề mặt sạch keo dán, không dính vân tay.</li>
                                <li>Đầy đủ phụ kiện đi kèm theo hộp (ron, chân nối, ốc vít...) và sách HDSD, phiếu bảo hành.</li>
                              </ul>
                            </td>
                            <td className="border-dark">
                              <ul className="mb-0 ps-3">
                                <li>Kiểm tra ngoại quan sản phẩm trước khi bọc túi bóng khí.</li>
                                <li>Đối chiếu trực tiếp phụ kiện xếp trong hộp với nhãn kiểm gói.</li>
                              </ul>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section IV */}
                    <div style={{ fontSize: "11pt" }}>
                      <div className="fw-bold text-uppercase mb-3">IV. KẾT QUẢ KIỂM TRA CHẤT LƯỢNG</div>
                      
                      <table className="table table-bordered border-dark mb-4 text-center align-middle" style={{ borderColor: 'black', fontSize: "10pt" }}>
                        <thead className="table-light">
                          <tr>
                            <th className="border-dark" style={{ width: "5%" }}>STT</th>
                            <th className="border-dark" style={{ width: "40%" }}>Tên linh kiện / Sản phẩm</th>
                            <th className="border-dark" style={{ width: "15%" }}>Đạt</th>
                            <th className="border-dark" style={{ width: "15%" }}>Không đạt</th>
                            <th className="border-dark" style={{ width: "25%" }}>Kết luận</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border-dark">1</td>
                            <td className="border-dark text-start">
                              <div className="fw-bold">{selectedInspection.product}</div>
                              {oqcFormData.result === "fail" && (
                                <div className="text-danger small mt-1 fst-italic">
                                  Lý do: [{oqcFormData.rejectCategories.join(", ")}] {oqcFormData.rejectReason}
                                </div>
                              )}
                            </td>
                            <td className="border-dark fw-bold">
                              <input 
                                type="checkbox" 
                                className="form-check-input border-dark" 
                                style={{ transform: "scale(1.2)" }}
                                checked={oqcFormData.result === "pass"} 
                                onChange={handleOqcPassCheck} 
                              />
                            </td>
                            <td className="border-dark fw-bold">
                              <input 
                                type="checkbox" 
                                className="form-check-input border-dark" 
                                style={{ transform: "scale(1.2)" }}
                                checked={oqcFormData.result === "fail"} 
                                onChange={handleOqcFailCheck} 
                              />
                            </td>
                            <td className="border-dark fw-bold">
                              {oqcFormData.result === "pass" ? "CHẤP NHẬN" : ""}
                              {oqcFormData.result === "fail" ? "TỪ CHỐI" : ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="row text-center mt-5 pt-4">
                        <div className="col-4">
                          <div className="fw-bold">QUẢN ĐỐC PHÂN XƯỞNG</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="col-4">
                          <div className="fw-bold">NHÂN VIÊN OQC</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="col-4">
                          <div className="fw-bold">TRƯỞNG BỘ PHẬN QC</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                      </div>
                      <div style={{ height: "120px" }}></div>
                    </div>

                  </div>
                </div>
              </div>
              <div className="modal-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                 <button className="btn btn-light border px-4" onClick={() => { setShowOqcModal(false); setSelectedInspection(null); }}>Hủy</button>
                 <button className="btn btn-primary px-4"><i className="bi bi-printer me-2"></i>In biên bản</button>
                 <button className="btn btn-success px-4" onClick={handleSaveOqcResult}><i className="bi bi-floppy me-2"></i>Lưu kết quả</button>
              </div>
            </div>
          </div>
        </div>
      </>
      )}

    {/* Reject Reason Modal */}
    {showRejectModal && (
      <>
        <div className="offcanvas-backdrop fade show" style={{ zIndex: 1060 }} onClick={() => setShowRejectModal(false)}></div>
        <div className="offcanvas offcanvas-end show border-start shadow d-flex flex-column" tabIndex={-1} style={{ zIndex: 1065, width: "400px", visibility: "visible" }}>
          <div className="offcanvas-header border-bottom py-3">
            <h5 className="offcanvas-title fw-bold text-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>Lý do không đạt</h5>
            <button type="button" className="btn-close" onClick={() => setShowRejectModal(false)}></button>
          </div>
          
          <div className="offcanvas-body p-0 d-flex flex-column" style={{ overflowY: "auto" }}>
            
            {/* Thông tin mẫu kiểm tra */}
            <div className="bg-light p-4 border-bottom">
              <h6 className="fw-bold mb-3 small text-uppercase text-muted">Thông tin mẫu không đạt</h6>
              <div className="d-flex flex-column gap-2 small">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Mã phiếu:</span>
                  <span className="fw-medium">{selectedInspection?.id}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Sản phẩm:</span>
                  <span className="fw-medium text-end">{selectedInspection?.product}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Mã lô (Batch):</span>
                  <span className="fw-medium">{iqcFormData.batch || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Form nhập lý do */}
            <div className="p-4 flex-grow-1">
              <p className="text-muted mb-3" style={{ fontSize: "14px" }}>Vui lòng chọn loại lỗi và cung cấp chi tiết lý do mẫu kiểm tra này bị đánh giá không đạt để lưu vào hồ sơ:</p>
                
                <div className="mb-3 d-flex flex-wrap gap-3">
                  {["Lỗi linh kiện", "Lỗi kỹ thuật lắp ráp", "Lỗi bề mặt", "Loại khác"].map(cat => (
                    <div key={cat} className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id={`cat-${cat}`}
                        checked={tempRejectCategories.includes(cat)}
                        onChange={() => handleCategoryChange(cat)}
                      />
                      <label className="form-check-label small" htmlFor={`cat-${cat}`}>{cat}</label>
                    </div>
                  ))}
                </div>

                <textarea 
                  className="form-control bg-light border border-secondary-subtle" 
                  rows={3} 
                  style={{ resize: "none" }}
                  placeholder="Ví dụ: Bề mặt bị xước dài 3mm..."
                  value={tempRejectReason}
                  onChange={(e) => setTempRejectReason(e.target.value)}
                  autoFocus
                ></textarea>

                {/* Attachments Section */}
                <div className="mt-3">
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {tempRejectFiles.map((file, idx) => (
                      <div key={idx} className="badge bg-secondary d-flex align-items-center p-2 rounded-3">
                        <i className={`bi ${file.type.startsWith('video') ? 'bi-camera-video' : 'bi-image'} me-2`}></i>
                        <span className="text-truncate" style={{ maxWidth: "150px" }}>{file.name}</span>
                        <button 
                          type="button" 
                          className="btn-close btn-close-white ms-2" 
                          style={{ fontSize: "10px" }}
                          onClick={() => setTempRejectFiles(prev => prev.filter((_, i) => i !== idx))}
                        ></button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      id="reject-attachments" 
                      className="d-none" 
                      multiple 
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="reject-attachments" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                      <i className="bi bi-paperclip me-1"></i>Đính kèm hình ảnh/video
                    </label>
                  </div>
                </div>
              </div>
            </div>
          <div className="offcanvas-footer border-top bg-white p-3 d-flex justify-content-between align-items-center mt-auto">
            <div className="form-check m-0">
              <input className="form-check-input" type="checkbox" id="createDefectProfile" defaultChecked />
              <label className="form-check-label text-muted small" htmlFor="createDefectProfile" style={{ userSelect: "none" }}>
                Tạo hồ sơ lỗi
              </label>
            </div>
            <div>
              <button type="button" className="btn btn-light rounded-pill px-4 me-2" onClick={() => setShowRejectModal(false)}>Hủy</button>
              <button type="button" className="btn btn-danger rounded-pill px-4" onClick={submitRejectReason}>Xác nhận</button>
            </div>
          </div>
        </div>
      </>
    )}
    </StandardPage>
  );
}
