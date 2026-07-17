"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { SectionTitle } from "@/components/ui/SectionTitle";

const TAX_STEPS: ModernStepItem[] = [
  { num: 1, id: "GTGT", title: "Thuế GTGT", desc: "Mẫu 01/GTGT", icon: "bi-file-earmark-text" },
  { num: 2, id: "TNCN", title: "Thuế TNCN", desc: "Mẫu 05/KK-TNCN", icon: "bi-person-badge" },
  { num: 3, id: "TNDN", title: "Thuế TNDN", desc: "Mẫu 03/TNDN", icon: "bi-building" },
];

export default function TaxDeclarationsReportsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tncnUploaded, setTncnUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tncnData, setTncnData] = useState<{
    chiTieu16: number;
    chiTieu17: number;
    chiTieu21: number;
    chiTieu22: number;
    chiTieu24: number;
    chiTieu28: number;
    chiTieu31: number;
  } | null>(null);

  const [isSyncingTndn, setIsSyncingTndn] = useState(false);
  const [tndnData, setTndnData] = useState<{
    chiTieuA1: number;
    chiTieuB1: number;
    chiTieuB2: number;
    chiTieuB3: number;
    chiTieuB4: number;
    chiTieuB5: number;
    chiTieuB6: number;
    chiTieuB7: number;
    chiTieuB8: number;
    chiTieuB9: number;
    chiTieuB10: number;
    chiTieuB11: number;
    chiTieuB12: number;
    chiTieuC1: number;
    chiTieuC2: number;
    chiTieuC3: number;
    chiTieuC3a: number;
    chiTieuC3b: number;
    chiTieuC4: number;
    chiTieuC5: number;
    chiTieuC6: number;
    chiTieuC7: number;
    chiTieuC8: number;
    chiTieuG: number;
  } | null>(null);

  const activeTabId = TAX_STEPS.find(s => s.num === currentStep)?.id || "GTGT";

  // Mock data for TNDN AI Expense Auditor
  const [tndnExpenses, setTndnExpenses] = useState([
    { id: 1, account: "811", description: "Phạt vi phạm giao thông", amount: 2500000, reason: "Phạt hành chính (Không hợp lý)", status: "pending" },
    { id: 2, account: "642", description: "Chi phí tiếp khách vượt định mức", amount: 15000000, reason: "Hóa đơn vượt định mức quy định", status: "rejected" },
    { id: 3, account: "642", description: "Chi phí hội nghị khách hàng", amount: 50000000, reason: "Nghi ngờ thiếu hồ sơ chứng minh", status: "pending" },
  ]);

  const handleApproveExpense = (id: number) => {
    setTndnExpenses(prev => prev.map(e => e.id === id ? { ...e, status: "approved" } : e));
  };

  const handleRejectExpense = (id: number) => {
    setTndnExpenses(prev => prev.map(e => e.id === id ? { ...e, status: "rejected" } : e));
  };

  const handleFetchTNDN = async () => {
    setIsSyncingTndn(true);
    try {
      const res = await fetch("/api/finance/tax/tndn");
      const data = await res.json();
      if (data.success) {
        setTndnData(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingTndn(false);
    }
  };

  const handleUploadPayroll = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/finance/tax/tncn");
      const data = await res.json();
      if (data.success) {
        setTncnData(data.data);
        setTncnUploaded(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Tự động đồng bộ theo thời gian thực (10s/lần)
  useEffect(() => {
    let isMounted = true;

    const fetchRealtime = async () => {
      try {
        const resTncn = await fetch("/api/finance/tax/tncn");
        if (resTncn.ok) {
          const dataTncn = await resTncn.json();
          if (dataTncn.success && isMounted) {
            setTncnData(dataTncn.data);
            setTncnUploaded(true);
          }
        }

        const resTndn = await fetch("/api/finance/tax/tndn");
        if (resTndn.ok) {
          const dataTndn = await resTndn.json();
          if (dataTndn.success && isMounted) {
            setTndnData(dataTndn.data);
          }
        }
      } catch (e) {
        console.error("Realtime sync error:", e);
      }
    };

    fetchRealtime();
    const interval = setInterval(fetchRealtime, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const renderToolbar = () => {
    if (activeTabId === "GTGT") {
      return (
        <SectionTitle 
          title="Tờ khai Thuế Giá trị gia tăng (Mẫu 01/GTGT)" 
          icon="bi-file-earmark-text"
          className="mb-2"
          action={<span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill border border-success">Kỳ: Quý 2/2026</span>}
        />
      );
    }
    if (activeTabId === "TNCN") {
      return (
        <SectionTitle 
          title="Tờ khai Thuế Thu nhập cá nhân (Mẫu 05/KK-TNCN)" 
          icon="bi-person-badge"
          className="mb-2"
          action={<span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill border border-success">Kỳ: Quý 2/2026</span>}
        />
      );
    }
    if (activeTabId === "TNDN") {
      return (
        <SectionTitle 
          title={
            <div>
              <div>Tờ khai Quyết toán TNDN (Mẫu 03/TNDN)</div>
              <div className="text-muted text-transform-none mt-1 fw-normal" style={{ fontSize: "11px", letterSpacing: "normal" }}>AI Expense Auditor phát hiện chi phí rủi ro từ Sổ cái (TK 642, 811...)</div>
            </div>
          }
          icon="bi-building"
          className="mb-2 align-items-start"
          action={
            <div className="d-flex gap-2 align-items-center">
              <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={handleFetchTNDN} disabled={isSyncingTndn}>
                {isSyncingTndn ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-arrow-repeat me-1"></i>}
                Đồng bộ sổ cái
              </button>
              <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill border border-success">Kỳ: Năm 2026</span>
            </div>
          }
        />
      );
    }
    return null;
  };

  // handleUploadPayroll was moved up

  // customTickerNews was removed to allow API to fetch tax policies

  return (
    <StandardPage
      title="Lập tờ khai và báo cáo thuế"
      description="Hệ thống hỗ trợ lập tờ khai tự động bằng AI, đối chiếu hóa đơn, sổ cái và cảnh báo rủi ro"
      icon="bi-calculator"
      color="indigo"
      useCard={false}
      paddingClassName="px-4 pb-2 pt-1"
    >
      <div className="row g-4 d-flex h-100 flex-grow-1 overflow-hidden pb-4">
        {/* 2. Workspace */}
        <div className="col-lg-8 col-xl-9 d-flex flex-column h-100">
          <WorkflowCard
            contentPadding="px-4 pb-4 pt-2"
            stepper={
              <ModernStepper 
                steps={TAX_STEPS} 
                currentStep={currentStep} 
                onStepChange={setCurrentStep} 
                paddingX={0}
                paddingY={8}
              />
            }
            toolbar={renderToolbar()}
          >
            {activeTabId === "GTGT" && (
              <>
                <div className="w-100">
                  <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                    <thead className="table-light text-center sticky-top z-1">
                      <tr>
                        <th style={{ width: "10%" }}>Chỉ tiêu</th>
                        <th style={{ width: "40%" }}>Nội dung</th>
                        <th style={{ width: "25%" }}>Giá trị (VNĐ)</th>
                        <th style={{ width: "25%" }}>Nguồn dữ liệu</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-center fw-bold">[22]</td>
                        <td>Thuế GTGT còn được khấu trừ kỳ trước chuyển sang</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr className="table-primary text-primary fw-bold">
                        <td colSpan={4}>I. Hàng hóa, dịch vụ mua vào trong kỳ</td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light" title="Click để xem chi tiết hóa đơn">
                        <td className="text-center fw-bold">[23]</td>
                        <td>Giá trị của hàng hoá, dịch vụ mua vào</td>
                        <td className="text-end fw-medium text-dark">5,250,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light position-relative">
                        <td className="text-center fw-bold">[24]</td>
                        <td>Thuế GTGT của hàng hoá, dịch vụ mua vào</td>
                        <td className="text-end fw-medium text-danger">525,000,001</td>
                        <td className="text-center">
                          <span className="badge bg-warning-subtle text-warning border border-warning"><i className="bi bi-exclamation-triangle me-1"></i>Lệch 1đ</span>
                        </td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[25]</td>
                        <td>Tổng số thuế GTGT được khấu trừ kỳ này</td>
                        <td className="text-end fw-medium text-dark">525,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr className="table-success text-success fw-bold">
                        <td colSpan={4}>II. Hàng hóa, dịch vụ bán ra trong kỳ</td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[26]</td>
                        <td>Hàng hóa, dịch vụ bán ra không chịu thuế GTGT</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[27]</td>
                        <td>Hàng hóa, dịch vụ bán ra chịu thuế suất 0%</td>
                        <td className="text-end fw-medium text-dark">1,200,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[28]</td>
                        <td>Hàng hóa, dịch vụ bán ra chịu thuế suất 5% (Giá trị)</td>
                        <td className="text-end fw-medium text-dark">850,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[29]</td>
                        <td>Thuế GTGT của HHDV bán ra chịu thuế suất 5%</td>
                        <td className="text-end fw-medium text-dark">42,500,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[30]</td>
                        <td>Hàng hóa, dịch vụ bán ra chịu thuế suất 10% (Giá trị)</td>
                        <td className="text-end fw-medium text-dark">8,500,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[31]</td>
                        <td>Thuế GTGT của HHDV bán ra chịu thuế suất 10%</td>
                        <td className="text-end fw-medium text-dark">850,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[32]</td>
                        <td>Hàng hoá, dịch vụ bán ra chịu thuế suất 8% (Giá trị)</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[32a]</td>
                        <td>Hàng hóa, dịch vụ bán ra không tính thuế</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-robot me-1"></i>Auto-Fill</span></td>
                      </tr>
                      <tr className="table-primary text-primary fw-bold">
                        <td colSpan={4}>III. Xác định nghĩa vụ thuế GTGT phải nộp</td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[34]</td>
                        <td>Tổng doanh thu của hàng hóa, dịch vụ bán ra</td>
                        <td className="text-end fw-medium text-dark">10,550,000,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[35]</td>
                        <td>Tổng số thuế GTGT của HHDV bán ra</td>
                        <td className="text-end fw-medium text-dark">892,500,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[36]</td>
                        <td>Thuế GTGT phát sinh trong kỳ</td>
                        <td className="text-end fw-medium text-dark">367,500,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[37]</td>
                        <td>Điều chỉnh giảm thuế GTGT của các kỳ trước</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[38]</td>
                        <td>Điều chỉnh tăng thuế GTGT của các kỳ trước</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[39a]</td>
                        <td>Thuế GTGT nhận bàn giao từ dự án đầu tư</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light table-warning">
                        <td className="text-center fw-bold text-danger fs-6">[40a]</td>
                        <td className="fw-bold fs-6">Thuế GTGT phải nộp của hoạt động SXKD trong kỳ</td>
                        <td className="text-end fw-bold text-danger fs-6">367,500,000</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                      </tr>
                      <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                        <td className="text-center fw-bold">[43]</td>
                        <td>Thuế GTGT còn được khấu trừ chuyển kỳ sau</td>
                        <td className="text-end fw-medium text-dark">0</td>
                        <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTabId === "TNCN" && (
              <>
                {!tncnUploaded ? (
                  <div className="text-center py-5 border rounded-3 bg-light" style={{ borderStyle: "dashed !important" }}>
                    <div className="mb-3 text-primary">
                      <i className="bi bi-database-check" style={{ fontSize: "3rem" }}></i>
                    </div>
                    <h6 className="fw-bold mb-2">Đồng bộ Bảng lương từ hệ thống HR</h6>
                    <p className="text-muted small mb-4">Tự động liên kết và trích xuất dữ liệu bảng lương tháng/quý từ phân hệ Nhân sự</p>
                    <button className="btn btn-primary px-4" onClick={handleUploadPayroll} disabled={isProcessing}>
                      {isProcessing ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Đang đồng bộ dữ liệu...</>
                      ) : (
                        <><i className="bi bi-arrow-repeat me-2"></i>Đồng bộ dữ liệu HR</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="animate__animated animate__fadeIn">
                    <div className="alert alert-success d-flex align-items-center mb-4">
                      <i className="bi bi-check-circle-fill fs-4 me-3"></i>
                      <div>
                        <strong>Đồng bộ thành công!</strong> Đã liên kết và trích xuất dữ liệu từ Bảng lương HR Quý 2/2026.
                      </div>
                      <button className="btn btn-sm btn-outline-success ms-auto" onClick={() => setTncnUploaded(false)}>Đồng bộ lại</button>
                    </div>

                    <div className="w-100">
                      <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                        <thead className="table-light text-center sticky-top z-1">
                          <tr>
                            <th style={{ width: "10%" }}>Chỉ tiêu</th>
                            <th style={{ width: "40%" }}>Nội dung</th>
                            <th style={{ width: "25%" }}>Giá trị (VNĐ)</th>
                            <th style={{ width: "25%" }}>Nguồn dữ liệu</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="table-primary text-primary fw-bold">
                            <td colSpan={4}>I. Tổng số người lao động</td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[16]</td>
                            <td>Tổng số người lao động</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu16 || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[17]</td>
                            <td className="ps-4">- Cá nhân cư trú có hợp đồng lao động</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu17 || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[18]</td>
                            <td className="ps-4">- Cá nhân không cư trú</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[19]</td>
                            <td>Tổng số cá nhân đã khấu trừ thuế</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[20]</td>
                            <td className="ps-4">- Cá nhân cư trú</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[21]</td>
                            <td className="ps-4">- Cá nhân không cư trú</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                          
                          <tr className="table-primary text-primary fw-bold">
                            <td colSpan={4}>II. Thu nhập chịu thuế trả cho cá nhân</td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[22]</td>
                            <td>Tổng thu nhập chịu thuế trả cho cá nhân</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu21?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[23]</td>
                            <td className="ps-4">- Cá nhân cư trú</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu21?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[24]</td>
                            <td className="ps-5">Trong đó: Có hợp đồng lao động</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu22?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[25]</td>
                            <td className="ps-4">- Cá nhân không cư trú</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[26]</td>
                            <td>Tổng TNCT từ tiền phí mua bảo hiểm nhân thọ</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[27]</td>
                            <td>Tổng TNCT trả cho cá nhân thuộc diện khấu trừ thuế</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu24?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[28]</td>
                            <td className="ps-4">- Cá nhân cư trú</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu24?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[29]</td>
                            <td className="ps-4">- Cá nhân không cư trú</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>

                          <tr className="table-primary text-primary fw-bold">
                            <td colSpan={4}>III. Số thuế thu nhập cá nhân đã khấu trừ</td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light table-warning">
                            <td className="text-center fw-bold text-danger fs-6">[30]</td>
                            <td className="fw-bold fs-6">Tổng số thuế TNCN đã khấu trừ</td>
                            <td className="text-end fw-bold text-danger fs-6">{tncnData?.chiTieu28?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[31]</td>
                            <td className="ps-4">- Cá nhân cư trú</td>
                            <td className="text-end fw-medium text-dark">{tncnData?.chiTieu31?.toLocaleString() || 0}</td>
                            <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-database me-1"></i>Hệ thống HR</span></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[32]</td>
                            <td className="ps-4">- Cá nhân không cư trú</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                          <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                            <td className="text-center fw-bold">[33]</td>
                            <td>Tổng thuế TNCN từ phí bảo hiểm nhân thọ</td>
                            <td className="text-end fw-medium text-dark">0</td>
                            <td className="text-center"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTabId === "TNDN" && (
              <>
                <h6 className="fw-bold mb-3"><i className="bi bi-robot text-primary me-2"></i>Danh sách chi phí nghi ngờ không hợp lệ</h6>
                <div className="w-100">
                  <table className="table table-bordered align-middle" style={{ fontSize: "13px" }}>
                    <thead className="table-light sticky-top z-1">
                      <tr>
                        <th>TK</th>
                        <th>Nội dung chi phí</th>
                        <th className="text-end">Số tiền (VNĐ)</th>
                        <th>Lý do từ AI</th>
                        <th className="text-center" style={{ width: "180px" }}>Phê duyệt (B4)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tndnExpenses.map(expense => (
                        <tr key={expense.id}>
                          <td className="fw-bold text-center">{expense.account}</td>
                          <td>{expense.description}</td>
                          <td className="text-end fw-medium">{expense.amount.toLocaleString()}</td>
                          <td className="text-danger small"><i className="bi bi-exclamation-triangle me-1"></i>{expense.reason}</td>
                          <td>
                            {expense.status === "pending" ? (
                              <div className="d-flex justify-content-center gap-2">
                                <button className="btn btn-sm btn-outline-success" onClick={() => handleApproveExpense(expense.id)} title="Chấp nhận là chi phí hợp lý">
                                  <i className="bi bi-check-lg"></i>
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleRejectExpense(expense.id)} title="Đưa vào chỉ tiêu [B4]">
                                  Loại bỏ
                                </button>
                              </div>
                            ) : expense.status === "rejected" ? (
                              <span className="badge bg-danger w-100 d-block py-2">Đã loại ([B4])</span>
                            ) : (
                              <span className="badge bg-success w-100 d-block py-2">Hợp lệ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info d-flex mt-4 border-0 shadow-sm">
                  <i className="bi bi-info-circle-fill fs-4 text-info me-3 mt-1"></i>
                  <div>
                    <h6 className="fw-bold mb-1">Tự động chuyển lỗ (Phụ lục 03-2A/TNDN)</h6>
                    <span className="small">Hệ thống ghi nhận năm 2025 có khoản lỗ <strong>150,000,000đ</strong>. Đã tự động kết chuyển vào chỉ tiêu <strong>[C3]</strong> để giảm trừ thuế TNDN năm nay.</span>
                  </div>
                </div>

                {tndnData && (
                  <div className="w-100 mt-4 animate__animated animate__fadeIn">
                    <h6 className="fw-bold mb-3"><i className="bi bi-calculator text-primary me-2"></i>Bảng kê khai tính thuế TNDN</h6>
                    <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                      <thead className="table-light text-center sticky-top z-1">
                        <tr>
                          <th style={{ width: "10%" }}>Chỉ tiêu</th>
                          <th style={{ width: "50%" }}>Nội dung</th>
                          <th style={{ width: "25%" }}>Giá trị (VNĐ)</th>
                          <th style={{ width: "15%" }}>Nguồn</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="table-primary text-primary fw-bold">
                          <td colSpan={4}>A. Kết quả hoạt động kinh doanh</td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[A1]</td>
                          <td>Tổng lợi nhuận kế toán trước thuế TNDN</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuA1.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-book me-1"></i>Sổ cái</span></td>
                        </tr>
                        
                        <tr className="table-primary text-primary fw-bold">
                          <td colSpan={4}>B. Xác định thu nhập tính thuế</td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B1]</td>
                          <td>Điều chỉnh tăng lợi nhuận kế toán trước thuế (tổng)</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB1.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B2]</td>
                          <td className="ps-4">- Điều chỉnh tăng doanh thu</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB2.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B3]</td>
                          <td className="ps-4">- Chi phí của phần doanh thu điều chỉnh giảm</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB3.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold text-danger">[B4]</td>
                          <td className="ps-4">- Các khoản chi không được trừ khi xác định thu nhập chịu thuế</td>
                          <td className="text-end fw-medium text-danger">{tndnData.chiTieuB4.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-danger-subtle text-danger border border-danger"><i className="bi bi-robot me-1"></i>AI Filter</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B5]</td>
                          <td className="ps-4">- Thuế TNDN đã nộp ở nước ngoài được trừ trong kỳ</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB5.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B6]</td>
                          <td className="ps-4">- Điều chỉnh tăng lợi nhuận do xác định giá giao dịch liên kết</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB6.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B7]</td>
                          <td className="ps-4">- Các khoản điều chỉnh tăng khác</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB7.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B8]</td>
                          <td>Điều chỉnh giảm lợi nhuận kế toán trước thuế (tổng)</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB8.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B9]</td>
                          <td className="ps-4">- Giảm trừ các khoản doanh thu đã tính thuế năm trước</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB9.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B10]</td>
                          <td className="ps-4">- Chi phí của phần doanh thu điều chỉnh tăng</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB10.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B11]</td>
                          <td className="ps-4">- Chi phí lãi vay không được trừ kỳ trước được chuyển sang kỳ này</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB11.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[B12]</td>
                          <td className="ps-4">- Các khoản điều chỉnh giảm khác</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuB12.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>

                        <tr className="table-primary text-primary fw-bold">
                          <td colSpan={4}>C. Thu nhập tính thuế</td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C1]</td>
                          <td>Thu nhập chịu thuế (C1 = A1 + B1 - B8)</td>
                          <td className="text-end fw-bold text-dark">{tndnData.chiTieuC1.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C2]</td>
                          <td>Thu nhập miễn thuế</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC2.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C3]</td>
                          <td>Chuyển lỗ từ các hoạt động sản xuất kinh doanh (C3 = C3a + C3b)</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC3.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-clock-history me-1"></i>Năm trước</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C3a]</td>
                          <td className="ps-4">- Lỗ từ hoạt động SXKD được chuyển trong kỳ</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC3a.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C3b]</td>
                          <td className="ps-4">- Lỗ từ hoạt động chuyển nhượng BĐS được chuyển trong kỳ</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC3b.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C4]</td>
                          <td>Thu nhập tính thuế (C4 = C1 - C2 - C3)</td>
                          <td className="text-end fw-bold text-dark">{tndnData.chiTieuC4.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C5]</td>
                          <td>Thu nhập tính thuế làm căn cứ trích quỹ phát triển KH&CN</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC5.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C6]</td>
                          <td>Trích lập quỹ phát triển KH&CN</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC6.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C7]</td>
                          <td>Thu nhập tính thuế sau khi trích lập quỹ (C7 = C4 - C5 - C6)</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC7.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light">
                          <td className="text-center fw-bold">[C8]</td>
                          <td>Thuế TNDN phải nộp từ hoạt động SXKD (C8 = C7 x 20%)</td>
                          <td className="text-end fw-medium text-dark">{tndnData.chiTieuC8.toLocaleString()}</td>
                          <td className="text-center"></td>
                        </tr>
                        
                        <tr className="table-primary text-primary fw-bold">
                          <td colSpan={4}>G. Tổng số thuế TNDN phải nộp</td>
                        </tr>
                        <tr style={{ cursor: "pointer" }} className="hover-bg-light table-warning">
                          <td className="text-center fw-bold text-danger fs-6">[G]</td>
                          <td className="fw-bold fs-6">Tổng số thuế TNDN phải nộp</td>
                          <td className="text-end fw-bold text-danger fs-6">{tndnData.chiTieuG.toLocaleString()}</td>
                          <td className="text-center"><span className="badge bg-light text-primary border"><i className="bi bi-calculator me-1"></i>Tự động</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </WorkflowCard>
        </div>

        {/* 3. Action Panel */}
        <div className="col-lg-4 col-xl-3 d-flex flex-column h-100">
          <div className="app-card border-0 shadow-sm h-100 d-flex flex-column bg-light">
            <div className="card-body p-4 d-flex flex-column h-100">
              <h6 className="fw-bold mb-4 text-uppercase border-bottom pb-2">Hành động & Cảnh báo</h6>

              <div className="mb-4">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-shield-check text-success fs-5 me-2"></i>
                  <span className="fw-bold">Validation File .xsd</span>
                </div>
                <div className="progress" style={{ height: "8px" }}>
                  <div className="progress-bar bg-warning" role="progressbar" style={{ width: "85%" }}></div>
                </div>
                <div className="text-muted small mt-2">Chờ kế toán xác nhận số liệu</div>
              </div>

              <div className="alert border bg-white mb-4 shadow-sm flex-grow-1" style={{ borderColor: "#f59e0b !important" }}>
                <div className="fw-bold text-warning mb-2"><i className="bi bi-exclamation-circle-fill me-2"></i>Cảnh báo rủi ro (AI Alert)</div>
                <ul className="small text-dark mb-0 ps-3" style={{ lineHeight: "1.6" }}>
                  <li className="mb-1"><strong>GTGT:</strong> Lệch 1đ tại chỉ tiêu [24] so với bảng kê hóa đơn gốc.</li>
                  <li className="mb-1"><strong>TNCN:</strong> Phát hiện 2 MST không tồn tại (NV Thử việc).</li>
                  <li><strong>TNDN:</strong> Có 2 khoản chi phí chờ phê duyệt tính hợp lý.</li>
                </ul>
              </div>

              <div className="mt-auto">
                <button className="btn btn-outline-primary w-100 mb-3 fw-medium d-flex align-items-center justify-content-center py-2" style={{ backgroundColor: "white" }}>
                  <i className="bi bi-file-earmark-spreadsheet fs-5 me-2"></i>
                  <span>Tải Excel Đối Chiếu<br/><small className="fw-normal text-muted">(Báo cáo nội bộ)</small></span>
                </button>
                
                <button className="btn btn-success w-100 fw-bold d-flex align-items-center justify-content-center py-3 shadow-sm" disabled>
                  <i className="bi bi-file-earmark-code fs-4 me-2"></i>
                  <span>Xuất file XML<br/><small className="fw-normal text-white-50">(Nộp Tổng cục Thuế)</small></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardPage>
  );
}
