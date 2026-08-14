"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { Table, TableColumn } from "@/components/ui/Table";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { BrandButton } from "@/components/ui/BrandButton";

export default function DefectsSummaryPage() {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/production/defects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Chỉ lấy các lỗi do bộ phận QA tạo ra
          setDefects(data.filter(d => d.reporterDepartment === 'qa'));
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredDefects = defects.filter(d => {
    if (filterStatus !== "ALL") {
      if (filterStatus === "PENDING" && d.status !== "NEW" && d.status !== "TECH_EVALUATING" && d.status !== "WAITING_APPROVAL") return false;
      if (filterStatus === "RESOLVED" && d.status !== "COMPLETED") return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (d.code?.toLowerCase().includes(q) || d.orderNumber?.toLowerCase().includes(q));
    }
    return true;
  });

  const columns: TableColumn<any>[] = [
    {
      header: "Mã lỗi",
      render: (row) => <span className="fw-medium text-primary">{row.code}</span>
    },
    {
      header: "Số biên bản",
      render: (row) => row.orderNumber || "—"
    },
    {
      header: "Mô tả lỗi",
      render: (row) => (
        <div style={{ whiteSpace: "pre-wrap", fontSize: "13px" }}>
          {row.description}
        </div>
      )
    },
    {
      header: "Trạng thái",
      render: (row) => {
        if (row.status === "COMPLETED") return <span className="badge bg-success-subtle text-success">Đã xử lý</span>;
        return <span className="badge bg-warning-subtle text-warning">Chờ xử lý</span>;
      }
    }
  ];

  return (
    <StandardPage
      title="Tổng hợp hàng lỗi"
      description="Quản lý và tổng hợp các hồ sơ hàng lỗi từ các bộ phận"
      icon="bi-exclamation-triangle"
      color="rose"
      useCard={false}
    >
      <FullWidthTableLayout
        className="bg-white rounded-4 shadow-sm border flex-grow-1"
        header={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Tất cả trạng thái"
              options={[
                { label: "Chờ xử lý", value: "PENDING" },
                { label: "Đã xử lý", value: "RESOLVED" }
              ]}
              width={160}
            />

            <div style={{ position: "relative", width: 320 }}>
              <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
              <input 
                type="text" 
                placeholder="Tìm kiếm mã lỗi, số biên bản..." 
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

            <div style={{ flex: 1 }} />

            <BrandButton 
              icon="bi-plus-lg"
              disabled
              title="Tính năng thêm mới tạm thời bị khoá"
            >
              Thêm mới
            </BrandButton>
          </div>
        }
        table={
          <Table 
            columns={columns}
            rows={filteredDefects}
            emptyText="Chưa có dữ liệu tổng hợp hàng lỗi."
            wrapperClassName="h-100"
            loading={loading}
          />
        }
      />
    </StandardPage>
  );
}
