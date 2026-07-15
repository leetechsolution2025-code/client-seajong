"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { Table } from "@/components/ui/Table";

const EXPORT_FORMATS = [
  { id: "misa", name: "MISA SME.NET", icon: "bi-filetype-xls", color: "success", desc: "Định dạng chuẩn để import chứng từ MISA" },
  { id: "fast", name: "FAST Accounting", icon: "bi-filetype-csv", color: "primary", desc: "Cấu trúc cột tương thích FAST 11" },
  { id: "sap", name: "SAP B1", icon: "bi-filetype-xml", color: "warning", desc: "Tương thích SAP Business One DTW" },
  { id: "bravo", name: "BRAVO 8", icon: "bi-filetype-xlsx", color: "info", desc: "Mẫu import dữ liệu BRAVO 8" },
  { id: "standard", name: "Excel tiêu chuẩn", icon: "bi-file-earmark-excel", color: "secondary", desc: "Định dạng Excel đọc hiểu thông thường" }
];

export default function ExportDataPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [dataType, setDataType] = useState("sales");
  const [format, setFormat] = useState("misa");
  
  // Lịch sử kết xuất giả lập
  const [history, setHistory] = useState([
    { id: 1, date: "2026-07-15 09:30", type: "Doanh thu bán hàng", format: "MISA SME.NET", status: "Thành công", user: "Trần Thị Linh" },
    { id: 2, date: "2026-07-14 15:45", type: "Phiếu thu / chi", format: "FAST Accounting", status: "Thành công", user: "Nguyễn Văn A" },
    { id: 3, date: "2026-07-10 10:15", type: "Công nợ phải thu", format: "Excel tiêu chuẩn", status: "Thành công", user: "Trần Thị Linh" },
  ]);

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Giả lập API kết xuất
    setTimeout(() => {
      setLoading(false);
      success("Kết xuất thành công", "Tệp dữ liệu đã được tải xuống máy của bạn.");
      setHistory(prev => [
        {
          id: Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          type: dataType === "sales" ? "Doanh thu bán hàng" : dataType === "expenses" ? "Phiếu thu / chi" : "Công nợ",
          format: EXPORT_FORMATS.find(f => f.id === format)?.name || "Excel",
          status: "Thành công",
          user: "Trần Thị Linh" // Current user
        },
        ...prev
      ].slice(0, 5));
    }, 1500);
  };

  return (
    <StandardPage
      title="Kết xuất dữ liệu"
      description="Kết xuất dữ liệu tài chính kế toán tương thích các phần mềm chuyên dụng"
      icon="bi-box-arrow-right"
      color="indigo"
    >
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="app-card border-0 shadow-sm rounded-4 h-100">
            <div className="app-card-body p-4">
              <SectionTitle title="Thiết lập bộ lọc xuất dữ liệu" icon="bi-funnel" />
              
              <form onSubmit={handleExport} className="mt-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 13 }}>Loại chứng từ / Dữ liệu</label>
                    <select 
                      className="form-select form-select-sm shadow-none" 
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value)}
                    >
                      <option value="sales">Doanh thu bán hàng</option>
                      <option value="purchases">Chi phí mua hàng</option>
                      <option value="expenses">Phiếu thu / Phiếu chi</option>
                      <option value="debts">Công nợ phải thu / phải trả</option>
                      <option value="inventory">Nhập / Xuất kho (Giá trị)</option>
                      <option value="advances">Tạm ứng nhân viên</option>
                    </select>
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 13 }}>Định dạng phần mềm</label>
                    <select 
                      className="form-select form-select-sm shadow-none"
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      {EXPORT_FORMATS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 13 }}>Từ ngày</label>
                    <input type="date" className="form-control form-control-sm shadow-none" defaultValue="2026-07-01" />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 13 }}>Đến ngày</label>
                    <input type="date" className="form-control form-control-sm shadow-none" defaultValue="2026-07-31" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top">
                  {EXPORT_FORMATS.map(f => f.id === format && (
                    <div key={f.id} className={`alert alert-${f.color} bg-${f.color}-subtle border-0 d-flex align-items-center mb-4`} style={{ fontSize: 13 }}>
                      <i className={`bi ${f.icon} fs-4 me-3 text-${f.color}`}></i>
                      <div>
                        <strong className={`d-block text-${f.color} mb-1`}>{f.name}</strong>
                        <span className="text-muted">{f.desc}. Hệ thống sẽ tự động định khoản và mapping các trường tương ứng.</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="d-flex justify-content-end">
                    <BrandButton 
                      type="submit"
                      icon={loading ? "bi-hourglass-split" : "bi-download"} 
                      className="px-4 py-2"
                      disabled={loading}
                    >
                      {loading ? "Đang xử lý..." : "Kết xuất file Excel"}
                    </BrandButton>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="app-card border-0 shadow-sm rounded-4 h-100 bg-light">
            <div className="app-card-body p-4">
              <SectionTitle title="Lịch sử kết xuất" icon="bi-clock-history" />
              
              <div className="mt-4">
                {history.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {history.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-3 shadow-sm border">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="badge bg-primary-subtle text-primary fw-medium rounded-pill" style={{ fontSize: 11 }}>
                            {item.format}
                          </span>
                          <span className="text-muted" style={{ fontSize: 11.5 }}>{item.date}</span>
                        </div>
                        <h6 className="mb-1" style={{ fontSize: 14 }}>{item.type}</h6>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: 12 }}>
                            <i className="bi bi-person-circle"></i>
                            {item.user}
                          </div>
                          <span className="text-success fw-medium d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                            <i className="bi bi-check2-circle"></i> {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-inbox fs-2 mb-2 opacity-50"></i>
                    <p className="mb-0" style={{ fontSize: 13 }}>Chưa có lịch sử kết xuất</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardPage>
  );
}
