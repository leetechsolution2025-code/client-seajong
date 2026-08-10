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
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DefectHandlingPage() {
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isCreateOffcanvasOpen, setIsCreateOffcanvasOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'INTERNAL' | 'WARRANTY' | 'RETURN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const { data: defects, mutate } = useSWR('/api/production/defects', fetcher);
  
  // Lọc dữ liệu
  const filteredDefects = defects?.filter((d: any) => {
    if (activeTab !== 'ALL' && d.source !== activeTab) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (searchQuery && !d.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

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
              <DefectList data={filteredDefects} onSelect={id => setSelectedDefectId(id)} />
            }
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
