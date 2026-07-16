"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { DefectList } from "./components/DefectList";
import { DefectSummaryOffcanvas } from "./components/DefectSummaryOffcanvas";
import { DefectProcessModal } from "./components/DefectProcessModal";
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DefectHandlingPage() {
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'INTERNAL' | 'WARRANTY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: defects, mutate } = useSWR('/api/production/defects', fetcher);
  
  // Lọc dữ liệu
  const filteredDefects = defects?.filter((d: any) => {
    if (activeTab !== 'ALL' && d.source !== activeTab) return false;
    if (searchQuery && !d.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <StandardPage
      title="Xử lý hàng lỗi"
      description="Quản lý và xử lý các sản phẩm lỗi (Bảo hành & Nội bộ)"
      icon="bi-tools"
      color="rose"
      useCard={false} // We manually handle cards for both views
      background={selectedDefectId !== null ? "#f4f6f8" : "#EBF0F5"}

    >
      <div className="d-flex flex-column h-100">
          <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-3" style={{ fontSize: '13px' }}>
            <div className="d-flex flex-wrap align-items-center gap-3">
              {/* Segmented Toggle */}
              <div className="d-flex gap-1 bg-light p-1 rounded-pill border">
                <input type="radio" className="btn-check" name="btnradio" id="btnradio1" autoComplete="off" checked={activeTab === 'ALL'} onChange={() => setActiveTab('ALL')} />
                <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'ALL' ? 'btn-white shadow-sm fw-bold' : 'btn-light text-muted'}`} htmlFor="btnradio1" style={{ fontSize: '12px' }}>Tất cả</label>

                <input type="radio" className="btn-check" name="btnradio" id="btnradio2" autoComplete="off" checked={activeTab === 'INTERNAL'} onChange={() => setActiveTab('INTERNAL')} />
                <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'INTERNAL' ? 'btn-white shadow-sm fw-bold text-danger' : 'btn-light text-muted'}`} htmlFor="btnradio2" style={{ fontSize: '12px' }}>
                  Nội bộ
                </label>

                <input type="radio" className="btn-check" name="btnradio" id="btnradio3" autoComplete="off" checked={activeTab === 'WARRANTY'} onChange={() => setActiveTab('WARRANTY')} />
                <label className={`btn btn-sm rounded-pill px-4 ${activeTab === 'WARRANTY' ? 'btn-white shadow-sm fw-bold text-primary' : 'btn-light text-muted'}`} htmlFor="btnradio3" style={{ fontSize: '12px' }}>
                  Bảo hành
                </label>
              </div>

              {/* Status Filter */}
              <select className="form-select form-select-sm rounded-pill shadow-none border" style={{ width: '160px', fontSize: '13px' }}>
                <option value="">Tất cả trạng thái</option>
                <option value="NEW">Mới</option>
                <option value="TECH_EVALUATING">Đang chẩn đoán</option>
                <option value="WAITING_APPROVAL">Chờ duyệt</option>
                <option value="PROCESSING">Đang xử lý</option>
                <option value="COMPLETED">Hoàn tất</option>
              </select>

              {/* Search Box */}
              <div className="input-group input-group-sm" style={{ width: 250 }}>
                <span className="input-group-text bg-white border-end-0 text-muted rounded-start-pill ps-3">
                  <i className="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-0 rounded-end-pill shadow-none" 
                  placeholder="Tìm mã lỗi, SĐT khách..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              
              <button className="btn btn-sm btn-primary fw-medium rounded-pill px-3 shadow-sm d-flex align-items-center" style={{ fontSize: '13px' }}>
                <i className="bi bi-plus-lg me-1"></i> Tạo hồ sơ lỗi
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-4 shadow-sm border p-3 p-sm-4 flex-grow-1 overflow-auto">
            <DefectList data={filteredDefects} onSelect={id => setSelectedDefectId(id)} />
          </div>
        </div>

        <DefectSummaryOffcanvas 
          defectId={selectedDefectId}
          defect={defects?.find((d: any) => d.id === selectedDefectId)}
          onClose={() => setSelectedDefectId(null)} 
          onRefresh={() => mutate()}
          onOpenProcess={() => setIsProcessModalOpen(true)}
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
