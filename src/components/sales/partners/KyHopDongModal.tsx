"use client";
import React, { useState, useEffect } from "react";

export interface KyHopDongModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: any;
  onSuccess: (updatedPartner: any) => void;
}

export function KyHopDongModal({ isOpen, onClose, partner, onSuccess }: KyHopDongModalProps) {
  const [khdContractNo, setKhdContractNo] = useState("");
  const [khdContractValue, setKhdContractValue] = useState<number>(0);
  const [khdMonthlyContractValue, setKhdMonthlyContractValue] = useState<number>(0);
  const [khdSignDate, setKhdSignDate] = useState("");
  const [khdContractStatus, setKhdContractStatus] = useState("Đã ký hợp đồng");
  const [khdCreditLimit, setKhdCreditLimit] = useState<number>(0);
  const [khdContractPdf, setKhdContractPdf] = useState("");
  
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingKyHopDong, setSavingKyHopDong] = useState(false);

  useEffect(() => {
    if (isOpen && partner) {
      setKhdContractNo(partner.contractNo || "");
      
      const annualVal = typeof partner.hdAnnualRevenue === 'string' 
        ? parseInt(partner.hdAnnualRevenue.replace(/\D/g, '')) 
        : (partner.contractValue || 0);
      setKhdContractValue(isNaN(annualVal) ? 0 : annualVal);
      
      const monthlyVal = typeof partner.hdMonthlyRevenue === 'string'
        ? parseInt(partner.hdMonthlyRevenue.replace(/\D/g, ''))
        : 0;
      setKhdMonthlyContractValue(isNaN(monthlyVal) ? 0 : monthlyVal);
      
      setKhdSignDate(partner.signDate || "");
      setKhdContractStatus(partner.contractStatus || "Đã ký hợp đồng");
      setKhdCreditLimit(partner.creditLimit || 0);
      setKhdContractPdf(partner.contractPdf || "");
    }
  }, [isOpen, partner]);

  const handleKhdPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Basic validation
    if (file.type !== "application/pdf") {
      alert("Chỉ chấp nhận file PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File vượt quá dung lượng 10MB");
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setKhdContractPdf(data.url);
      } else {
        alert("Lỗi tải file");
      }
    } catch (err) {
      console.error("Lỗi upload PDF", err);
      alert("Lỗi tải file");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSaveKyHopDong = async () => {
    if (!partner) return;
    setSavingKyHopDong(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: partner.id,
          contractNo: khdContractNo,
          contractValue: khdContractValue,
          hdAnnualRevenue: new Intl.NumberFormat("vi-VN").format(khdContractValue),
          hdMonthlyRevenue: new Intl.NumberFormat("vi-VN").format(khdMonthlyContractValue),
          creditLimit: khdCreditLimit,
          signDate: khdSignDate,
          contractStatus: khdContractStatus,
          contractPdf: khdContractPdf,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        onSuccess(returnedPartner);
      } else {
        alert("Không thể lưu thông tin hợp đồng!");
      }
    } catch (e) {
      console.error("Error saving contract details", e);
      alert("Lỗi khi lưu thông tin");
    } finally {
      setSavingKyHopDong(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)", zIndex: 3010 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark" style={{ fontSize: "16px" }}>Cập nhật Hợp đồng & Hạn mức</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body py-3">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Số hợp đồng</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={khdContractNo}
                    onChange={(e) => setKhdContractNo(e.target.value)}
                    placeholder="Nhập số hợp đồng..."
                  />
                </div>
                <div className="col-6">
                  <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Giá trị HĐ nguyên năm (VNĐ)</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={khdContractValue ? new Intl.NumberFormat("vi-VN").format(khdContractValue) : ""}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\./g, "").replace(/,/g, "");
                      if (!clean || isNaN(clean as any)) {
                        setKhdContractValue(0);
                      } else {
                        setKhdContractValue(parseInt(clean));
                      }
                    }}
                    placeholder="Ví dụ: 1.000.000.000"
                  />
                  <div className="text-muted small mt-1" style={{ fontSize: "11px" }}>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(khdContractValue || 0)}
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Giá trị cam kết tháng (VNĐ)</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={khdMonthlyContractValue ? new Intl.NumberFormat("vi-VN").format(khdMonthlyContractValue) : ""}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\./g, "").replace(/,/g, "");
                      if (!clean || isNaN(clean as any)) {
                        setKhdMonthlyContractValue(0);
                      } else {
                        setKhdMonthlyContractValue(parseInt(clean));
                      }
                    }}
                    placeholder="Ví dụ: 100.000.000"
                  />
                  <div className="text-muted small mt-1" style={{ fontSize: "11px" }}>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(khdMonthlyContractValue || 0)}
                  </div>
                </div>

                <div className="col-6">
                  <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Ngày ký hợp đồng</label>
                  <input
                    type="date"
                    className="form-control rounded-3"
                    value={khdSignDate}
                    onChange={(e) => setKhdSignDate(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Hạn mức công nợ (VNĐ)</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={khdCreditLimit ? new Intl.NumberFormat("vi-VN").format(khdCreditLimit) : ""}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\./g, "").replace(/,/g, "");
                      if (!clean || isNaN(clean as any)) {
                        setKhdCreditLimit(0);
                      } else {
                        setKhdCreditLimit(parseInt(clean));
                      }
                    }}
                    placeholder="Ví dụ: 50.000.000"
                  />
                  <div className="text-muted small mt-1" style={{ fontSize: "11px" }}>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(khdCreditLimit || 0)}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Bản scan/PDF hợp đồng</label>
                  <div className="rounded-3 p-3 text-center bg-light position-relative" style={{ border: "2px dashed #cbd5e1" }}>
                    {uploadingPdf ? (
                      <div className="py-2">
                        <span className="spinner-border spinner-border-sm text-primary me-2" role="status" aria-hidden="true" />
                        <span className="text-secondary small">Đang tải file lên...</span>
                      </div>
                    ) : khdContractPdf ? (
                      <div className="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                        <span className="text-success small fw-medium text-truncate me-2">
                          <i className="bi bi-file-earmark-pdf-fill text-danger me-1.5" />
                          {khdContractPdf.split("/").pop()}
                        </span>
                        <div className="d-flex gap-2">
                          <a href={khdContractPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary py-0.5 px-2" style={{ fontSize: 11 }}>
                            Xem tệp
                          </a>
                          <button type="button" className="btn btn-sm btn-outline-danger py-0.5 px-2" style={{ fontSize: 11 }} onClick={() => setKhdContractPdf("")}>
                            Xóa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <i className="bi bi-cloud-arrow-up text-secondary fs-3 mb-2 d-block" />
                        <label className="btn btn-sm btn-outline-secondary px-3 cursor-pointer" style={{ fontSize: 12 }}>
                          Chọn file PDF
                          <input
                            type="file"
                            accept="application/pdf"
                            className="d-none"
                            onChange={handleKhdPdfUpload}
                          />
                        </label>
                        <span className="text-muted d-block small mt-1" style={{ fontSize: 11 }}>Hỗ trợ định dạng PDF tối đa 10MB</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top-0 pt-0">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-3 px-4 py-2"
                style={{ fontSize: 13, fontWeight: 600 }}
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-warning rounded-3 px-4 py-2 text-dark"
                style={{ fontSize: 13, fontWeight: 600 }}
                disabled={savingKyHopDong || uploadingPdf}
                onClick={handleSaveKyHopDong}
              >
                {savingKyHopDong ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thông tin"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
