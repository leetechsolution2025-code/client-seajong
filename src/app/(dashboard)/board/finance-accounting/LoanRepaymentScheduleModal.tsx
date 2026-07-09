import React, { useState, useEffect } from "react";
const formatVnd = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val);
};
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

interface ProjectionRow {
  id: string;
  contractNumber: string;
  bankName: string;
  loanType: string;
  repaymentMethod: string;
  remainingPrincipal: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
}

export function LoanRepaymentScheduleModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectionRow[]>([]);
  const [targetMonth, setTargetMonth] = useState(0);
  const [targetYear, setTargetYear] = useState(0);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
      fetch("/api/company")
        .then(res => res.json())
        .then(data => { if (data && data.name) setCompanyInfo(data); })
        .catch(console.error);
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/board/finance-accounting/bank-loans/projection");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTargetMonth(json.targetMonth);
        setTargetYear(json.targetYear);
      } else {
        toast.error("Lỗi", json.error || "Không thể tải dữ liệu");
      }
    } catch (error) {
      toast.error("Lỗi", "Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPrincipal = data.reduce((sum, r) => sum + r.principalPayment, 0);
  const totalInterest = data.reduce((sum, r) => sum + r.interestPayment, 0);
  const totalPayment = data.reduce((sum, r) => sum + r.totalPayment, 0);

  const handleSendPaymentRequest = async (row: ProjectionRow) => {
    try {
      const res = await fetch("/api/board/finance-accounting/expenses/generate-from-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: row.id,
          principalPayment: row.principalPayment,
          interestPayment: row.interestPayment,
          totalPayment: row.totalPayment,
          month: targetMonth,
          year: targetYear
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Thành công", "Đã đưa khoản vay vào danh sách Chi phí chờ thanh toán");
      } else {
        toast.error("Lỗi", json.error || "Không thể tạo yêu cầu chi");
      }
    } catch (e) {
      toast.error("Lỗi", "Đã xảy ra lỗi kết nối");
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-fullscreen modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content shadow-lg border-0 rounded-0">
            <div className="modal-header border-bottom bg-light">
              <div className="d-flex flex-column">
                <h5 className="modal-title fw-bold text-dark mb-0">Lịch trả nợ dự kiến</h5>
                {targetMonth > 0 && (
                  <small className="text-muted fw-bold text-uppercase">Kế hoạch thanh toán cho Tháng {targetMonth}/{targetYear}</small>
                )}
              </div>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            <div className="modal-body p-0" style={{ backgroundColor: "#f8f9fa" }}>
              {loading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tính toán...</span>
                  </div>
                </div>
              ) : data.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-check-circle text-success fs-1 mb-2 d-block"></i>
                  Không có khoản phải thanh toán nào trong tháng tới.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover table-bordered mb-0" style={{ fontSize: 13 }}>
                    <thead className="table-light">
                      <tr className="text-center align-middle">
                        <th style={{ width: 50 }}>STT</th>
                        <th style={{ width: "25%" }}>Khoản vay</th>
                        <th>Dư nợ hiện tại (VNĐ)</th>
                        <th>Gốc phải trả (VNĐ)</th>
                        <th>Lãi dự tính (VNĐ)</th>
                        <th>Tổng thanh toán (VNĐ)</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {data.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="text-center align-middle text-muted">{idx + 1}</td>
                          <td className="align-middle">
                            <div className="fw-bold text-uppercase text-dark">{row.bankName}</div>
                            <div className="text-primary fw-medium mb-0">{row.contractNumber}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              {row.loanType === "vay_the_chap" ? "Vay thế chấp" : row.loanType === "vay_tin_chap" ? "Vay tín chấp" : row.loanType === "vay_von_luu_dong" ? "Vay vốn lưu động" : row.loanType === "vay_tra_gop" ? "Vay trả góp" : row.loanType} 
                              {" • "}
                              {row.repaymentMethod === "tra_deu" ? "Trả đều" : row.repaymentMethod === "tra_gop_deu" ? "Trả góp đều" : row.repaymentMethod === "goc_deu_lai_giam" ? "Gốc đều, lãi giảm dần" : row.repaymentMethod === "goc_lai_cuoi_ky" ? "Gốc & lãi cuối kỳ" : row.repaymentMethod === "lai_hang_thang_goc_cuoi_ky" ? "Lãi hàng tháng, gốc cuối kỳ" : row.repaymentMethod}
                            </div>
                          </td>
                          <td className="text-end align-middle font-monospace text-muted">{formatVnd(row.remainingPrincipal)}</td>
                          <td className="text-end align-middle font-monospace">{formatVnd(row.principalPayment)}</td>
                          <td className="text-end align-middle font-monospace text-warning fw-semibold">{formatVnd(row.interestPayment)}</td>
                          <td className="text-end align-middle font-monospace fw-bold text-danger">{formatVnd(row.totalPayment)}</td>
                          <td className="text-center align-middle">
                            <button 
                              className="btn btn-sm btn-outline-primary py-0"
                              style={{ fontSize: 11 }}
                              onClick={() => handleSendPaymentRequest(row)}
                            >
                              Gửi YC chi
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan={3} className="text-end fw-bold">Tổng cộng:</td>
                        <td className="text-end font-monospace fw-bold">{formatVnd(totalPrincipal)}</td>
                        <td className="text-end font-monospace fw-bold text-warning">{formatVnd(totalInterest)}</td>
                        <td className="text-end font-monospace fw-bold text-danger fs-6">{formatVnd(totalPayment)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            
            <div className="modal-footer border-top bg-white">
              <button type="button" className="btn btn-light border fw-medium" onClick={onClose}>Đóng</button>
              <button 
                type="button" 
                className="btn btn-primary d-flex align-items-center gap-2 fw-medium" 
                disabled={loading || data.length === 0}
                onClick={() => setShowPrintModal(true)}
              >
                <i className="bi bi-download"></i> Xuất báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <PrintPreviewModal
          title="LỊCH TRẢ NỢ DỰ KIẾN"
          subtitle={`Tháng ${targetMonth}/${targetYear}`}
          onClose={() => setShowPrintModal(false)}
          actions={
            <button className="btn btn-primary btn-sm fw-bold px-4" onClick={() => printDocumentById("loan-repayment-schedule-print")}>
              <i className="bi bi-printer-fill me-2" /> In Báo Cáo
            </button>
          }
          document={
            <div id="loan-repayment-schedule-print" className="bg-white mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "20mm 12mm", boxSizing: "border-box" }}>
              <div style={{ display: "flex", gap: "15px", alignItems: "center", borderBottom: "1px solid #dee2e6", paddingBottom: "15px", marginBottom: "25px" }}>
                {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "45px", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                <div>
                  <h1 style={{ margin: 0, fontSize: "15px", fontWeight: 800, textTransform: "uppercase", color: "#003087" }}>
                    {companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
                  </h1>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    {companyInfo?.slogan || "Kinh doanh thiết bị phòng tắm, nhà bếp"}
                  </p>
                </div>
              </div>

              <h3 className="text-center fw-bold mb-1" style={{ fontSize: "20px", textTransform: "uppercase" }}>LỊCH TRẢ NỢ DỰ KIẾN</h3>
              <p className="text-center text-muted fw-bold text-uppercase mb-4" style={{ fontSize: "14px" }}>Tháng {targetMonth}/{targetYear}</p>
              
              <table className="table table-bordered align-middle" style={{ fontSize: 13, width: "100%" }}>
                <thead className="table-light">
                  <tr className="text-center align-middle">
                    <th style={{ width: 50 }}>STT</th>
                    <th style={{ width: "30%" }}>Khoản vay</th>
                    <th>Dư nợ hiện tại (VNĐ)</th>
                    <th>Gốc phải trả (VNĐ)</th>
                    <th>Lãi dự tính (VNĐ)</th>
                    <th>Tổng thanh toán (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-center text-muted align-middle">{idx + 1}</td>
                      <td className="align-middle">
                        <div className="fw-bold text-uppercase text-dark">{row.bankName}</div>
                        <div className="fw-medium">{row.contractNumber}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {row.loanType === "vay_the_chap" ? "Vay thế chấp" : row.loanType === "vay_tin_chap" ? "Vay tín chấp" : row.loanType === "vay_von_luu_dong" ? "Vay vốn lưu động" : row.loanType === "vay_tra_gop" ? "Vay trả góp" : row.loanType} 
                          {" • "}
                          {row.repaymentMethod === "tra_deu" ? "Trả đều" : row.repaymentMethod === "tra_gop_deu" ? "Trả góp đều" : row.repaymentMethod === "goc_deu_lai_giam" ? "Gốc đều, lãi giảm dần" : row.repaymentMethod === "goc_lai_cuoi_ky" ? "Gốc & lãi cuối kỳ" : row.repaymentMethod === "lai_hang_thang_goc_cuoi_ky" ? "Lãi hàng tháng, gốc cuối kỳ" : row.repaymentMethod}
                        </div>
                      </td>
                      <td className="text-end font-monospace">{formatVnd(row.remainingPrincipal)}</td>
                      <td className="text-end font-monospace">{formatVnd(row.principalPayment)}</td>
                      <td className="text-end font-monospace">{formatVnd(row.interestPayment)}</td>
                      <td className="text-end font-monospace fw-bold">{formatVnd(row.totalPayment)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan={3} className="text-end fw-bold">Tổng cộng:</td>
                    <td className="text-end font-monospace fw-bold">{formatVnd(totalPrincipal)}</td>
                    <td className="text-end font-monospace fw-bold">{formatVnd(totalInterest)}</td>
                    <td className="text-end font-monospace fw-bold">{formatVnd(totalPayment)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }
        />
      )}
    </>
  );
}
