"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { Table } from "@/components/ui/Table";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    fetch("/api/finance/accounts")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Sort by code just in case
          const flat = d.flatData.sort((a: any, b: any) => a.code.localeCompare(b.code));
          setAccounts(flat);
        }
        setLoading(false);
      });
  }, []);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ASSET": return "Tài sản";
      case "LIABILITY": return "Nợ phải trả";
      case "EQUITY": return "Vốn chủ sở hữu";
      case "REVENUE": return "Doanh thu";
      case "EXPENSE": return "Chi phí";
      default: return type;
    }
  };

  const columns = [
    {
      header: "SỐ TÀI KHOẢN",
      width: "15%",
      render: (row: any) => (
        <span className={row.level === 1 ? "fw-bold text-primary" : ""} style={{ paddingLeft: (row.level - 1) * 20 }}>
          {row.level > 1 && <span className="text-muted me-2">↳</span>}
          {row.code}
        </span>
      ),
    },
    {
      header: "TÊN TÀI KHOẢN",
      width: "55%",
      render: (row: any) => (
        <span className={row.level === 1 ? "fw-bold" : ""}>
          {row.name}
        </span>
      ),
    },
    {
      header: "TÍNH CHẤT",
      width: "15%",
      render: (row: any) => (
        <span className="badge bg-light text-dark border">
          {getTypeLabel(row.type)}
        </span>
      ),
    },
    {
      header: "SỐ DƯ HIỆN TẠI",
      width: "15%",
      align: "right" as const,
      render: (row: any) => (
        <span className={row.level === 1 ? "fw-bold" : ""}>
          {formatCurrency(row.balance || 0)}
        </span>
      ),
    },
  ];

  const actions = (
    <button className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm text-nowrap">
      <i className="bi-plus-lg me-1"></i> Thêm tài khoản con
    </button>
  );

  const filteredAccounts = accounts.filter(acc => {
    if (filterType && acc.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!acc.name.toLowerCase().includes(s) && !acc.code.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <StandardPage
      title="Danh mục tài khoản kế toán"
      description="Hệ thống tài khoản phân cấp 3 cấp độ (Cấp 1, Cấp 2, Cấp 3)"
      icon="bi-journal-bookmark"
      color="indigo"
      useCard={false}
      hideTicker={true}
    >
      <div className="card app-card border-0 shadow-sm flex-grow-1 overflow-hidden d-flex flex-column">
        {/* Filters Toolbar */}
        <div className="card-header bg-white border-bottom p-3 d-flex flex-wrap align-items-center gap-3">
          <div className="position-relative" style={{ width: 280 }}>
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: 13 }} />
            <input 
              type="text" 
              className="form-control form-control-sm ps-5 py-2" 
              placeholder="Tìm theo số hoặc tên tài khoản..." 
              style={{ fontSize: 13, borderRadius: '8px' }}
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          
          <select 
            className="form-select form-select-sm py-2" 
            style={{ width: 180, fontSize: 13, borderRadius: '8px' }} 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Tất cả tính chất</option>
            <option value="ASSET">Tài sản</option>
            <option value="LIABILITY">Nợ phải trả</option>
            <option value="EQUITY">Vốn chủ sở hữu</option>
            <option value="REVENUE">Doanh thu</option>
            <option value="EXPENSE">Chi phí</option>
          </select>

          <div className="ms-auto">
            {actions}
          </div>
        </div>

        <div className="card-body p-0 flex-grow-1 overflow-auto">
          <Table
            columns={columns}
            rows={filteredAccounts}
            loading={loading}
            stickyHeader
            compact
            emptyText="Chưa có tài khoản nào trong hệ thống."
          />
        </div>
      </div>
    </StandardPage>
  );
}
