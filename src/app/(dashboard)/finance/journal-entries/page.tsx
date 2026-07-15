"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { Table } from "@/components/ui/Table";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN");
};

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceModule, setSourceModule] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // Default: YYYY-MM hiện tại
  
  // Offcanvas state
  const [showAddOffcanvas, setShowAddOffcanvas] = useState(false);
  
  // Form state
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().substring(0,10));
  const [referenceCode, setReferenceCode] = useState("");
  const [lines, setLines] = useState<any[]>([
    { accountId: "", type: "DEBIT", amount: 0, description: "" },
    { accountId: "", type: "CREDIT", amount: 0, description: "" }
  ]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      if (sourceModule) qs.append("sourceModule", sourceModule);
      if (month) qs.append("month", month);
      
      const res = await fetch(`/api/finance/journal-entries?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/finance/accounts");
      if (res.ok) {
        const data = await res.json();
        // The API returns { success: true, flatData: [] }
        if (data.success && data.flatData) {
          setAccounts(data.flatData.filter((a: any) => !a.isParent));
        } else if (Array.isArray(data)) {
          setAccounts(data.filter((a: any) => !a.isParent));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [search, sourceModule, month]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addLine = () => {
    setLines([...lines, { accountId: "", type: "DEBIT", amount: 0, description: "" }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-sync amount if there are exactly 2 lines (to save typing)
    if (field === 'amount' && newLines.length === 2) {
      const otherIndex = index === 0 ? 1 : 0;
      // Only auto-sync if they are of opposite types (Nợ - Có)
      if (newLines[0].type !== newLines[1].type) {
        newLines[otherIndex] = { ...newLines[otherIndex], amount: value };
      }
    }
    
    setLines(newLines);
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/finance/journal-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entryDate, description, referenceCode, lines
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Lỗi khi lưu bút toán");
        return;
      }
      
      setShowAddOffcanvas(false);
      // reset
      setDescription("");
      setReferenceCode("");
      setLines([
        { accountId: "", type: "DEBIT", amount: 0, description: "" },
        { accountId: "", type: "CREDIT", amount: 0, description: "" }
      ]);
      fetchEntries();
    } catch (error: any) {
      alert("Lỗi kết nối");
      console.error(error);
    }
  };

  const totalDebit = lines.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalCredit = lines.filter(l => l.type === 'CREDIT').reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const getSourceBadge = (source: string) => {
    switch(source) {
      case 'INVENTORY': return <span className="badge bg-warning text-dark">Kho vận</span>;
      case 'SALES': return <span className="badge bg-success">Bán hàng</span>;
      case 'MANUAL': return <span className="badge bg-info">Thủ công</span>;
      default: return <span className="badge bg-secondary">{source}</span>;
    }
  };

  // Prepare table rows with expandable details
  const tableRows = entries.reduce((acc: any[], entry: any) => {
    // Main row
    acc.push({
      ...entry,
      isMain: true,
      id: entry.id
    });
    
    // If expanded, add lines
    if (expandedRows[entry.id]) {
      entry.lines.forEach((line: any, idx: number) => {
        acc.push({
          ...line,
          isMain: false,
          id: `${entry.id}-line-${idx}`
        });
      });
    }
    return acc;
  }, []);

  const columns: any[] = [
    {
      header: "NGÀY",
      width: "10%",
      render: (row: any) => row.isMain ? (
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-sm btn-link p-0 text-muted" 
            onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
          >
            <i className={`bi bi-chevron-${expandedRows[row.id] ? 'down' : 'right'}`}></i>
          </button>
          <span className="fw-bold">{formatDate(row.entryDate)}</span>
        </div>
      ) : null
    },
    {
      header: "SỐ CT",
      width: "15%",
      render: (row: any) => row.isMain ? <span className="text-primary fw-medium">{row.referenceCode || "-"}</span> : <span className="text-muted ps-4">{row.account?.code}</span>
    },
    {
      header: "DIỄN GIẢI",
      width: "35%",
      render: (row: any) => row.isMain ? row.description : <span className="text-muted">{row.account?.name} {row.description ? `(${row.description})` : ''}</span>
    },
    {
      header: "NGUỒN",
      width: "15%",
      render: (row: any) => row.isMain ? getSourceBadge(row.sourceModule) : null
    },
    {
      header: "NỢ",
      width: "12%",
      align: "right",
      render: (row: any) => row.isMain ? (
        <span className="fw-bold">{formatCurrency(row.totalAmount)}</span>
      ) : row.type === 'DEBIT' ? (
        <span className="text-dark">{formatCurrency(row.amount)}</span>
      ) : null
    },
    {
      header: "CÓ",
      width: "12%",
      align: "right",
      render: (row: any) => row.isMain ? (
        <span className="fw-bold">{formatCurrency(row.totalAmount)}</span>
      ) : row.type === 'CREDIT' ? (
        <span className="text-dark">{formatCurrency(row.amount)}</span>
      ) : null
    }
  ];

  return (
    <StandardPage
      title="Sổ nhật ký chung"
      description="Quản lý toàn bộ bút toán phát sinh trong hệ thống"
      icon="bi-journal-text"
      color="indigo"
      useCard={false}
    >
      <div className="card app-card border-0 shadow-sm flex-grow-1 overflow-hidden d-flex flex-column">
        {/* Filters Toolbar */}
        <div className="card-header bg-white border-bottom p-3 d-flex flex-wrap align-items-center gap-3">
          <div className="position-relative" style={{ width: 280 }}>
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: 13 }} />
            <input 
              type="text" 
              className="form-control form-control-sm ps-5 py-2" 
              placeholder="Tìm theo số CT hoặc diễn giải..." 
              style={{ fontSize: 13, borderRadius: '8px' }}
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          
          <input
            type="month"
            className="form-control form-control-sm py-2"
            style={{ width: 150, fontSize: 13, borderRadius: '8px' }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          
          <select 
            className="form-select form-select-sm py-2" 
            style={{ width: 180, fontSize: 13, borderRadius: '8px' }} 
            value={sourceModule} 
            onChange={(e) => setSourceModule(e.target.value)}
          >
            <option value="">Tất cả nguồn</option>
            <option value="MANUAL">Thủ công</option>
            <option value="SALES">Bán hàng</option>
            <option value="PROCUREMENT">Mua hàng</option>
            <option value="LOGISTICS">Kho vận</option>
            <option value="PRODUCTION">Sản xuất</option>
            <option value="ASSETS">Tài sản</option>
            <option value="CASH">Quỹ & Ngân hàng</option>
            <option value="ADVANCE">Tạm ứng</option>
            <option value="HR">Nhân sự & Tiền lương</option>
          </select>

          <div className="ms-auto">
            <button className="btn btn-primary btn-sm rounded-pill px-3 py-2 shadow-sm text-nowrap d-flex align-items-center gap-2" onClick={() => setShowAddOffcanvas(true)}>
              <i className="bi-plus-lg"></i> Thêm bút toán
            </button>
          </div>
        </div>

        <div className="card-body p-0 flex-grow-1 overflow-auto">
          <Table
            columns={columns}
            rows={tableRows}
            loading={loading}
            stickyHeader
            compact
            emptyText="Chưa có bút toán nào trong hệ thống."
            onRowClick={(row) => row.isMain && toggleExpand(row.id)}
            rowStyle={(row) => !row.isMain ? { background: 'var(--bs-light)', fontSize: '0.9em' } : {}}
          />
        </div>
      </div>

      {showAddOffcanvas && <div className="offcanvas-backdrop fade show" onClick={() => setShowAddOffcanvas(false)} style={{ zIndex: 1040 }}></div>}
      
      <div className={`offcanvas offcanvas-end ${showAddOffcanvas ? "show" : ""}`} tabIndex={-1} style={{ width: 400, zIndex: 1050, visibility: showAddOffcanvas ? 'visible' : 'hidden' }}>
        <div className="offcanvas-header border-bottom py-3">
          <h6 className="offcanvas-title fw-bold mb-0">Thêm bút toán thủ công</h6>
          <button type="button" className="btn-close" style={{ fontSize: 12 }} onClick={() => setShowAddOffcanvas(false)} aria-label="Close"></button>
        </div>
        <div className="offcanvas-body p-0 custom-scrollbar d-flex flex-column h-100" style={{ fontSize: 13 }}>
          <div className="flex-grow-1 overflow-auto p-3 pe-2">
            <div className="mb-3">
              <label className="form-label text-muted mb-1" style={{ fontSize: 11, fontWeight: 600 }}>NGÀY GHI SỔ <span className="text-danger">*</span></label>
              <input type="date" className="form-control form-control-sm" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            
            <div className="mb-3">
              <label className="form-label text-muted mb-1" style={{ fontSize: 11, fontWeight: 600 }}>SỐ CHỨNG TỪ (Tùy chọn)</label>
              <input type="text" className="form-control form-control-sm" placeholder="VD: PC001" value={referenceCode} onChange={e => setReferenceCode(e.target.value)} />
            </div>

            <div className="mb-4">
              <label className="form-label text-muted mb-1" style={{ fontSize: 11, fontWeight: 600 }}>DIỄN GIẢI CHUNG <span className="text-danger">*</span></label>
              <textarea className="form-control form-control-sm" rows={2} placeholder="Nội dung nghiệp vụ phát sinh..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label text-muted mb-0" style={{ fontSize: 11, fontWeight: 600 }}>CHI TIẾT HẠCH TOÁN</label>
              <button type="button" className="btn btn-sm btn-link p-0 text-decoration-none" style={{ fontSize: 12 }} onClick={addLine}>
                + Thêm dòng
              </button>
            </div>

            <div className="bg-light p-2 rounded-3 border mb-3">
              {lines.map((line, idx) => (
                <div key={idx} className="mb-2 position-relative bg-white p-2 rounded shadow-sm border">
                  {lines.length > 2 && (
                    <button type="button" className="btn-close position-absolute top-0 end-0 m-1" style={{ fontSize: 9 }} onClick={() => removeLine(idx)}></button>
                  )}
                  <div className="row g-2">
                    <div className="col-3">
                      <select className="form-select form-select-sm" style={{ fontSize: 12 }} value={line.type} onChange={e => handleLineChange(idx, 'type', e.target.value)}>
                        <option value="DEBIT">Nợ</option>
                        <option value="CREDIT">Có</option>
                      </select>
                    </div>
                    <div className="col-9">
                      <select className="form-select form-select-sm" style={{ fontSize: 12 }} value={line.accountId} onChange={e => handleLineChange(idx, 'accountId', e.target.value)}>
                        <option value="">Chọn tài khoản...</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 mt-1">
                      <input 
                        type="text" 
                        className="form-control form-control-sm text-end text-primary fw-bold" 
                        style={{ fontSize: 13 }}
                        placeholder="Số tiền..." 
                        value={line.amount ? new Intl.NumberFormat('vi-VN').format(line.amount) : ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          handleLineChange(idx, 'amount', val ? Number(val) : 0);
                        }} 
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2 px-1">
                <div className="text-muted" style={{ fontSize: 12 }}>Tổng Nợ: <span className="text-dark fw-bold">{formatCurrency(totalDebit)}</span></div>
                <div className="text-muted" style={{ fontSize: 12 }}>Tổng Có: <span className="text-dark fw-bold">{formatCurrency(totalCredit)}</span></div>
              </div>
              {!isBalanced && (
                <div className="text-danger text-end mt-1 px-1" style={{ fontSize: 11 }}><i className="bi-exclamation-circle me-1"></i> Bút toán chưa cân bằng!</div>
              )}
            </div>
          </div>

          <div className="border-top p-3 d-flex gap-2 justify-content-end mt-auto bg-white">
            <button className="btn btn-light btn-sm" onClick={() => setShowAddOffcanvas(false)}>Hủy</button>
            <button className="btn btn-primary btn-sm" disabled={!isBalanced || !description || !entryDate || lines.some(l => !l.accountId || !l.amount)} onClick={handleSave}>
              <i className="bi-check2-circle me-1"></i> Ghi sổ
            </button>
          </div>
        </div>
      </div>
    </StandardPage>
  );
}
