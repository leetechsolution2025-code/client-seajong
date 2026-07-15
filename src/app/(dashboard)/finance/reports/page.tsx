"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table } from "@/components/ui/Table";
import { BrandButton } from "@/components/ui/BrandButton";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";

const REPORT_STEPS: ModernStepItem[] = [
  { num: 1, id: "balance", title: "Tình hình tài chính", desc: "Cân đối kế toán", icon: "bi-building" },
  { num: 2, id: "income", title: "Kết quả kinh doanh", desc: "Doanh thu & Chi phí", icon: "bi-graph-up-arrow" },
  { num: 3, id: "cashflow", title: "Lưu chuyển tiền tệ", desc: "Dòng tiền vào/ra", icon: "bi-currency-exchange" },
  { num: 4, id: "trial", title: "Cân đối tài khoản", desc: "Số dư các tài khoản", icon: "bi-table" },
];

export default function FinancialReportsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const activeTab = REPORT_STEPS.find(s => s.num === currentStep)?.id || "balance";

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/finance/reports?tab=${activeTab}&month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setReportData(data.data || []);
          setAnalysis(data.analysis || null);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setIsLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [activeTab, month, year]);

  const columns = [
    { header: "CHỈ TIÊU", render: (row: any) => {
      const isCollapsible = row.item === "TÀI SẢN" || row.item === "NGUỒN VỐN";
      const isCollapsed = collapsedSections[row.item];
      return (
        <span 
          className={row.isLevel1 && !isCollapsible ? "fw-bold text-uppercase text-dark" : (row.isLevel1 && isCollapsible ? "fw-bold text-uppercase" : (row.isParent ? "fw-bold text-dark" : "text-muted ms-3"))}
          style={isCollapsible ? { cursor: 'pointer', userSelect: 'none', color: '#003087' } : {}}
          onClick={() => isCollapsible && toggleSection(row.item)}
        >
          {isCollapsible && (
            <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} me-2`}></i>
          )}
          {row.item}
        </span>
      );
    } },
    { header: "MÃ SỐ", align: "center", width: "80px", render: (row: any) => (
      <span className={row.isLevel1 ? "fw-bold text-uppercase" : (row.isParent ? "fw-bold" : "")}>{row.code}</span>
    ) },
    { header: "THUYẾT MINH", align: "center", width: "120px", render: (row: any) => row.note || "" },
    { header: activeTab === "balance" ? "SỐ CUỐI KỲ" : "KỲ NÀY (VNĐ)", align: "right", width: "150px", render: (row: any) => (
      <span className={row.isLevel1 ? "fw-bold text-dark" : (row.isParent ? "fw-bold text-dark" : "text-dark")}>
        {(row.current || 0) < 0 ? (
          <span className="text-danger">({new Intl.NumberFormat("vi-VN").format(Math.abs(row.current || 0))})</span>
        ) : (
          new Intl.NumberFormat("vi-VN").format(row.current || 0)
        )}
      </span>
    ) },
    { header: activeTab === "balance" ? "SỐ ĐẦU KỲ" : "KỲ TRƯỚC (VNĐ)", align: "right", width: "150px", render: (row: any) => (
      <span className={row.isLevel1 ? "fw-bold text-dark" : (row.isParent ? "fw-bold text-dark" : "text-dark")}>
        {(row.previous || 0) < 0 ? (
          <span className="text-danger">({new Intl.NumberFormat("vi-VN").format(Math.abs(row.previous || 0))})</span>
        ) : (
          new Intl.NumberFormat("vi-VN").format(row.previous || 0)
        )}
      </span>
    ) }
  ];

  const formatValue = (val: number) => {
    if (!val) return "0";
    if (val < 0) return <span className="text-danger">({new Intl.NumberFormat("vi-VN").format(Math.abs(val))})</span>;
    return new Intl.NumberFormat("vi-VN").format(val);
  };

  const trialColumns = [
    { header: "Tài khoản", width: "100px", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""} style={{ paddingLeft: (row.level || 0) * 12 + "px" }}>{row.accountCode}</span> },
    { header: "TÊN TÀI KHOẢN", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""} style={{ paddingLeft: (row.level || 0) * 12 + "px" }}>{row.accountName}</span> },
    { header: "ĐẦU KỲ NỢ", align: "right", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""}>{formatValue(row.openingDebit)}</span> },
    { header: "ĐẦU KỲ CÓ", align: "right", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""}>{formatValue(row.openingCredit)}</span> },
    { header: "PHÁT SINH NỢ", align: "right", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""}>{formatValue(row.arisingDebit)}</span> },
    { header: "PHÁT SINH CÓ", align: "right", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""}>{formatValue(row.arisingCredit)}</span> },
    { header: "CUỐI KỲ NỢ", align: "right", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""}>{formatValue(row.closingDebit)}</span> },
    { header: "CUỐI KỲ CÓ", align: "right", render: (row: any) => <span className={row.isParent || row.accountName === "Cộng" ? "fw-bold" : ""}>{formatValue(row.closingCredit)}</span> },
  ];

  const renderTrialHeader = () => (
    <>
      <tr style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <th rowSpan={2} className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", borderBottom: "2px solid var(--border)", verticalAlign: "middle" }}>Tài khoản</th>
        <th rowSpan={2} className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", borderBottom: "2px solid var(--border)", verticalAlign: "middle" }}>TÊN TÀI KHOẢN</th>
        <th colSpan={2} className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>ĐẦU KỲ</th>
        <th colSpan={2} className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>PHÁT SINH</th>
        <th colSpan={2} className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>CUỐI KỲ</th>
      </tr>
      <tr>
        <th className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "2px solid var(--border)", top: "27px" }}>NỢ</th>
        <th className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "2px solid var(--border)", top: "27px" }}>CÓ</th>
        <th className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "2px solid var(--border)", top: "27px" }}>NỢ</th>
        <th className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "2px solid var(--border)", top: "27px" }}>CÓ</th>
        <th className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "2px solid var(--border)", top: "27px" }}>NỢ</th>
        <th className="text-uppercase" style={{ padding: "4px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "2px solid var(--border)", top: "27px" }}>CÓ</th>
      </tr>
    </>
  );

  return (
    <StandardPage
      title="Báo cáo tài chính"
      description="Tổng hợp báo cáo kết quả kinh doanh, dòng tiền và bảng cân đối kế toán tự động"
      icon="bi-file-earmark-bar-graph"
      color="blue"
      useCard={false}
    >
      <div className="bg-white rounded-4 shadow-sm border d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* -- FIXED HEADER AREA -- */}
        <div className="p-4 pb-0 flex-shrink-0">
          <div className="mb-2 pb-2 border-bottom">
            <ModernStepper 
              steps={REPORT_STEPS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingY={4}
            />
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex flex-column gap-1">
              <div className="d-flex align-items-center gap-3">
                <h5 className="mb-0 fw-bold">{REPORT_STEPS.find(s => s.num === currentStep)?.title}</h5>
                <span className="badge bg-light text-secondary border fw-normal">
                  <i className="bi-clock-history me-1"></i> 
                  Cập nhật: {new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
              {analysis && !isLoading && (
                 <div className="d-flex align-items-center gap-3 mt-1">
                   <span className="text-muted" style={{ fontSize: "12px" }}><i className="bi-robot me-1 text-primary"></i> {analysis.summary}</span>
                   <div className="d-flex align-items-center gap-2 ms-2" style={{ width: "200px" }}>
                     <span className="small text-muted" style={{ fontSize: "11px" }}>Điểm tín nhiệm:</span>
                     <div className="progress flex-grow-1" style={{ height: "6px" }}>
                       <div 
                         className={`progress-bar ${analysis.score >= 85 ? 'bg-success' : analysis.score >= 75 ? 'bg-primary' : analysis.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                         role="progressbar" 
                         style={{ width: `${analysis.score}%` }} 
                       ></div>
                     </div>
                     <span className={`small fw-bold ${analysis.score >= 85 ? 'text-success' : analysis.score >= 75 ? 'text-primary' : analysis.score >= 60 ? 'text-warning' : 'text-danger'}`}>{analysis.score}</span>
                   </div>
                 </div>
              )}
            </div>
            <div className="d-flex gap-2 align-self-start">
              <select 
                className="form-select form-select-sm shadow-sm rounded-pill" 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ width: "110px" }}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>Tháng {i+1}</option>
                ))}
                <option value={0}>Cả năm</option>
              </select>
              <select 
                className="form-select form-select-sm shadow-sm rounded-pill" 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ width: "90px" }}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
              <BrandButton icon="bi-download" color="success" className="btn-sm rounded-pill px-3">
                Xuất Excel
              </BrandButton>
            </div>
          </div>
        </div>

        {/* -- SCROLLABLE TABLE AREA -- */}
        <div className="p-4 pt-0 flex-grow-1 overflow-hidden d-flex flex-column" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary opacity-50" role="status"></div>
              <div className="mt-2 text-muted small">Đang tổng hợp dữ liệu thời gian thực...</div>
            </div>
          ) : (
            <Table 
              rows={(() => {
                if (activeTab === "trial") return reportData;
                if (activeTab !== "balance") return reportData;
                let currentSection = "";
                return reportData.filter(row => {
                  if (row.item === "TÀI SẢN" || row.item === "NGUỒN VỐN") {
                    currentSection = row.item;
                    return true;
                  }
                  if (row?.item?.startsWith("TỔNG CỘNG")) {
                    currentSection = "";
                    return true;
                  }
                  if (currentSection && collapsedSections[currentSection]) {
                    return false;
                  }
                  return true;
                });
              })()}
              columns={(activeTab === "trial") ? (trialColumns as any) : (columns as any)}
              renderHeader={activeTab === "trial" ? renderTrialHeader : undefined}
              loading={isLoading}
              stickyHeader
              compact
              wrapperStyle={{ height: "100%", overflowY: "auto" }}
              emptyText="Không có dữ liệu cho kỳ báo cáo này."
            />
          )}
        </div>
      </div>
    </StandardPage>
  );
}
