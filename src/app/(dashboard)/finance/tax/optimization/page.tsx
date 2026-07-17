"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import dynamic from "next/dynamic";
import { TaxPolicyTicker } from "@/components/features/finance/TaxPolicyTicker";

// Using standard NumberFormat for money
const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function TaxOptimizationPage() {
  const [selectedDate, setSelectedDate] = useState<number>(20);
  const [activeTab, setActiveTab] = useState("TNCN");

  // State for TNCN (PIT)
  const [salaryInput, setSalaryInput] = useState("55,000,000");
  const salary = parseFloat(salaryInput.replace(/,/g, "")) || 0;

  // AI Logic for TNCN
  const hasRentOptimization = salary > 50000000;
  const rentAllowance = hasRentOptimization ? salary * 0.15 : 0;
  const taxableIncome = salary - rentAllowance; // Simplified
  const taxAmount = taxableIncome * 0.2; // Simplified tax calculation for demo
  const netIncome = salary - taxAmount;

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format input with commas
    const rawValue = e.target.value.replace(/,/g, "");
    if (!isNaN(Number(rawValue))) {
      setSalaryInput(formatVND(Number(rawValue)));
    }
  };

  // State for TNDN (CIT)
  const [revenueInput, setRevenueInput] = useState("500,000,000");
  const [expenseInput, setExpenseInput] = useState("350,000,000");
  const revenue = parseFloat(revenueInput.replace(/,/g, "")) || 0;
  const expense = parseFloat(expenseInput.replace(/,/g, "")) || 0;
  
  const profit = revenue - expense;
  const citTax = profit > 0 ? profit * 0.2 : 0; // 20% CIT

  // Chart configs
  const pitChartOptions: any = {
    labels: ["Lương Net", "Thuế TNCN", "Khoản tối ưu (Tiền nhà)"],
    colors: ["#20c997", "#dc3545", "#0d6efd"],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '65%' } } }
  };
  const pitChartSeries = [netIncome, taxAmount, rentAllowance];

  const citChartOptions: any = {
    labels: ["Lợi nhuận ròng", "Thuế TNDN (20%)", "Chi phí hợp lý"],
    colors: ["#20c997", "#ffc107", "#6c757d"],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '65%' } } }
  };
  const citChartSeries = [profit - citTax, citTax, expense];

  // Calendar rendering helper
  const renderCalendar = () => {
    const days = [];
    // Dummy offsets for a typical month view
    for (let i = 0; i < 3; i++) days.push(<div key={`empty-${i}`} className="text-center p-2 text-muted"></div>);
    
    for (let i = 1; i <= 31; i++) {
      let isUrgent = i === 20;
      let isWarning = i === 30;
      let isCompleted = i === 10;
      let isSelected = i === selectedDate;

      let dotClass = "";
      if (isUrgent) dotClass = "bg-danger";
      else if (isWarning) dotClass = "bg-warning";
      else if (isCompleted) dotClass = "bg-success";

      days.push(
        <div 
          key={i} 
          onClick={() => {
            setSelectedDate(i);
            if (i === 30) setActiveTab("TNDN");
            if (i === 20) setActiveTab("TNCN");
          }}
          className={`position-relative text-center p-2 rounded-3 cursor-pointer transition-all ${isSelected ? 'bg-primary text-white shadow-sm fw-bold' : 'hover-bg-light'}`}
          style={{ cursor: "pointer", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {i}
          {dotClass && (
            <span className={`position-absolute bottom-0 start-50 translate-middle-x rounded-circle ${dotClass}`} 
                  style={{ width: "6px", height: "6px", marginBottom: "4px" }}></span>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <StandardPage
      title="Lập lịch & Tối ưu Thuế (Tax Optimization)"
      description="Quản lý lịch nộp thuế thông minh và tối ưu hóa dòng tiền dựa trên AI."
      icon="bi-calendar-check"
      useCard={false}
      afterHeader={<TaxPolicyTicker />}
    >
      <div className="row g-4">
        
        {/* NỬA TRÁI: TAX CALENDAR */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-calendar3 text-primary me-2"></i> Lịch Thuế Thông Minh
              </h5>
              <button className="btn btn-sm btn-outline-primary rounded-pill px-3">
                <i className="bi bi-google me-1"></i> Sync Calendar
              </button>
            </div>
            <div className="card-body">
              {/* Calendar Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold mb-0">Tháng 7, 2026</h6>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-light"><i className="bi bi-chevron-left"></i></button>
                  <button className="btn btn-sm btn-light"><i className="bi bi-chevron-right"></i></button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="mb-4">
                <div className="d-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "5px" }}>
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                    <div key={d} className="text-center fw-medium text-muted small pb-2">{d}</div>
                  ))}
                  {renderCalendar()}
                </div>
              </div>

              {/* Legend */}
              <div className="d-flex justify-content-between small text-muted border-top pt-3 mb-4">
                <span className="d-flex align-items-center"><span className="rounded-circle bg-danger me-2" style={{width: 8, height: 8}}></span> Khẩn cấp</span>
                <span className="d-flex align-items-center"><span className="rounded-circle bg-warning me-2" style={{width: 8, height: 8}}></span> Sắp đến hạn</span>
                <span className="d-flex align-items-center"><span className="rounded-circle bg-success me-2" style={{width: 8, height: 8}}></span> Đã nộp</span>
              </div>

              {/* Selected Date Tasks */}
              <div className="bg-light rounded-4 p-3 border">
                <h6 className="fw-bold mb-3 d-flex align-items-center">
                  <i className="bi bi-check2-square text-primary me-2"></i> Công việc Ngày {selectedDate}
                </h6>
                {selectedDate === 20 ? (
                  <div className="alert alert-danger border-0 bg-danger-subtle text-danger-emphasis py-2 px-3 mb-2 rounded-3 d-flex align-items-center">
                    <i className="bi bi-exclamation-circle-fill me-2"></i> Nộp tờ khai Thuế GTGT Tháng trước
                  </div>
                ) : selectedDate === 30 ? (
                  <div className="alert alert-warning border-0 bg-warning-subtle text-warning-emphasis py-2 px-3 mb-2 rounded-3 d-flex align-items-center">
                    <i className="bi bi-bell-fill me-2"></i> Hạn nộp Tạm tính Thuế TNDN Quý 2
                  </div>
                ) : (
                  <div className="text-muted small text-center py-2">Không có lịch trình thuế nào trong ngày này.</div>
                )}
              </div>

            </div>
          </div>
        </div>


        {/* NỬA PHẢI: CALCULATOR & AI OPTIMIZER */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
              <ul className="nav nav-pills gap-2" role="tablist">
                <li className="nav-item">
                  <button className={`nav-link rounded-pill px-4 fw-medium ${activeTab === 'TNCN' ? 'active shadow-sm' : 'bg-light text-dark'}`} 
                          onClick={() => setActiveTab("TNCN")}>
                    Quyết toán TNCN
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link rounded-pill px-4 fw-medium ${activeTab === 'TNDN' ? 'active shadow-sm' : 'bg-light text-dark'}`} 
                          onClick={() => setActiveTab("TNDN")}>
                    Tạm tính TNDN
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link rounded-pill px-4 fw-medium ${activeTab === 'FCT' ? 'active shadow-sm' : 'bg-light text-dark'}`} 
                          onClick={() => setActiveTab("FCT")}>
                    Thuế Nhà Thầu (FCT)
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="card-body">
              
              {/* === TAB TNCN === */}
              {activeTab === "TNCN" && (
                <div className="animation-fade-in">
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <div className="bg-light rounded-4 p-4 h-100 border">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0">Thông số tính toán</h6>
                          <button className="btn btn-sm btn-outline-secondary rounded-pill" title="Lấy dữ liệu tự động từ module Chấm công/Lương">
                            <i className="bi bi-cloud-arrow-down"></i> Auto
                          </button>
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-muted small fw-medium">Tổng thu nhập chịu thuế (Gross)</label>
                          <div className="input-group input-group-lg">
                            <input type="text" className="form-control fw-bold fs-5 text-primary" 
                                   value={salaryInput} onChange={handleSalaryChange} />
                            <span className="input-group-text bg-white">VNĐ</span>
                          </div>
                        </div>
                        <div className="mb-0">
                          <label className="form-label text-muted small fw-medium">Số người phụ thuộc</label>
                          <select className="form-select">
                            <option>0</option>
                            <option>1</option>
                            <option>2</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded-4 p-3 h-100 d-flex flex-column align-items-center justify-content-center">
                        <Chart options={pitChartOptions} series={pitChartSeries} type="donut" height={220} width="100%" />
                      </div>
                    </div>
                  </div>

                  {/* AI TAX OPTIMIZER - TNCN */}
                  <div className={`card border-0 rounded-4 shadow-sm ${hasRentOptimization ? 'bg-primary-subtle' : 'bg-light'}`}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start gap-3">
                        <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: 48, height: 48, flexShrink: 0}}>
                          <i className={`bi bi-lightbulb-fill fs-4 ${hasRentOptimization ? 'text-primary' : 'text-muted'}`}></i>
                        </div>
                        <div>
                          <h6 className="fw-bold d-flex align-items-center mb-2">
                            AI Tax Optimizer 
                            <span className="badge bg-primary ms-2 rounded-pill small" style={{fontSize: "10px"}}>ACTIVE</span>
                          </h6>
                          {hasRentOptimization ? (
                            <p className="mb-0 text-dark" style={{fontSize: "14.5px", lineHeight: "1.6"}}>
                              <strong>Phát hiện thu nhập cao {`>`} 50tr:</strong> Theo Thông tư 111/2013/TT-BTC, khoản tiền thuê nhà do công ty trả hộ sẽ được miễn thuế TNCN (không vượt quá 15% tổng thu nhập). 
                              <br/>
                              💡 <strong>Đề xuất:</strong> Chuyển <strong>{formatVND(rentAllowance)} VNĐ</strong> thành khoản "Phụ cấp tiền thuê nhà trả trực tiếp cho chủ nhà". Bạn có thể tiết kiệm được một khoản thuế đáng kể!
                            </p>
                          ) : (
                            <p className="mb-0 text-muted" style={{fontSize: "14px"}}>
                              Cấu trúc thu nhập hiện tại đã tối ưu theo quy định. Hãy thử tăng mức thu nhập Gross lên trên 50,000,000 VNĐ để xem các đề xuất tối ưu bậc cao từ AI.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB TNDN === */}
              {activeTab === "TNDN" && (
                <div className="animation-fade-in">
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <div className="bg-light rounded-4 p-4 h-100 border">
                        <h6 className="fw-bold mb-3">Dữ liệu kinh doanh Quý 2</h6>
                        <div className="mb-3">
                          <label className="form-label text-muted small fw-medium">Tổng Doanh Thu</label>
                          <div className="input-group">
                            <input type="text" className="form-control fw-bold" 
                                   value={revenueInput} onChange={e => {
                                      const raw = e.target.value.replace(/,/g, "");
                                      if(!isNaN(Number(raw))) setRevenueInput(formatVND(Number(raw)));
                                   }} />
                          </div>
                        </div>
                        <div className="mb-0">
                          <label className="form-label text-muted small fw-medium">Chi Phí Hợp Lý (Được trừ)</label>
                          <div className="input-group">
                            <input type="text" className="form-control fw-bold" 
                                   value={expenseInput} onChange={e => {
                                      const raw = e.target.value.replace(/,/g, "");
                                      if(!isNaN(Number(raw))) setExpenseInput(formatVND(Number(raw)));
                                   }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded-4 p-3 h-100 d-flex flex-column align-items-center justify-content-center">
                        <Chart options={citChartOptions} series={citChartSeries} type="donut" height={220} width="100%" />
                      </div>
                    </div>
                  </div>

                  {/* AI FORECASTING - TNDN */}
                  <div className="card border-warning border-start border-4 rounded-4 shadow-sm bg-warning-subtle">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start gap-3">
                        <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: 48, height: 48, flexShrink: 0}}>
                          <i className="bi bi-graph-up-arrow text-warning fs-4"></i>
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-2">
                            Dự báo dòng tiền nộp thuế (Tax Cashflow Forecast)
                          </h6>
                          <p className="mb-0 text-dark" style={{fontSize: "14.5px", lineHeight: "1.6"}}>
                            Dựa trên biên lợi nhuận hiện tại, dự kiến số thuế TNDN tạm tính phải nộp trong tháng này là <strong>{formatVND(citTax)} VNĐ</strong>.
                            <br/>
                            ⚠️ <strong>Cảnh báo dòng tiền:</strong> Số thuế này cao hơn 25% so với quý trước. Đề nghị bộ phận Tài chính chuẩn bị sẵn nguồn tiền mặt trước ngày 30/07 để tránh phát sinh tiền chậm nộp.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB FCT === */}
              {activeTab === "FCT" && (
                <div className="animation-fade-in p-5 text-center">
                  <div className="display-1 text-muted mb-3"><i className="bi bi-globe2"></i></div>
                  <h5 className="fw-bold text-dark">Thuế Nhà Thầu Nước Ngoài (FCT)</h5>
                  <p className="text-muted">Bộ máy tính toán thuế nhà thầu đa quốc gia đang được nâng cấp.<br/>Tự động bóc tách tỷ lệ TNDN & GTGT theo từng loại dịch vụ.</p>
                  <button className="btn btn-primary rounded-pill px-4 mt-2">Bật thông báo khi ra mắt</button>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .animation-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-bg-light:hover { background-color: #f8f9fa !important; }
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.2s ease-in-out; }
      `}} />
    </StandardPage>
  );
}
