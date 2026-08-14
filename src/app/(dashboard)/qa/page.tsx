"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { Table, TableColumn } from "@/components/ui/Table";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function QaPage() {
  const [filterType, setFilterType] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [activeEvalItemIdx, setActiveEvalItemIdx] = useState<number | null>(null);
  const [tempEvalComment, setTempEvalComment] = useState("");
  const [tempDefectDesc, setTempDefectDesc] = useState("");
  const [tempEvalResult, setTempEvalResult] = useState("pass");
  const [tempRejectReason, setTempRejectReason] = useState("");
  const [tempRejectCategories, setTempRejectCategories] = useState<string[]>(["Loại khác"]);
  const [tempRejectFiles, setTempRejectFiles] = useState<File[]>([]);

  const [iqcFormData, setIqcFormData] = useState({
    supplier: "",
    items: [] as any[],
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
    passQuantity: "",
    failQuantity: "",
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

  useEffect(() => {
    if (showOqcModal && selectedInspection && selectedInspection.metadata) {
      setOqcFormData(prev => ({
        ...prev,
        assemblyTeam: selectedInspection.metadata.assemblyTeam || "",
        productionOrder: selectedInspection.metadata.productionOrder || "",
        bomCode: selectedInspection.metadata.bomCode || "",
        model: selectedInspection.model || selectedInspection.metadata.model || "",
        batch: selectedInspection.metadata.batch || "",
        totalQuantity: selectedInspection.metadata.totalQuantity?.toString() || "",
        sampleQuantity: selectedInspection.metadata.sampleQuantity?.toString() || "",
        passQuantity: selectedInspection.metadata.passedQuantity || selectedInspection.metadata.passQuantity || "",
        failQuantity: selectedInspection.metadata.failedQuantity || selectedInspection.metadata.failQuantity || "",
        result: selectedInspection.result === "Fail" ? "fail" : "pass",
        rejectReason: selectedInspection.notes || ""
      }));
    }
  }, [showOqcModal, selectedInspection]);

  useEffect(() => {
    if (showIqcModal && selectedInspection && selectedInspection.metadata) {
      let items = [];
      if (selectedInspection.metadata.items && Array.isArray(selectedInspection.metadata.items)) {
        items = selectedInspection.metadata.items.map((it: any) => ({
          ...it,
          model: it.model || it.productCode || it.code || it.sku || selectedInspection.model || "",
          batch: it.batch || selectedInspection.metadata.batch || "",
          sampleQuantity: it.sampleQuantity || "",
          passQuantity: it.passQuantity || "",
          failQuantity: it.failQuantity || "",
          comment: it.comment || "",
          result: it.result || "pass"
        }));
      } else {
        // Fallback cho bản ghi cũ
        items = [{
          productName: selectedInspection.product || "",
          model: selectedInspection.model || selectedInspection.metadata.model || "",
          batch: selectedInspection.metadata.batch || "",
          quantity: selectedInspection.metadata.quantity || "",
          sampleQuantity: "",
          passQuantity: "",
          failQuantity: "",
          comment: "",
          result: "pass"
        }];
      }

      setIqcFormData(prev => ({
        ...prev,
        supplier: selectedInspection.metadata.supplierName || "",
        items
      }));
    }
  }, [showIqcModal, selectedInspection]);

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
    if (selectedInspection.result !== "Pending") {
      toast.error("Yêu cầu này đã hoàn thành, không thể lưu lại!");
      return;
    }
    const oqcPass = parseInt(oqcFormData.passQuantity?.toString() || "0", 10);
    const oqcFail = parseInt(oqcFormData.failQuantity?.toString() || "0", 10);
    const oqcTotal = parseInt(oqcFormData.totalQuantity?.toString() || "0", 10);
    if (oqcPass + oqcFail !== oqcTotal) {
      toast.error("Tổng số lượng đạt và lỗi phải bằng tổng sản lượng!");
      return;
    }
    try {
      const res = await fetch(`/api/qa/inspections/${selectedInspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          result: oqcFormData.result === "pass" ? "Đạt" : "Không đạt",
          notes: oqcFormData.rejectReason || "",
          passedQuantity: parseInt(oqcFormData.passQuantity.toString()) || 0,
          failedQuantity: parseInt(oqcFormData.failQuantity.toString()) || 0
        })
      });
      if (res.ok) {
        toast.success("Đã lưu kết quả OQC!");
        setShowOqcModal(false);
        setSelectedInspection(null);
        // refresh list
        loadInspections();
      } else {
        toast.error("Lỗi khi lưu kết quả");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi hệ thống");
    }
  };
  const handleSaveIqcResult = async () => {
    if (!selectedInspection) return;
    if (selectedInspection.result !== "Pending") {
      toast.error("Yêu cầu này đã hoàn thành, không thể lưu lại!");
      return;
    }
    const hasMismatch = iqcFormData.items.some(item => {
      const qty = parseInt(item.quantity?.toString() || "0", 10);
      const pass = parseInt(item.passQuantity?.toString() || "0", 10);
      const fail = parseInt(item.failQuantity?.toString() || "0", 10);
      return pass + fail !== qty;
    });
    if (hasMismatch) {
      toast.error("Tổng số lượng đạt và lỗi của các mặt hàng phải bằng số lượng giao!");
      return;
    }
    try {
      // Calculate total passed
      let totalPassed = 0;
      let totalFailed = 0;
      iqcFormData.items.forEach(item => {
        totalPassed += parseInt(item.passQuantity?.toString() || "0", 10);
        totalFailed += parseInt(item.failQuantity?.toString() || "0", 10);
      });
      
      let overallResult = "Đạt";
      if (totalPassed === 0 && totalFailed > 0) overallResult = "Không đạt";
      else if (totalFailed > 0) overallResult = "Lỗi một phần";

      const res = await fetch(`/api/qa/inspections/${selectedInspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          result: overallResult,
          passedQuantity: totalPassed,
          items: iqcFormData.items
        })
      });
      if (res.ok) {
        toast.success("Đã lưu kết quả IQC!");
        setShowIqcModal(false);
        setSelectedInspection(null);
        // refresh list
        loadInspections();
      } else {
        toast.error("Lỗi khi lưu kết quả IQC");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi hệ thống");
    }
  };


  const [inspections, setInspections] = useState<any[]>([]);

  const loadInspections = () => {
    fetch('/api/qa/inspections')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map(d => {
            const meta = d.metadata ? (typeof d.metadata === 'string' ? JSON.parse(d.metadata) : d.metadata) : null;
            return {
              id: d.code,
              type: d.type,
              product: d.productName || d.inventoryItem?.tenHang || "Không xác định",
              model: d.inventoryItem?.code || "",
              inspector: d.requesterName || d.inspectorName || "Không xác định",
              department: d.requesterDept || "Khác",
              date: new Date(d.executionTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
              result: d.status === "Chưa thực hiện" ? "Pending" : (d.result === "Đạt" ? "Pass" : "Fail"),
              notes: d.notes,
              poNumber: meta?.poNumber || meta?.purchaseOrderCode || "",
              deliveryNote: meta?.deliveryNote || "",
              metadata: meta
            };
          });
          setInspections(formatted);
        }
      })
      .catch(err => console.error("Error fetching inspections:", err));
  };

  useEffect(() => {
    loadInspections();
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(filteredInspections.map(i => i.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(r => r !== id));
    }
  };

  const handleBulkDelete = () => {
    if (!selectedRows.length) return;
    setShowBulkDeleteConfirm(true);
  };

  const executeBulkDelete = async () => {
    try {
      let failedCount = 0;
      for (const id of selectedRows) {
        const res = await fetch(`/api/qa/inspections/${id}`, { method: 'DELETE' });
        if (!res.ok) failedCount++;
      }
      
      if (failedCount > 0) {
        toast.error(`Xóa thất bại ${failedCount} phiếu`);
      } else {
        toast.success(`Đã xoá ${selectedRows.length} phiếu`);
        setSelectedRows([]);
      }
      setShowBulkDeleteConfirm(false);
      // re-fetch
      loadInspections();
    } catch (e) {
      toast.error("Có lỗi xảy ra khi xoá");
      setShowBulkDeleteConfirm(false);
    }
  };

  const columns: TableColumn<typeof inspections[0]>[] = [
    {
      header: <input type="checkbox" className="form-check-input m-0" checked={selectedRows.length > 0 && selectedRows.length === filteredInspections.length} onChange={handleSelectAll} />,
      width: 40,
      align: "center",
      render: (row) => <input type="checkbox" className="form-check-input m-0" checked={selectedRows.includes(row.id)} onChange={(e) => handleSelectRow(row.id, e)} onClick={e => e.stopPropagation()} />
    },
    {
      header: "Mã phiếu",
      render: (row) => (
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center">
            <span className="fw-bold text-dark small">{row.id}</span>
            <span className="text-muted mx-1">|</span>
            <span className={`fw-medium ${getStatusColor(row.result)}`} style={{ fontSize: 11 }}>{getStatusText(row.result)}</span>
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
          <span className="text-muted" style={{ fontSize: 12 }}>Bộ phận: {row.department}</span>
        </div>
      )
    },
    {
      header: "Thời gian thực hiện",
      render: (row) => <span className="text-muted small">{row.date}</span>
    }
  ];

  return (
    <StandardPage
      title="Đảm bảo chất lượng"
      description="Quality Assurance · Kiểm tra, tiêu chuẩn & kiểm soát lỗi"
      color="emerald"
      icon="bi-patch-check"
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
      <FullWidthTableLayout
        className="bg-white rounded-4 shadow-sm border flex-grow-1"
        header={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
            <FilterSelect
              value={filterDepartment}
              onChange={setFilterDepartment}
              placeholder="Tất cả bộ phận"
              options={[
                { label: "Mua hàng", value: "MUA_HANG" },
                { label: "Sản xuất", value: "SAN_XUAT" },
                { label: "Kho vận", value: "KHO" }
              ]}
              width={160}
            />

            <FilterSelect
              value={filterType}
              onChange={setFilterType}
              placeholder="Tất cả phân loại"
              options={[
                { label: "IQC (Kiểm tra Đầu vào)", value: "IQC" },
                { label: "OQC (Kiểm tra Đầu ra)", value: "OQC" }
              ]}
              width={180}
            />

            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Tất cả trạng thái"
              options={[
                { label: "Chưa thực hiện", value: "PENDING" },
                { label: "Đã hoàn thành", value: "COMPLETED" }
              ]}
              width={150}
            />

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            <div style={{ position: "relative", width: 320 }}>
              <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
              <input 
                type="text" 
                placeholder="Tìm kiếm mã phiếu, người kiểm tra..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", height: 32, padding: "0 32px 0 32px", fontSize: 13,
                  borderRadius: 8, border: "1px solid var(--border)", 
                  background: "var(--background)", color: "var(--foreground)", outline: "none"
                }}
              />
              {searchQuery && (
                <i 
                  className="bi bi-x-circle-fill" 
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>
            
            {selectedRows.length > 0 && (
              <button 
                className="btn btn-outline-danger d-flex align-items-center gap-2 shadow-sm ms-auto"
                style={{ height: 32, fontSize: 12.5, borderRadius: 8, padding: "0 16px", fontWeight: 600 }}
                onClick={handleBulkDelete}
              >
                <i className="bi bi-trash3" />
                Xoá ({selectedRows.length})
              </button>
            )}
          </div>
        }
        table={
          <Table 
            columns={columns}
            rows={filteredInspections}
            wrapperClassName="qa-inspections-table"
            compact={true}
            onRowClick={(row) => setSelectedInspection(row)}
          />
        }
      />

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
            <div className="offcanvas-body p-4 custom-scrollbar d-flex flex-column">
              <div className="mb-4">
                <div className="text-muted small mb-1">Mã phiếu</div>
                <div className="fw-bold text-primary mb-3" style={{ fontSize: "1.25rem", wordBreak: "break-word" }}>
                  {selectedInspection.id}
                </div>
                
                <div className="d-flex gap-4">
                  <div>
                    <div className="text-muted small mb-1">Trạng thái</div>
                    <div className={`fw-medium ${getStatusColor(selectedInspection.result)}`} style={{ fontSize: "15px" }}>
                      <i className={`bi ${selectedInspection.result === 'Pending' ? 'bi-hourglass-split' : selectedInspection.result === 'Pass' ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                      {getStatusText(selectedInspection.result)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted small mb-1">Loại kiểm tra</div>
                    <span className={`badge ${getTypeColor(selectedInspection.type) === 'primary' ? 'bg-primary text-white' : `bg-${getTypeColor(selectedInspection.type)} bg-opacity-10 text-${getTypeColor(selectedInspection.type)}`} border border-${getTypeColor(selectedInspection.type)} ${getTypeColor(selectedInspection.type) !== 'primary' ? 'border-opacity-25' : ''} px-2 py-1 rounded-pill`}>
                      {getTypeLabel(selectedInspection.type)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="list-group list-group-flush mb-4 border rounded shadow-sm">
                <div className="list-group-item px-3 py-2">
                  <div className="text-muted small mb-1 d-flex align-items-center">
                    <i className="bi bi-person me-2"></i>Người yêu cầu
                  </div>
                  <div className="fw-medium text-dark ms-4" style={{ fontSize: "14px" }}>{selectedInspection.inspector}</div>
                  <div className="text-muted ms-4" style={{ fontSize: "13px" }}>{selectedInspection.department}</div>
                </div>
                <div className="list-group-item px-3 py-2">
                  <div className="text-muted small mb-1 d-flex align-items-center">
                    <i className="bi bi-box-seam me-2"></i>Sản phẩm / Vật tư
                  </div>
                  <div className="fw-medium text-dark ms-4" style={{ fontSize: "14px" }}>{selectedInspection.product}</div>
                  {selectedInspection.model && <div className="text-muted ms-4" style={{ fontSize: "13px" }}>Mã SP: {selectedInspection.model}</div>}
                </div>
                <div className="list-group-item px-3 py-2">
                  <div className="text-muted small mb-1 d-flex align-items-center">
                    <i className="bi bi-calendar-event me-2"></i>Thời gian thực hiện
                  </div>
                  <div className="fw-medium text-dark ms-4" style={{ fontSize: "14px" }}>{selectedInspection.date}</div>
                </div>
                
                {selectedInspection.type === "IQC" && (
                  <>
                    <div className="list-group-item px-3 py-2">
                      <div className="text-muted small mb-1 d-flex align-items-center">
                        <i className="bi bi-truck me-2"></i>Nhà cung cấp
                      </div>
                      <div className="fw-medium text-dark ms-4" style={{ fontSize: "14px" }}>{selectedInspection.metadata?.supplierName || "---"}</div>
                    </div>
                    <div className="list-group-item px-3 py-2 d-flex justify-content-between">
                      <div>
                        <div className="text-muted small mb-1">Số PO</div>
                        <div className="fw-medium text-dark" style={{ fontSize: "14px" }}>{selectedInspection.poNumber || "---"}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted small mb-1">Số giao hàng</div>
                        <div className="fw-medium text-dark" style={{ fontSize: "14px" }}>{selectedInspection.deliveryNote || "---"}</div>
                      </div>
                    </div>
                  </>
                )}

                {selectedInspection.type === "OQC" && (
                  <>
                    <div className="list-group-item px-3 py-2 d-flex justify-content-between">
                      <div>
                        <div className="text-muted small mb-1">Lệnh sản xuất</div>
                        <div className="fw-medium text-dark" style={{ fontSize: "14px" }}>{selectedInspection.metadata?.productionOrder || "---"}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted small mb-1">Mã định mức</div>
                        <div className="fw-medium text-dark" style={{ fontSize: "14px" }}>{selectedInspection.metadata?.bomCode || "---"}</div>
                      </div>
                    </div>
                    <div className="list-group-item px-3 py-2">
                      <div className="text-muted small mb-1 d-flex align-items-center">
                        <i className="bi bi-people me-2"></i>Ca / Tổ lắp ráp
                      </div>
                      <div className="fw-medium text-dark ms-4" style={{ fontSize: "14px" }}>{selectedInspection.metadata?.assemblyTeam || "---"}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="mb-0 d-flex flex-column flex-grow-1">
                <div className="text-muted small mb-2 fw-medium d-flex align-items-center">
                  <i className="bi bi-journal-text me-2"></i>Ghi chú yêu cầu
                </div>
                <div className="bg-light p-3 rounded text-dark small border flex-grow-1 custom-scrollbar" style={{ minHeight: "80px", overflowY: "auto" }}>
                  {selectedInspection.notes || "Không có ghi chú thêm."}
                </div>
              </div>
            </div>
            <div className="offcanvas-footer border-top p-3 bg-light d-flex gap-2 justify-content-between">
              <button 
                className="btn btn-outline-danger px-3 d-flex align-items-center justify-content-center" 
                onClick={() => setShowDeleteConfirm(true)}
                title="Xóa"
              >
                <i className="bi bi-trash"></i>
              </button>
              {selectedInspection.result !== "Pending" && (
                <button 
                  className="btn btn-info px-3 text-white d-flex align-items-center justify-content-center" 
                  onClick={() => {
                    if (selectedInspection.type === "IQC") setShowIqcModal(true);
                    else if (selectedInspection.type === "OQC") setShowOqcModal(true);
                  }}
                  title="Biên bản"
                >
                  <i className="bi bi-file-earmark-text"></i>
                </button>
              )}
              <button 
                className="btn btn-primary px-4 flex-grow-1 d-flex align-items-center justify-content-center"
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
                <div className="modal-header border-bottom bg-white px-3 py-2">
                  <h6 className="modal-title fw-bold mb-0">Biên bản đánh giá chất lượng (IQC)</h6>
                  <button type="button" className="btn-close btn-sm" onClick={() => setShowIqcModal(false)}></button>
                </div>
                <div className="modal-body p-0 d-flex flex-column flex-xl-row" style={{ backgroundColor: "#e9ecef" }}>
                  
                  {/* Left Panel */}
                  <div className="bg-white border-end flex-shrink-0 d-flex flex-column" style={{ width: "380px" }}>
                    <div className="p-3 custom-scrollbar flex-grow-1" style={{ overflowY: "auto" }}>
                      <h6 className="fw-bold mb-3">THÔNG TIN BIÊN BẢN</h6>
                    
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Nhà cung cấp</label>
                      <input type="text" className="form-control form-control-sm" name="supplier" value={iqcFormData.supplier} onChange={handleIqcChange} disabled={selectedInspection?.result !== "Pending"} />
                    </div>
                    
                    <hr className="my-4 text-muted" />
                    <h6 className="fw-bold mb-3">CHI TIẾT VẬT TƯ</h6>
                    
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered table-hover align-middle" style={{ fontSize: "12px" }}>
                        <thead className="table-light text-center">
                          <tr>
                            <th>Tên vật tư / Mã SP / Lô</th>
                            <th style={{ width: "70px" }}>Giao / Mẫu</th>
                            <th style={{ width: "70px" }}>Đạt / Lỗi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iqcFormData.items.map((item, idx) => (
                            <tr key={idx}>
                              <td 
                                onClick={() => {
                                  setActiveEvalItemIdx(idx);
                                  setTempEvalComment(item.comment || "");
                                  setTempDefectDesc(item.defectDesc || "");
                                  setTempEvalResult(item.result || "pass");
                                }}
                                style={{ cursor: "pointer" }}
                                title="Nhấp để nhận xét/đánh giá QC"
                              >
                                <div className="fw-bold text-primary mb-1" style={{ fontSize: "11px", lineHeight: "1.2" }}>
                                  {idx + 1}. {item.productName}
                                </div>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm mb-1" 
                                  placeholder="Mã SP (Model/SKU)" 
                                  value={item.model || ""} 
                                  onChange={(e) => {
                                    const newItems = [...iqcFormData.items];
                                    newItems[idx].model = e.target.value;
                                    setIqcFormData(prev => ({ ...prev, items: newItems }));
                                  }} 
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontSize: "11px", padding: "2px 4px", height: "24px" }} 
                                  disabled={selectedInspection?.result !== "Pending"}
                                />
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  placeholder="Mã số lô (Batch)" 
                                  value={item.batch || ""} 
                                  onChange={(e) => {
                                    const newItems = [...iqcFormData.items];
                                    newItems[idx].batch = e.target.value;
                                    setIqcFormData(prev => ({ ...prev, items: newItems }));
                                  }} 
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontSize: "11px", padding: "2px 4px", height: "24px" }} 
                                  disabled={selectedInspection?.result !== "Pending"}
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm mb-1 text-center" 
                                  placeholder="Giao(N)" 
                                  value={item.quantity || ""} 
                                  onChange={(e) => {
                                    const newItems = [...iqcFormData.items];
                                    newItems[idx].quantity = e.target.value;
                                    setIqcFormData(prev => ({ ...prev, items: newItems }));
                                  }} 
                                  title="SL giao (N)"
                                  style={{ fontSize: "11px", padding: "2px 4px", height: "24px" }} 
                                  disabled={selectedInspection?.result !== "Pending"}
                                />
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm text-center" 
                                  placeholder="Mẫu(n)" 
                                  value={item.sampleQuantity || ""} 
                                  onChange={(e) => {
                                    const newItems = [...iqcFormData.items];
                                    newItems[idx].sampleQuantity = e.target.value;
                                    setIqcFormData(prev => ({ ...prev, items: newItems }));
                                  }} 
                                  title="Mẫu rút (n)"
                                  style={{ fontSize: "11px", padding: "2px 4px", height: "24px" }} 
                                  disabled={selectedInspection?.result !== "Pending"}
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm mb-1 text-center text-success fw-bold" 
                                  placeholder="Đạt" 
                                  value={item.passQuantity || ""} 
                                  onChange={(e) => {
                                    const newItems = [...iqcFormData.items];
                                    newItems[idx].passQuantity = e.target.value;
                                    setIqcFormData(prev => ({ ...prev, items: newItems }));
                                  }} 
                                  title="SL Đạt"
                                  style={{ fontSize: "11px", padding: "2px 4px", height: "24px" }} 
                                  disabled={selectedInspection?.result !== "Pending"}
                                />
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm text-center text-danger fw-bold" 
                                  placeholder="Lỗi" 
                                  value={item.failQuantity || ""} 
                                  onChange={(e) => {
                                    const newItems = [...iqcFormData.items];
                                    newItems[idx].failQuantity = e.target.value;
                                    setIqcFormData(prev => ({ ...prev, items: newItems }));
                                  }} 
                                  title="SL Không đạt"
                                  style={{ fontSize: "11px", padding: "2px 4px", height: "24px" }} 
                                  disabled={selectedInspection?.result !== "Pending"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* QC evaluation is now done directly on each item above */}
                    </div>
                    <div className="p-2 border-top bg-light d-flex justify-content-between gap-2">
                       <button className="btn btn-light btn-sm border flex-grow-1" onClick={() => { setShowIqcModal(false); setSelectedInspection(null); }}>Hủy</button>
                       <button className="btn btn-primary btn-sm flex-grow-1" onClick={() => printDocumentById("iqc-preview-doc", "portrait", "IQC-" + selectedInspection.id)}><i className="bi bi-printer me-1"></i>In</button>
                        <button 
                          className="btn btn-success btn-sm flex-grow-1" 
                          onClick={handleSaveIqcResult} 
                          disabled={
                            selectedInspection?.result !== "Pending" ||
                            iqcFormData.items.some(item => {
                              const qty = parseInt(item.quantity?.toString() || "0", 10);
                              const pass = parseInt(item.passQuantity?.toString() || "0", 10);
                              const fail = parseInt(item.failQuantity?.toString() || "0", 10);
                              return pass + fail !== qty;
                            })
                          }
                        >
                          <i className="bi bi-floppy me-1"></i>Lưu
                        </button>
                    </div>
                  </div>

                  {/* Right Panel - A4 Preview */}
                  <div className="flex-grow-1 p-4 p-md-5 custom-scrollbar" style={{ overflowY: "auto" }}>
                    <div 
                      id="iqc-preview-doc"
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
                          <div className="fst-italic">Ngày lập: {selectedInspection.date}</div>
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
                              {iqcFormData.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="border-dark">{idx + 1}</td>
                                  <td className="border-dark text-start fw-bold">{item.productName}</td>
                                  <td className="border-dark fw-bold">{item.model}</td>
                                  <td className="border-dark fw-bold">{item.batch}</td>
                                  <td className="border-dark fw-bold">{item.quantity}</td>
                                  <td className="border-dark fw-bold">{item.sampleQuantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Section III */}
                    <div className="mb-4 mt-4">
                      <div className="fw-bold text-uppercase mb-2" style={{ fontSize: "11pt" }}>III. BẢNG ĐÁNH GIÁ CHẤT LƯỢNG</div>
                      
                      <table className="table table-bordered border-dark align-middle mb-0" style={{ borderColor: 'black', fontSize: "9.5pt" }}>
                        <thead className="table-light text-center align-middle">
                          <tr>
                            <th style={{ width: "8%" }} className="border-dark">STT</th>
                            <th className="border-dark">Tên vật tư / Linh kiện / Sản phẩm</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iqcFormData.items.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="text-center border-dark">{idx + 1}</td>
                              <td className="border-dark text-start">
                                <div className="fw-bold">{item.productName}</div>
                                <div className="text-muted small mb-1">Mã SP: {item.model} {item.batch ? `| Lô: ${item.batch}` : ""}</div>
                                {item.comment && (
                                  <div className="mt-1 p-2 bg-light border-start border-3 border-secondary rounded" style={{ fontSize: "9pt" }}>
                                    <div className="fw-bold text-muted mb-1" style={{ fontSize: "8.5pt" }}>QC nhận xét:</div>
                                    <ul className="list-unstyled mb-0 ps-1" style={{ lineHeight: "1.4" }}>
                                      {item.comment.split('\n').filter((line: string) => line.trim() !== "").map((line: string, lineIdx: number) => (
                                        <li key={lineIdx} className="fst-italic">
                                          • {line.trim()}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {item.defectDesc && (
                                  <div className="mt-1 p-2 bg-light border-start border-3 border-danger rounded" style={{ fontSize: "9pt" }}>
                                    <div className="fw-bold mb-1" style={{ fontSize: "8.5pt", color: "darkred" }}>Mô tả các lỗi:</div>
                                    <ul className="list-unstyled mb-0 ps-1" style={{ lineHeight: "1.4", color: "darkred" }}>
                                      {item.defectDesc.split('\n').filter((line: string) => line.trim() !== "").map((line: string, lineIdx: number) => (
                                        <li key={lineIdx} className="fst-italic">
                                          • {line.trim()}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
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
                            <th className="border-dark" style={{ width: "15%" }}>SL Đạt</th>
                            <th className="border-dark" style={{ width: "15%" }}>SL Không đạt</th>
                            <th className="border-dark" style={{ width: "25%" }}>Kết luận</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iqcFormData.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="border-dark">{idx + 1}</td>
                              <td className="border-dark text-start">
                                <div className="fw-bold">{item.productName}</div>
                                {iqcFormData.result === "fail" && (
                                  <div className="text-danger small mt-1 fst-italic">
                                    Lý do: [{iqcFormData.rejectCategories.join(", ")}] {iqcFormData.rejectReason}
                                  </div>
                                )}
                              </td>
                              <td className="border-dark fw-bold text-success fs-6">
                                {item.passQuantity}
                              </td>
                              <td className="border-dark fw-bold text-danger fs-6">
                                {item.failQuantity}
                              </td>
                              <td className="border-dark fw-bold">
                                {iqcFormData.result === "pass" ? "CHẤP NHẬN" : ""}
                                {iqcFormData.result === "fail" ? "TỪ CHỐI" : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="row text-center mt-5 pt-4">
                        <div className="col-6">
                          <div className="fw-bold text-uppercase">Bộ phận Mua hàng</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="col-6">
                          <div className="fw-bold text-uppercase">Bộ phận Quản lý Chất lượng</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                      </div>
                      <div style={{ height: "120px" }}></div>
                    </div>

                  </div>
                </div>
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
                <div className="modal-header border-bottom bg-white px-3 py-2">
                  <h6 className="modal-title fw-bold mb-0">Biên bản đánh giá chất lượng (OQC)</h6>
                  <button type="button" className="btn-close btn-sm" onClick={() => setShowOqcModal(false)}></button>
                </div>
                <div className="modal-body p-0 d-flex flex-column flex-xl-row" style={{ backgroundColor: "#e9ecef" }}>
                  
                  {/* Left Panel */}
                  <div className="bg-white border-end flex-shrink-0 d-flex flex-column" style={{ width: "380px" }}>
                    <div className="p-3 custom-scrollbar flex-grow-1" style={{ overflowY: "auto" }}>
                      <h6 className="fw-bold mb-3">THÔNG TIN BIÊN BẢN</h6>
                    
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Tổ lắp ráp / Ca sản xuất</label>
                      <input type="text" className="form-control form-control-sm" name="assemblyTeam" value={oqcFormData.assemblyTeam} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Lệnh sản xuất</label>
                      <input type="text" className="form-control form-control-sm" name="productionOrder" value={oqcFormData.productionOrder} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã định mức (nếu có)</label>
                      <input type="text" className="form-control form-control-sm" name="bomCode" value={oqcFormData.bomCode} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã sản phẩm (Model/SKU)</label>
                      <input type="text" className="form-control form-control-sm" name="model" value={oqcFormData.model} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Mã số lô sản xuất (Lot No)</label>
                      <input type="text" className="form-control form-control-sm" name="batch" value={oqcFormData.batch} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-medium">Tổng sản lượng</label>
                        <input type="number" className="form-control form-control-sm" name="totalQuantity" value={oqcFormData.totalQuantity} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-medium">Số lượng mẫu</label>
                        <input type="number" className="form-control form-control-sm" name="sampleQuantity" value={oqcFormData.sampleQuantity} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-medium">SL Đạt</label>
                        <input type="number" className="form-control form-control-sm text-success fw-bold" name="passQuantity" value={oqcFormData.passQuantity} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-medium">SL Không đạt</label>
                        <input type="number" className="form-control form-control-sm text-danger fw-bold" name="failQuantity" value={oqcFormData.failQuantity} onChange={handleOqcChange} disabled={selectedInspection?.result !== "Pending"} />
                      </div>
                    </div>
                    
                    <hr className="my-3 text-muted" />
                    <h6 className="fw-bold mb-3">NHẬN XÉT & ĐÁNH GIÁ QC</h6>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Nhận xét, đánh giá của QC</label>
                      <textarea
                        className="form-control form-control-sm" 
                        placeholder="Nhập nhận xét..." 
                        name="rejectReason" 
                        value={oqcFormData.rejectReason} 
                        onChange={handleOqcChange} 
                        disabled={selectedInspection?.result !== "Pending"}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-medium">Kết quả</label>
                      <select 
                        className={`form-select form-select-sm fw-medium ${oqcFormData.result === "fail" ? "text-danger" : "text-success"}`}
                        name="result" 
                        value={oqcFormData.result} 
                        onChange={handleOqcChange} 
                        disabled={selectedInspection?.result !== "Pending"}
                      >
                        <option value="pass" className="text-success">Đạt (Chấp nhận)</option>
                        <option value="fail" className="text-danger">Lỗi (Từ chối)</option>
                      </select>
                    </div>
                    </div>
                    <div className="p-2 border-top bg-light d-flex justify-content-between gap-2">
                       <button className="btn btn-light btn-sm border flex-grow-1" onClick={() => { setShowOqcModal(false); setSelectedInspection(null); }}>Hủy</button>
                       <button className="btn btn-primary btn-sm flex-grow-1" onClick={() => printDocumentById("oqc-preview-doc", "portrait", "OQC-" + selectedInspection.id)}><i className="bi bi-printer me-1"></i>In</button>
                        <button 
                          className="btn btn-success btn-sm flex-grow-1" 
                          onClick={handleSaveOqcResult} 
                          disabled={
                            selectedInspection?.result !== "Pending" ||
                            (parseInt(oqcFormData.passQuantity?.toString() || "0", 10) + parseInt(oqcFormData.failQuantity?.toString() || "0", 10) !== parseInt(oqcFormData.totalQuantity?.toString() || "0", 10))
                          }
                        >
                          <i className="bi bi-floppy me-1"></i>Lưu
                        </button>
                    </div>
                  </div>

                  {/* Right Panel - A4 Preview */}
                  <div className="flex-grow-1 p-4 p-md-5 custom-scrollbar" style={{ overflowY: "auto" }}>
                    <div 
                      id="oqc-preview-doc"
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
                          <div className="fst-italic">Ngày lập: {selectedInspection.date}</div>
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
                      
                      <table className="table table-bordered border-dark align-middle mb-0" style={{ borderColor: 'black', fontSize: "9.5pt" }}>
                        <thead className="table-light text-center align-middle">
                          <tr>
                            <th style={{ width: "8%" }} className="border-dark">STT</th>
                            <th className="border-dark">Tên sản phẩm / Thành phẩm</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="text-center border-dark">1</td>
                            <td className="border-dark text-start">
                              <div className="fw-bold">{selectedInspection.product}</div>
                              <div className="text-muted small mb-1">Mã SP: {oqcFormData.model} {oqcFormData.batch ? `| Lô: ${oqcFormData.batch}` : ""}</div>
                              {oqcFormData.rejectReason && (
                                <div className="mt-1 p-2 bg-light border-start border-3 border-secondary rounded" style={{ fontSize: "9pt" }}>
                                  <div className="fw-bold text-muted mb-1" style={{ fontSize: "8.5pt" }}>QC nhận xét:</div>
                                  <ul className="list-unstyled mb-0 ps-1" style={{ lineHeight: "1.4" }}>
                                    {oqcFormData.rejectReason.split('\n').filter((line: string) => line.trim() !== "").map((line: string, lineIdx: number) => (
                                      <li key={lineIdx} className="fst-italic">
                                        • {line.trim()}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
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
                            <th className="border-dark" style={{ width: "15%" }}>SL Đạt</th>
                            <th className="border-dark" style={{ width: "15%" }}>SL Không đạt</th>
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
                            <td className="border-dark fw-bold text-success fs-6">
                              {oqcFormData.passQuantity}
                            </td>
                            <td className="border-dark fw-bold text-danger fs-6">
                              {oqcFormData.failQuantity}
                            </td>
                            <td className="border-dark fw-bold">
                              {oqcFormData.result === "pass" ? "CHẤP NHẬN" : ""}
                              {oqcFormData.result === "fail" ? "TỪ CHỐI" : ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="row text-center mt-5 pt-4">
                        <div className="col-6">
                          <div className="fw-bold text-uppercase">Bộ phận Sản xuất</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                        <div className="col-6">
                          <div className="fw-bold text-uppercase">Bộ phận Quản lý Chất lượng</div>
                          <div className="fst-italic" style={{ fontSize: "10pt" }}>(Ký và ghi rõ họ tên)</div>
                        </div>
                      </div>
                      <div style={{ height: "120px" }}></div>
                    </div>

                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </>
      )}

    {/* Item Evaluation Offcanvas */}
    {activeEvalItemIdx !== null && (
      <>
        <div className="offcanvas-backdrop fade show" style={{ zIndex: 1060 }} onClick={() => setActiveEvalItemIdx(null)}></div>
        <div className="offcanvas offcanvas-end show border-start shadow d-flex flex-column" tabIndex={-1} style={{ zIndex: 1065, width: "400px", visibility: "visible" }}>
          <div className="offcanvas-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between">
            <h6 className="offcanvas-title fw-bold text-dark mb-0">Đánh giá chất lượng vật tư</h6>
            <button type="button" className="btn-close" onClick={() => setActiveEvalItemIdx(null)}></button>
          </div>
          
          <div className="offcanvas-body p-4 custom-scrollbar d-flex flex-column gap-3 flex-grow-1 min-h-0" style={{ overflowY: "auto" }}>
            <div>
              <label className="form-label small text-muted mb-1">Tên vật tư / Linh kiện</label>
              <div className="fw-bold text-primary" style={{ fontSize: "14px" }}>
                {iqcFormData.items[activeEvalItemIdx]?.productName}
              </div>
            </div>

            <div>
              <label className="form-label small text-muted mb-1">Mã sản phẩm (Model/SKU)</label>
              <div className="fw-semibold text-dark">
                {iqcFormData.items[activeEvalItemIdx]?.model || "--"}
              </div>
            </div>

            {iqcFormData.items[activeEvalItemIdx]?.batch && (
              <div>
                <label className="form-label small text-muted mb-1">Số lô (Batch)</label>
                <div className="fw-semibold text-dark">
                  {iqcFormData.items[activeEvalItemIdx]?.batch}
                </div>
              </div>
            )}

            <hr className="my-2 text-muted" />

            <div className="d-flex flex-column flex-grow-1 min-h-0">
              <label className="form-label small fw-medium mb-1">Nhận xét, đánh giá của QC</label>
              <textarea 
                className="form-control form-control-sm flex-grow-1" 
                placeholder="Nhập nhận xét chi tiết về chất lượng sản phẩm..." 
                value={tempEvalComment} 
                onChange={(e) => setTempEvalComment(e.target.value)}
                disabled={selectedInspection?.result !== "Pending"}
                style={{ fontSize: "13px", resize: "none" }}
              />
            </div>

            <div className="d-flex flex-column mt-3 flex-grow-1 min-h-0">
              <label className="form-label small fw-medium mb-1">Mô tả các lỗi</label>
              <textarea 
                className="form-control form-control-sm flex-grow-1" 
                placeholder="Mô tả chi tiết các lỗi phát hiện (nếu có)..." 
                value={tempDefectDesc} 
                onChange={(e) => setTempDefectDesc(e.target.value)}
                disabled={selectedInspection?.result !== "Pending"}
                style={{ fontSize: "13px", resize: "none" }}
              />
            </div>
          </div>

          <div className="offcanvas-footer border-top bg-light p-3 d-flex gap-2">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm flex-grow-1" 
              onClick={() => setActiveEvalItemIdx(null)}
            >
              Đóng
            </button>
            <button 
              type="button" 
              className="btn btn-primary btn-sm flex-grow-1" 
              onClick={() => {
                const newItems = [...iqcFormData.items];
                const isFailed = parseInt(newItems[activeEvalItemIdx]?.failQuantity?.toString() || "0", 10) > 0;
                newItems[activeEvalItemIdx] = {
                  ...newItems[activeEvalItemIdx],
                  comment: tempEvalComment,
                  defectDesc: tempDefectDesc,
                  result: isFailed ? "fail" : "pass"
                };
                setIqcFormData(prev => ({ ...prev, items: newItems }));
                setActiveEvalItemIdx(null);
              }}
              disabled={selectedInspection?.result !== "Pending"}
            >
              Cập nhật
            </button>
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
                  <span className="fw-medium">
                    {showIqcModal 
                      ? (iqcFormData.items.map((i: any) => i.batch).filter(Boolean).join(", ") || "N/A") 
                      : (oqcFormData.batch || "N/A")}
                  </span>
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
    
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xác nhận xóa phiếu"
        message={
          <div className="text-dark">
            Bạn có chắc chắn muốn xóa phiếu kiểm tra <strong>{selectedInspection?.id}</strong> này không?<br/>
            Hành động này không thể hoàn tác.
          </div>
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={async () => {
          try {
            const res = await fetch(`/api/qa/inspections/${selectedInspection?.id}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              toast.success("Đã xóa phiếu kiểm tra");
              setInspections(prev => prev.filter(i => i.id !== selectedInspection?.id));
              setSelectedInspection(null);
              setShowDeleteConfirm(false);
            } else {
              toast.error("Lỗi khi xóa phiếu kiểm tra");
            }
          } catch (e) {
            toast.error("Lỗi kết nối khi xóa");
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title="Xác nhận xóa phiếu"
        message={`Bạn có chắc chắn muốn xoá ${selectedRows.length} phiếu đã chọn?`}
        confirmLabel="OK"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={executeBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </StandardPage>
  );
}
