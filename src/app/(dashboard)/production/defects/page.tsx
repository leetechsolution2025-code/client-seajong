"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { DefectList } from "./components/DefectList";
import { DefectSummaryOffcanvas } from "./components/DefectSummaryOffcanvas";
import { DefectProcessModal } from "./components/DefectProcessModal";
import { CreateDefectOffcanvas } from "./components/CreateDefectOffcanvas";
import { BrandButton } from "@/components/ui/BrandButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { Pagination } from "@/components/ui/Pagination";
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DefectHandlingPage() {
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isCreateOffcanvasOpen, setIsCreateOffcanvasOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'INTERNAL' | 'WARRANTY' | 'RETURN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { data: defects, mutate } = useSWR('/api/production/defects', fetcher);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery]);
  
  // Lọc dữ liệu
  const filteredDefects = defects?.filter((d: any) => {
    if (activeTab !== 'ALL' && d.source !== activeTab) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = d.code?.toLowerCase().includes(q);
      const matchProduct = d.productName?.toLowerCase().includes(q);
      const matchPhone = d.customerPhone?.includes(q);
      const matchCustomer = d.customerName?.toLowerCase().includes(q);
      if (!matchCode && !matchProduct && !matchPhone && !matchCustomer) return false;
    }
    return true;
  }) || [];

  const totalPages = Math.ceil(filteredDefects.length / pageSize);
  const paginatedDefects = filteredDefects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <StandardPage
      title="Hàng lỗi và hàng trả về"
      description="Quản lý và xử lý các sản phẩm lỗi (Bảo hành & Nội bộ)"
      icon="bi-tools"
      color="rose"
      useCard={false}
      hideTicker={true}
      background={selectedDefectId !== null ? "#f4f6f8" : "#EBF0F5"}
    >
      <div className="d-flex flex-column h-100 pb-3">
        <div className="bg-white rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden">
          <FullWidthTableLayout 
            header={
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 w-100">
                <div className="d-flex flex-wrap align-items-center gap-3">
                  {/* Segmented Toggle */}
                  <div className="d-flex gap-1 bg-white p-1 rounded-pill border shadow-sm">
                    <input type="radio" className="btn-check" name="btnradio" id="btnradio1" autoComplete="off" checked={activeTab === 'ALL'} onChange={() => setActiveTab('ALL')} />
                    <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'ALL' ? 'btn-dark shadow-sm fw-bold' : 'btn-white text-muted'}`} htmlFor="btnradio1" style={{ fontSize: '12px' }}>Tất cả</label>

                    <input type="radio" className="btn-check" name="btnradio" id="btnradio2" autoComplete="off" checked={activeTab === 'INTERNAL'} onChange={() => setActiveTab('INTERNAL')} />
                    <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'INTERNAL' ? 'btn-danger shadow-sm fw-bold' : 'btn-white text-muted'}`} htmlFor="btnradio2" style={{ fontSize: '12px' }}>
                      Nội bộ
                    </label>

                    <input type="radio" className="btn-check" name="btnradio" id="btnradio3" autoComplete="off" checked={activeTab === 'WARRANTY'} onChange={() => setActiveTab('WARRANTY')} />
                    <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'WARRANTY' ? 'btn-primary shadow-sm fw-bold' : 'btn-white text-muted'}`} htmlFor="btnradio3" style={{ fontSize: '12px' }}>
                      Bảo hành
                    </label>

                    <input type="radio" className="btn-check" name="btnradio" id="btnradio4" autoComplete="off" checked={activeTab === 'RETURN'} onChange={() => setActiveTab('RETURN')} />
                    <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'RETURN' ? 'btn-warning text-dark shadow-sm fw-bold' : 'btn-white text-muted'}`} htmlFor="btnradio4" style={{ fontSize: '12px' }}>
                      Trả về
                    </label>
                  </div>

                  <FilterSelect 
                    options={[
                      { label: "Chưa xử lý", value: "NEW" },
                      { label: "Đang xử lý", value: "PROCESSING" },
                      { label: "Đã xử lý", value: "COMPLETED" }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    width={160}
                  />

                  <SearchInput 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Tìm mã lỗi, SĐT khách..."
                    style={{ width: 250 }}
                  />
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                  <BrandButton 
                    variant="primary" 
                    className="px-3 shadow-sm rounded-3"
                    onClick={() => setIsCreateOffcanvasOpen(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i> Tạo hồ sơ lỗi
                  </BrandButton>
                </div>
              </div>
            }
            table={
              <DefectList data={paginatedDefects} onSelect={id => setSelectedDefectId(id)} />
            }
            footer={
              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 w-100 px-3 py-1">
                <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: 12 }}>
                  <span>Hiển thị <strong>{filteredDefects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(currentPage * pageSize, filteredDefects.length)}</strong> trên tổng số <strong>{filteredDefects.length}</strong> hồ sơ</span>
                  <select 
                    className="form-select form-select-sm ms-1 border-secondary-subtle" 
                    style={{ width: "auto", fontSize: 12, padding: "2px 24px 2px 8px" }}
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10 hồ sơ / trang</option>
                    <option value={20}>20 hồ sơ / trang</option>
                    <option value={50}>50 hồ sơ / trang</option>
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Pagination 
                    page={currentPage} 
                    totalPages={Math.max(1, totalPages)} 
                    onChange={setCurrentPage} 
                  />
                </div>
              </div>
            }
            footerStyle={{ padding: "10px 16px", backgroundColor: "#fff" }}
          />
        </div>
      </div>

        <DefectSummaryOffcanvas 
          defectId={selectedDefectId}
          defect={defects?.find((d: any) => d.id === selectedDefectId)}
          onClose={() => setSelectedDefectId(null)} 
          onRefresh={() => mutate()}
          onOpenProcess={() => setIsProcessModalOpen(true)}
        />
        
        <CreateDefectOffcanvas 
          show={isCreateOffcanvasOpen}
          onClose={() => setIsCreateOffcanvasOpen(false)}
          onRefresh={() => mutate()}
        />
        
        {isProcessModalOpen && (
          <DefectProcessModal 
            defectId={selectedDefectId}
            onClose={() => setIsProcessModalOpen(false)}
            onRefresh={() => mutate()}
          />
        )}
    </StandardPage>
  );
}
