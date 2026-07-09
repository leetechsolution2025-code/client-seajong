import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface ExpenseRow {
  id: string;
  tenChiPhi: string;
  soTien: number;
}

export function ExpensePaymentModal({
  isOpen,
  onClose,
  expense,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRow | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const toast = useToast();

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/board/finance-accounting/expenses/${expense.id}/pay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngayChiTra: paymentDate,
          nguoiChiTra: "Hệ thống" // or allow user to input
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Thành công", "Đã lập phiếu chi thành công");
        onSuccess();
        onClose();
      } else {
        toast.error("Lỗi", json.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Lỗi", "Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (val: number) => new Intl.NumberFormat("vi-VN").format(val);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow-lg border-0 rounded-4">
            <div className="modal-header border-bottom bg-light">
              <h5 className="modal-title fw-bold text-dark mb-0">Lập phiếu chi / Thanh toán</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label text-muted fw-medium" style={{ fontSize: 13 }}>Khoản chi</label>
                  <input type="text" className="form-control bg-light" value={expense.tenChiPhi} readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-medium" style={{ fontSize: 13 }}>Số tiền</label>
                  <input type="text" className="form-control bg-light font-monospace text-danger fw-bold" value={`${formatVnd(expense.soTien)} VNĐ`} readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-medium" style={{ fontSize: 13 }}>Ngày thực chi <span className="text-danger">*</span></label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={paymentDate} 
                    onChange={e => setPaymentDate(e.target.value)} 
                    required 
                    disabled={loading}
                  />
                  <small className="text-muted d-block mt-1">
                    Ngày thực chi sẽ quyết định khoản chi phí này nằm ở tháng nào trên báo cáo.
                  </small>
                </div>
              </div>
              <div className="modal-footer bg-light border-top">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={loading}>
                  {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                  Xác nhận chi
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
