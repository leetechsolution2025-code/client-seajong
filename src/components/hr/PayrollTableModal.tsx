"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { Table } from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";

interface PayrollTableModalProps {
  open: boolean;
  onClose: () => void;
  month: number;
  year: number;
}

export function PayrollTableModal({ open, onClose, month, year }: PayrollTableModalProps) {
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [standardWorkDays, setStandardWorkDays] = useState(26);
  const [selectedDept, setSelectedDept] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const { error: toastError, success } = useToast();

  const loadData = () => {
    setLoading(true);
    fetch(`/api/hr/payroll/send-accounting/details?month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          toastError("Lỗi", json.error);
          onClose();
        } else {
          setEmployees(json.employeePayrolls ?? []);
          setStandardWorkDays(json.standardWorkDays ?? 26);
        }
      })
      .catch((err) => {
        console.error(err);
        toastError("Lỗi", "Không thể lấy dữ liệu bảng lương.");
        onClose();
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, month, year]);

  if (!open) return null;

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const matchDept = !selectedDept || emp.departmentName === selectedDept;
    const matchQuery = !searchQuery || emp.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchQuery;
  });

  // Unique departments for filter dropdown
  const uniqueDepartments = Array.from(
    new Set(employees.map((emp) => emp.departmentName).filter(Boolean))
  ) as string[];

  // Totals calculations based on filtered list
  const filteredTotalBase = filteredEmployees.reduce((sum, e) => sum + (e.baseSalary || 0), 0);
  const filteredTotalDays = filteredEmployees.reduce((sum, e) => sum + (e.cong || 0), 0);
  const filteredTotalAllowances = filteredEmployees.reduce((sum, e) => sum + (e.allowances || 0), 0);
  const filteredTotalDeductions = filteredEmployees.reduce((sum, e) => sum + (e.khauTruBH || 0), 0);
  const filteredTotalOt = filteredEmployees.reduce((sum, e) => sum + (e.otSalary || 0), 0);
  const filteredTotalNet = filteredEmployees.reduce((sum, e) => sum + (e.net || 0), 0);

  const columns = [
    {
      header: "NHÂN VIÊN",
      align: "left" as const,
      render: (row: any) => {
        if (row.isTotalRow) {
          return <span className="fw-bold text-dark">TỔNG CỘNG</span>;
        }
        return (
          <div>
            <div className="fw-bold text-dark">{row.fullName}</div>
            <div className="text-muted small mt-0.5" style={{ fontSize: "10px" }}>{row.positionName}</div>
          </div>
        );
      }
    },
    {
      header: "LƯƠNG CB",
      align: "right" as const,
      render: (row: any) => {
        const val = row.baseSalary;
        return <span className={row.isTotalRow ? "fw-bold text-dark" : "fw-medium"}>{val.toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "NGÀY CÔNG",
      align: "center" as const,
      render: (row: any) => {
        const val = row.cong;
        return <span className={row.isTotalRow ? "fw-bold text-dark" : "fw-medium"}>{val.toFixed(1)}{row.isTotalRow ? " công" : ""}</span>;
      }
    },
    {
      header: "PHỤ CẤP",
      align: "right" as const,
      render: (row: any) => {
        const val = row.allowances;
        return <span className={row.isTotalRow ? "fw-bold text-dark" : "fw-medium"}>{val.toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "KHẤU TRỪ BH",
      align: "right" as const,
      render: (row: any) => {
        const val = row.khauTruBH;
        return <span className={cn("text-danger", row.isTotalRow ? "fw-bold" : "fw-medium")}>{Math.round(val).toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "TĂNG CA (OT)",
      align: "right" as const,
      render: (row: any) => {
        if (row.isTotalRow) {
          return <span className="fw-bold text-warning">{filteredTotalOt > 0 ? Math.round(filteredTotalOt).toLocaleString("vi-VN") : "—"}</span>;
        }
        return (
          <span className="fw-medium text-warning">
            {row.otHours > 0 ? (
              <span>
                {row.otHours.toFixed(1)}h ({Math.round(row.otSalary).toLocaleString("vi-VN")})
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </span>
        );
      }
    },
    {
      header: "THỰC LĨNH",
      align: "right" as const,
      render: (row: any) => {
        const val = row.net;
        return <span className={cn("text-success", row.isTotalRow ? "fw-bold fs-6" : "fw-bold")}>{Math.round(val).toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "TRẠNG THÁI",
      align: "center" as const,
      render: (row: any) => {
        if (row.isTotalRow) return null;
        return (
          <span 
            className="badge px-2.5 py-0.5 rounded-pill border"
            style={{ 
              fontSize: "10px",
              backgroundColor: row.statusText === "Kế toán đã duyệt" ? "rgba(99, 102, 241, 0.12)" : row.statusText === "Đã duyệt" ? "rgba(16, 185, 129, 0.12)" : "#f1f5f9",
              color: row.statusText === "Kế toán đã duyệt" ? "#4f46e5" : row.statusText === "Đã duyệt" ? "#10b981" : "#64748b",
              borderColor: row.statusText === "Kế toán đã duyệt" ? "rgba(99, 102, 241, 0.25)" : row.statusText === "Đã duyệt" ? "rgba(16, 185, 129, 0.25)" : "#cbd5e1"
            }}
          >
            {row.statusText}
          </span>
        );
      }
    }
  ];

  const rowsWithTotal = filteredEmployees.length > 0 ? [
    ...filteredEmployees,
    {
      id: "TOTAL_ROW",
      isTotalRow: true,
      fullName: "TỔNG CỘNG",
      positionName: "",
      baseSalary: filteredTotalBase,
      cong: filteredTotalDays,
      allowances: filteredTotalAllowances,
      khauTruBH: filteredTotalDeductions,
      otHours: 0,
      otSalary: filteredTotalOt,
      net: filteredTotalNet,
      statusText: ""
    }
  ] : [];

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/hr/payroll/send-accounting/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year })
      });
      const json = await res.json();
      if (res.ok) {
        success("Thành công", "Đã duyệt bảng lương tháng thành công!");
        setEmployees(prev => prev.map(e => ({ ...e, statusText: "Kế toán đã duyệt" })));
      } else {
        toastError("Lỗi", json.error || "Không thể duyệt bảng lương.");
      }
    } catch (err) {
      console.error(err);
      toastError("Lỗi", "Đã xảy ra lỗi kết nối.");
    } finally {
      setApproving(false);
    }
  };

  const isAlreadyApproved = employees.length > 0 && employees.every(e => e.statusText === "Kế toán đã duyệt");

  return (
    <AnimatePresence>
      <div
        className="position-fixed inset-0 d-flex align-items-center justify-content-center"
        style={{ zIndex: 10005, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white overflow-hidden d-flex flex-column"
          style={{
            width: "100vw",
            height: "100vh",
            maxWidth: "100vw",
            maxHeight: "100vh",
            borderRadius: 0,
            fontFamily: "'Roboto Condensed', sans-serif"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center text-white"
                style={{
                  width: "42px",
                  height: "42px",
                  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)"
                }}
              >
                <i className="bi bi-cash-coin fs-5"></i>
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark" style={{ letterSpacing: "0.5px" }}>Chi tiết bảng lương</h5>
                <div className="small text-muted fw-medium mt-0.5">
                  Tháng {month} / {year} • Ngày công chuẩn: {standardWorkDays} ngày
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-link text-muted p-2 hover-bg-light rounded-circle transition-all d-flex align-items-center justify-content-center"
              style={{ width: "36px", height: "36px", border: "none", textDecoration: "none" }}
            >
              <i className="bi bi-x-lg fs-5"></i>
            </button>
          </div>

          {/* Toolbar */}
          {!loading && employees.length > 0 && (
            <div className="px-4 py-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-wrap gap-3 shadow-sm" style={{ zIndex: 5 }}>
              {/* Filters */}
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small fw-medium" style={{ fontSize: "12.5px" }}>Phòng ban:</span>
                  <FilterSelect
                    options={uniqueDepartments.map((dept) => ({ label: dept, value: dept }))}
                    value={selectedDept}
                    onChange={setSelectedDept}
                    placeholder="Tất cả phòng ban"
                    width={180}
                    className="rounded-pill"
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Tìm tên nhân viên..."
                    style={{ width: "240px" }}
                  />
                </div>
              </div>
              
              {/* Info Labels */}
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border shadow-sm">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center" 
                    style={{ 
                      width: "24px", 
                      height: "24px", 
                      backgroundColor: "rgba(99, 102, 241, 0.12)", 
                      color: "#4f46e5" 
                    }}
                  >
                    <i className="bi bi-people-fill" style={{ fontSize: "11px" }}></i>
                  </div>
                  <span className="text-muted small" style={{ fontSize: "12.5px" }}>Nhân viên:</span>
                  <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{filteredEmployees.length} người</span>
                </div>
                <div className="d-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border shadow-sm">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center" 
                    style={{ 
                      width: "24px", 
                      height: "24px", 
                      backgroundColor: "rgba(245, 158, 11, 0.12)", 
                      color: "#d97706" 
                    }}
                  >
                    <i className="bi bi-calendar-check-fill" style={{ fontSize: "11px" }}></i>
                  </div>
                  <span className="text-muted small" style={{ fontSize: "12.5px" }}>Tổng công:</span>
                  <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{filteredTotalDays.toFixed(1)} công</span>
                </div>
                <div className="d-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border shadow-sm">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center" 
                    style={{ 
                      width: "24px", 
                      height: "24px", 
                      backgroundColor: "rgba(16, 185, 129, 0.12)", 
                      color: "#059669" 
                    }}
                  >
                    <i className="bi bi-cash-stack" style={{ fontSize: "11px" }}></i>
                  </div>
                  <span className="text-muted small" style={{ fontSize: "12.5px" }}>Thực lĩnh:</span>
                  <span className="fw-bold text-success" style={{ fontSize: "13px" }}>{Math.round(filteredTotalNet).toLocaleString("vi-VN")} đ</span>
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="flex-grow-1 d-flex flex-column overflow-hidden bg-white">
            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
                <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }}></div>
                <div className="text-muted fw-medium">Đang tải dữ liệu bảng lương...</div>
              </div>
            ) : employees.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                <i className="bi bi-file-earmark-bar-graph fs-1 mb-3"></i>
                <div>Không tìm thấy dữ liệu bảng lương.</div>
              </div>
            ) : (
              <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden">
                {/* Table Container */}
                <div className="flex-grow-1 overflow-auto payroll-table" style={{ position: "relative" }}>
                  <style dangerouslySetInnerHTML={{__html: `
                    .payroll-table > div {
                      overflow: visible !important;
                    }
                    .payroll-table th {
                      background-color: #f8fafc !important;
                      position: sticky !important;
                      top: 0 !important;
                      z-index: 10 !important;
                      box-shadow: inset 0 -1px 0 #dee2e6 !important;
                    }
                    .payroll-table th,
                    .payroll-table td {
                      padding-top: 5px !important;
                      padding-bottom: 5px !important;
                      line-height: 1.3 !important;
                    }
                    .payroll-table tr:last-child td {
                      background-color: #f8fafc !important;
                      border-top: 2px solid #dee2e6 !important;
                      position: sticky !important;
                      bottom: 0 !important;
                      z-index: 9 !important;
                      box-shadow: inset 0 1px 0 #dee2e6, inset 0 -1px 0 #dee2e6 !important;
                      font-weight: bold !important;
                    }
                  `}} />
                  <Table
                    rows={rowsWithTotal}
                    columns={columns}
                    loading={loading}
                    minWidth={1000}
                    rowKey={(row: any) => row.id}
                    onRowClick={(row: any) => {
                      if (row.isTotalRow) return;
                      setSelectedEmployee(row);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-top bg-light d-flex justify-content-end gap-2 align-items-center">
            <button
              className="btn btn-white border rounded-pill px-4 fw-medium text-muted shadow-sm"
              style={{ fontSize: "13px", height: "36px" }}
              onClick={onClose}
            >
              Đóng
            </button>
            {!isAlreadyApproved ? (
              <button
                className="btn btn-success rounded-pill px-4 fw-medium text-white shadow-sm d-flex align-items-center gap-2"
                style={{ fontSize: "13px", height: "36px", border: "none" }}
                onClick={handleApprove}
                disabled={approving || employees.length === 0}
              >
                {approving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Đang duyệt...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-check"></i>
                    Duyệt bảng lương
                  </>
                )}
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 text-success fw-bold px-3" style={{ fontSize: "13px" }}>
                <i className="bi bi-patch-check-fill"></i> Kế toán đã duyệt
              </div>
            )}
          </div>
        </motion.div>

        {/* Selected Employee Detail Offcanvas */}
        {selectedEmployee && (
          <>
            {/* Backdrop */}
            <div 
              className="offcanvas-backdrop fade show" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEmployee(null);
              }} 
              style={{ zIndex: 10006 }}
            />

            {/* Offcanvas Container */}
            <div 
              className="offcanvas offcanvas-end show border-0 shadow" 
              tabIndex={-1} 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                visibility: "visible", 
                zIndex: 10007,
                width: "400px",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
                fontFamily: "'Roboto Condensed', sans-serif"
              }}
            >
              {/* Header */}
              <div className="offcanvas-header bg-white border-bottom">
                <div>
                  <h5 className="offcanvas-title fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "16px", letterSpacing: "0.5px" }}>
                    <i className="bi bi-file-earmark-person-fill text-primary fs-5"></i>
                    Hồ sơ lương nhân viên
                  </h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close shadow-none" 
                  onClick={() => setSelectedEmployee(null)}
                ></button>
              </div>

              {/* Body */}
              <div className="offcanvas-body p-4 bg-white overflow-auto d-flex flex-column gap-4">
                {/* Employee Profile (Card-free) */}
                <div className="d-flex align-items-center gap-3 pb-3 border-bottom">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                    style={{
                      width: "48px",
                      height: "48px",
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      fontSize: "16px",
                      letterSpacing: "1px",
                      flexShrink: 0
                    }}
                  >
                    {selectedEmployee.fullName.split(" ").pop()?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <h6 className="fw-bold text-dark mb-1 text-truncate" style={{ fontSize: "15px" }}>{selectedEmployee.fullName}</h6>
                    <div className="d-flex align-items-center gap-1.5 flex-wrap">
                      <span 
                        className="badge rounded-pill border px-2.5 py-1"
                        style={{ 
                          fontSize: "10px",
                          backgroundColor: "rgba(108, 117, 125, 0.12)",
                          color: "#6c757d",
                          borderColor: "rgba(108, 117, 125, 0.25)"
                        }}
                      >
                        {selectedEmployee.positionName}
                      </span>
                      <span 
                        className="badge rounded-pill border px-2.5 py-1"
                        style={{ 
                          fontSize: "10px",
                          backgroundColor: selectedEmployee.statusText === "Kế toán đã duyệt" ? "rgba(99, 102, 241, 0.12)" : selectedEmployee.statusText === "Đã duyệt" ? "rgba(16, 185, 129, 0.12)" : "#f1f5f9",
                          color: selectedEmployee.statusText === "Kế toán đã duyệt" ? "#4f46e5" : selectedEmployee.statusText === "Đã duyệt" ? "#10b981" : "#64748b",
                          borderColor: selectedEmployee.statusText === "Kế toán đã duyệt" ? "rgba(99, 102, 241, 0.25)" : selectedEmployee.statusText === "Đã duyệt" ? "rgba(16, 185, 129, 0.25)" : "#cbd5e1"
                        }}
                      >
                        {selectedEmployee.statusText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Work Data Block (Card-free) */}
                <div>
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2 border-start border-3 border-primary ps-2" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>
                    DỮ LIỆU CÔNG CHI TIẾT
                  </h6>
                  <div className="d-flex flex-column ps-2" style={{ gap: "14px" }}>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-secondary" style={{ fontSize: "12.5px" }}>Ngày công chuẩn:</span>
                      <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{standardWorkDays} ngày</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-secondary" style={{ fontSize: "12.5px" }}>Số ngày công thực tế:</span>
                      <span className="fw-bold text-primary" style={{ fontSize: "13px" }}>{selectedEmployee.cong.toFixed(1)} ngày</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5">
                      <span className="text-secondary" style={{ fontSize: "12.5px" }}>Giờ tăng ca (OT):</span>
                      <span className="fw-bold text-warning" style={{ fontSize: "13px" }}>{selectedEmployee.otHours.toFixed(1)} giờ</span>
                    </div>
                  </div>
                </div>

                {/* Payroll Details Block (Card-free) */}
                <div>
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2 border-start border-3 border-success ps-2" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>
                    CHI TIẾT LƯƠNG &amp; PHỤ CẤP
                  </h6>
                  
                  {/* Thu nhập */}
                  <div className="mb-4 ps-2">
                    <div className="text-muted fw-bold mb-3 pb-1 border-bottom" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>THU NHẬP (A)</div>
                    <div className="d-flex flex-column" style={{ gap: "14px" }}>
                      <div className="d-flex justify-content-between align-items-center py-1.5">
                        <span className="text-secondary" style={{ fontSize: "12.5px" }}>Lương cơ bản (HĐ):</span>
                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{selectedEmployee.baseSalary.toLocaleString("vi-VN")} đ</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1.5">
                        <span className="text-secondary" style={{ fontSize: "12.5px" }}>Lương theo ngày công:</span>
                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                          {Math.round((selectedEmployee.baseSalary / standardWorkDays) * selectedEmployee.cong).toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1.5">
                        <span className="text-secondary" style={{ fontSize: "12.5px" }}>Phụ cấp tổng cộng:</span>
                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>+{selectedEmployee.allowances.toLocaleString("vi-VN")} đ</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1.5">
                        <span className="text-secondary" style={{ fontSize: "12.5px" }}>Lương tăng ca (OT):</span>
                        <span className="fw-bold text-warning" style={{ fontSize: "13px" }}>+{Math.round(selectedEmployee.otSalary).toLocaleString("vi-VN")} đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Khấu trừ */}
                  <div className="mb-4 ps-2">
                    <div className="text-muted fw-bold mb-3 pb-1 border-bottom" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>KHOẢN KHẤU TRỪ (B)</div>
                    <div className="d-flex justify-content-between align-items-center py-1.5">
                      <span className="text-secondary" style={{ fontSize: "12.5px" }}>Khấu trừ bảo hiểm (10.5%):</span>
                      <span className="fw-bold text-danger" style={{ fontSize: "13px" }}>-{Math.round(selectedEmployee.khauTruBH).toLocaleString("vi-VN")} đ</span>
                    </div>
                  </div>

                  {/* Thực lĩnh */}
                  <div className="d-flex justify-content-between align-items-center pt-3 border-top ps-2">
                    <div>
                      <div className="text-success fw-bold" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>TỔNG THỰC LĨNH (A - B)</div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Đã bao gồm phụ cấp và trừ BH</div>
                    </div>
                    <div className="text-end">
                      <span className="fw-bold text-success" style={{ fontSize: "20px" }}>
                        {Math.round(selectedEmployee.net).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AnimatePresence>
  );
}
