"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { EmployeeAvatar } from "./EmployeeAvatar";

interface LaborContract {
  id: string;
  contractNumber: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

interface EmploymentHistory {
  id: string;
  type: string;
  oldPosition: string | null;
  newPosition: string | null;
  oldDept: string | null;
  newDept: string | null;
  oldLevel: string | null;
  newLevel: string | null;
  effectiveDate: string;
  decisionNumber: string | null;
  notes: string | null;
}

interface EmployeeDetail {
  id: string;
  code: string;
  fullName: string;
  position: string;
  departmentName: string;
  status: string;
  workEmail: string;
  phone: string;
  gender: string;
  birthDate: string | null;
  nationalId: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  employeeType: string;
  startDate: string | null;
  baseSalary: number | null;
  bankAccount: string | null;
  bankName: string | null;
  education: string | null;
  skills: string | null;
  laborContracts?: LaborContract[];
  employmentHistory?: EmploymentHistory[];
  
  // Extended fields matching Create modal
  branchName?: string;
  level?: string;
  managerName?: string;
  workLocation?: string;
  profileStatus?: string;
  socialInsuranceNumber?: string;
  isInsuranceEnrolled?: boolean;
  taxCode?: string;
  mealAllowance?: number;
  fuelAllowance?: number;
  phoneAllowance?: number;
  seniorityAllowance?: number;
  bankBranch?: string;
  dependents?: number;
  softSkills?: string;
  certifications?: string;
  annualLeave?: number;
  workShift?: string;
  notes?: string;
  personalEmail?: string;
  nationalIdDate?: string;
  nationalIdPlace?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  avatarUrl?: string;
  contractType?: string;
  contractNumber?: string;
  contractSignDate?: string;
  contractEndDate?: string;
}

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
}

function FieldGroup({ title, icon, children, columns }: { title: string; icon: string; children: React.ReactNode; columns?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`bi ${icon}`} style={{ fontSize: 13, color: "var(--primary)" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.01em" }}>
          {title}
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: columns ?? "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px 16px",
      }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, fullWidth, hint, copyable, highlight, noWrap }: { label: string; value?: React.ReactNode; fullWidth?: boolean; hint?: string; copyable?: boolean; highlight?: boolean; noWrap?: boolean }) {
  const col = fullWidth ? "1 / -1" : undefined;
  
  const handleCopy = () => {
    if (typeof value === "string" && value) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div style={{ gridColumn: col, display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{
        width: "100%", padding: "9px 12px",
        background: "var(--background)", 
        border: "1px solid var(--border)",
        borderRadius: 10, color: "var(--foreground)", 
        fontSize: 13, fontWeight: 500,
        minHeight: 38, display: "flex", alignItems: "center", justifyContent: "space-between",
        boxSizing: "border-box"
      }}>
        <span style={{ 
          color: value ? "inherit" : "var(--muted-foreground)", 
          wordBreak: noWrap ? "normal" : "break-word",
          whiteSpace: noWrap ? "nowrap" : "normal",
          overflow: noWrap ? "hidden" : "visible",
          textOverflow: noWrap ? "ellipsis" : "clip"
        }}>
          {value || "—"}
        </span>
        {copyable && value && (
          <button 
            onClick={handleCopy}
            title="Sao chép"
            style={{ 
              background: "none", border: "none", color: "inherit", opacity: 0.5,
              cursor: "pointer", padding: 0, marginLeft: 8 
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "1"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "0.5"}
          >
            <i className="bi bi-copy" style={{ fontSize: 12 }}></i>
          </button>
        )}
      </div>
      {hint && <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{hint}</span>}
    </div>
  );
}

// Map gender
const getGenderLabel = (g: string) => g === "male" ? "Nam" : g === "female" ? "Nữ" : g === "other" ? "Khác" : "—";
// Map employee type
const getEmpTypeLabel = (t: string) => t === "official" ? "Chính thức" : t === "probation" ? "Thử việc" : t === "intern" ? "Thực tập sinh" : t === "collaborator" ? "Cộng tác viên" : t;
// Map contract type
const getContractTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    unsigned: "Chưa ký hợp đồng",
    probation: "Hợp đồng thử việc",
    definite: "Hợp đồng có xác định thời hạn",
    indefinite: "Hợp đồng không xác định thời hạn",
  };
  return map[t] || t || "—";
};


export function EmployeeDetailOffcanvas({ isOpen, onClose, employeeId }: EmployeeDetailModalProps) {
  const toast = useToast();
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [positions, setPositions] = useState<{code: string, name: string}[]>([]);
  const [levels, setLevels] = useState<{code: string, name: string}[]>([]);
  const [workLocations, setWorkLocations] = useState<{code: string, name: string}[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(d => setCompanyInfo(d))
      .catch(() => {});
      
    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d ?? []))
      .catch(() => {});

    fetch("/api/board/categories?type=cap_bac")
      .then(r => r.json())
      .then(d => setLevels(d ?? []))
      .catch(() => {});

    fetch("/api/board/categories?type=dia_diem_lam_viec")
      .then(r => r.json())
      .then(d => setWorkLocations(d ?? []))
      .catch(() => {});
  }, []);

  const getPositionName = (code?: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const getLevelName = (code?: string) => {
    if (!code) return "—";
    const lvl = levels.find(l => l.code === code);
    return lvl ? lvl.name : code;
  };

  const getWorkLocationName = (code?: string) => {
    if (!code) return "—";
    const loc = workLocations.find(l => l.code === code);
    return loc ? loc.name : code;
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      setErrorMsg(null);
      fetchDetail(employeeId);
    } else if (!isOpen) {
      setData(null);
      setErrorMsg(null);
      setActiveTab("overview");
    }
  }, [isOpen, employeeId]);

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/employees/${id}?t=${Date.now()}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store' 
      });
      
      if (!res.ok) {
        const text = await res.text();
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error("Đang tải lại cấu trúc hệ thống. Vui lòng thử lại sau vài giây.");
        }
        let json;
        try { json = JSON.parse(text); } catch { json = {}; }
        throw new Error(json.error || `Lỗi ${res.status}`);
      }

      const json = await res.json();
      
      if (json.employee) {
        setData(json.employee);
      } else {
        throw new Error("Phản hồi không chứa dữ liệu nhân viên");
      }
    } catch (error: any) {
      console.error("[EmployeeDetail] Fetch error:", error);
      setErrorMsg(error.message);
      toast.error("Lỗi dữ liệu", error.message || "Không thể tải hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: "bi-grid-1x2" },
    { id: "personal", label: "Định danh", icon: "bi-person-vcard" },
    { id: "employment", label: "Công việc", icon: "bi-briefcase" },
    { id: "contracts", label: "Hợp đồng và Pháp lý", icon: "bi-file-earmark-text" },
    { id: "payroll", label: "Lương và Phúc lợi", icon: "bi-cash-stack" },
    { id: "skills", label: "Kỹ năng và Khác", icon: "bi-award" },
    { id: "history", label: "Lịch sử công tác", icon: "bi-clock-history" },
  ];

  const EmployeePrintDocument = ({ emp }: { emp: EmployeeDetail }) => {
    return (
      <div className="pdf-content-page" style={{ 
        color: "#111", 
        minHeight: "297mm", display: "flex", flexDirection: "column",
        boxSizing: "border-box",
        fontFamily: "'Roboto Condensed', sans-serif"
      }}>
        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "2px solid #111", paddingBottom: 25 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              {companyInfo?.logoUrl && (
                <img 
                  src={companyInfo.logoUrl} 
                  alt="Logo" 
                  style={{ height: 48, width: "auto", objectFit: "contain" }} 
                />
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2px", color: "#111", lineHeight: 1.2 }}>
                  {companyInfo?.name || "Leetech Solution"}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#666", fontStyle: "italic", maxWidth: "500px", lineHeight: 1.4 }}>
                  {companyInfo?.slogan || "Hệ thống quản trị nhân sự tổng thể"}
                </p>
                {companyInfo?.address && (
                  <p style={{ margin: "2px 0 0", fontSize: 9, color: "#888", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="bi bi-geo-alt-fill" />
                    {companyInfo.address}
                  </p>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`Họ tên: ${emp.fullName}\nMã NV: ${emp.code}\nPhòng ban: ${emp.departmentName}\nChức vụ: ${getPositionName(emp.position)}`)}`} 
                alt="QR Code" 
                style={{ width: 85, height: 85, border: "1px solid #eee", padding: 2, background: "#fff" }} 
              />
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 15 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#003087", letterSpacing: "3px", textTransform: "uppercase" }}>HỒ SƠ NHÂN VIÊN</h1>
            <p style={{ marginTop: 8, margin: 0, fontSize: 13, fontWeight: 700, color: "#444" }}>Mã NV: {emp.code}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ margin: "0 0 15px", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #eee", paddingBottom: 8, color: "#003087" }}>I. THÔNG TIN CÁ NHÂN</h3>
          <div style={{ display: "flex", gap: 30 }}>
            <div style={{ 
              width: 135, height: 175, borderRadius: 0, overflow: "hidden", flexShrink: 0
            }}>
              <EmployeeAvatar 
                name={emp.fullName} 
                url={emp.avatarUrl} 
                size={135} 
                borderRadius={0} 
                fontSize={50}
                style={{ width: 135, height: 175 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
               <tbody>
                 <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Họ và tên:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>{emp.fullName}</td>
                 </tr>
                 <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Ngày sinh:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.birthDate ? new Date(emp.birthDate).toLocaleDateString("vi-VN") : "—"}</td>
                 </tr>
                 <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Giới tính:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{getGenderLabel(emp.gender)}</td>
                 </tr>
                 <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Số CCCD:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.nationalId || "—"}</td>
                 </tr>
                 <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>SĐT liên hệ:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.phone || "—"}</td>
                 </tr>
                 <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Email công việc:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.workEmail || "—"}</td>
                   </tr>
                 </tbody>
               </table>
              </div>
           </div>
        </div>

          {/* Work Info */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ margin: "0 0 15px", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #eee", paddingBottom: 8, color: "#003087" }}>II. THÔNG TIN CÔNG TÁC</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Phòng ban:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.departmentName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Chức vụ:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{getPositionName(emp.position)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Cấp bậc:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{getLevelName(emp.level)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Quản lý trực tiếp:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.managerName || "—"}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Ngày gia nhập:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Loại hình NV:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{getEmpTypeLabel(emp.employeeType)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Địa điểm:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{getWorkLocationName(emp.workLocation)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Chi nhánh:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.branchName || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Contract Info */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ margin: "0 0 15px", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #eee", paddingBottom: 8, color: "#003087" }}>III. HỢP ĐỒNG LAO ĐỘNG</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Loại hợp đồng:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>
                      {emp.contractType === "probation" ? "HĐ Thử việc" : 
                       emp.contractType === "definite" ? "HĐ Xác định thời hạn" : 
                       emp.contractType === "indefinite" ? "HĐ Không xác định thời hạn" : "Chưa ký hợp đồng"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Số hợp đồng:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.contractNumber || "—"}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Ngày ký:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.contractSignDate ? new Date(emp.contractSignDate).toLocaleDateString("vi-VN") : "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Ngày hết hạn:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString("vi-VN") : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payroll Info */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ margin: "0 0 15px", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #eee", paddingBottom: 8, color: "#003087" }}>IV. LƯƠNG VÀ PHÚC LỢI</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Lương cơ bản:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.baseSalary ? Number(emp.baseSalary).toLocaleString("vi-VN") + " VNĐ" : "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Số tài khoản:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.bankAccount || "—"}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b", width: "140px" }}>Ngân hàng:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.bankName || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Chi nhánh NH:</td>
                    <td style={{ padding: "6px 0", fontWeight: 700 }}>{emp.bankBranch || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Skills Info */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ margin: "0 0 15px", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #eee", paddingBottom: 8, color: "#003087" }}>V. KỸ NĂNG VÀ HỌC VẤN</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#64748b", display: "block", marginBottom: 4 }}>Kỹ năng chuyên môn:</span>
                <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{emp.skills || "—"}</div>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#64748b", display: "block", marginBottom: 4 }}>Trình độ học vấn:</span>
                <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{emp.education || "—"}</div>
              </div>
            </div>
          </div>

          {/* History */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ margin: "0 0 15px", fontSize: 15, fontWeight: 800, borderBottom: "1px solid #eee", paddingBottom: 8, color: "#003087" }}>VI. QUÁ TRÌNH CÔNG TÁC</h3>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ border: "1px solid #e2e8f0", padding: "12px 10px", textAlign: "left", width: "110px" }}>Ngày</th>
                  <th style={{ border: "1px solid #e2e8f0", padding: "12px 10px", textAlign: "left", width: "140px" }}>Loại sự kiện</th>
                  <th style={{ border: "1px solid #e2e8f0", padding: "12px 10px", textAlign: "left" }}>Nội dung chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {emp.employmentHistory?.map((h, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid #e2e8f0", padding: "12px 10px", verticalAlign: "top" }}>{new Date(h.effectiveDate).toLocaleDateString("vi-VN")}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "12px 10px", fontWeight: 700, verticalAlign: "top" }}>
                      {h.type === "promotion" ? "Thăng tiến / Bổ nhiệm" : h.type === "transfer" ? "Điều chuyển công tác" : "Cập nhật thông tin"}
                      {h.decisionNumber && <div style={{ fontSize: 10, fontWeight: 400, color: "#64748b", marginTop: 4 }}>Số QĐ: {h.decisionNumber}</div>}
                    </td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "12px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(h.oldPosition || h.newPosition) && (
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                            <span style={{ color: "#64748b", minWidth: 60 }}>Vị trí:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {h.oldPosition && <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>{getPositionName(h.oldPosition)}</span>}
                              {h.oldPosition && <i className="bi bi-arrow-right" style={{ fontSize: 10, color: "#94a3b8" }} />}
                              <b style={{ color: "#003087" }}>{getPositionName(h.newPosition || "")}</b>
                            </div>
                          </div>
                        )}
                        {(h.oldDept || h.newDept) && (
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                            <span style={{ color: "#64748b", minWidth: 60 }}>Phòng ban:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {h.oldDept && <span style={{ color: "#94a3b8" }}>{h.oldDept}</span>}
                              {h.oldDept && <i className="bi bi-arrow-right" style={{ fontSize: 10, color: "#94a3b8" }} />}
                              <b>{h.newDept}</b>
                            </div>
                          </div>
                        )}
                        {(h.oldLevel || h.newLevel) && (
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                            <span style={{ color: "#64748b", minWidth: 60 }}>Cấp bậc:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {h.oldLevel && <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>{getLevelName(h.oldLevel)}</span>}
                              {h.oldLevel && <i className="bi bi-arrow-right" style={{ fontSize: 10, color: "#94a3b8" }} />}
                              <b>{getLevelName(h.newLevel || "")}</b>
                            </div>
                          </div>
                        )}
                        {h.notes && (
                          <div style={{ marginTop: 2, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, borderLeft: "3px solid #e2e8f0", fontStyle: "italic", color: "#475569" }}>
                            "{h.notes}"
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px 10px", verticalAlign: "top" }}>{emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px 10px", fontWeight: 700, verticalAlign: "top" }}>Gia nhập công ty</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px 10px" }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Bắt đầu làm việc chính thức</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                      <div style={{ display: "flex", gap: 8 }}><span style={{ color: "#64748b", width: 70 }}>Phòng ban:</span> <b>{emp.departmentName}</b></div>
                      <div style={{ display: "flex", gap: 8 }}><span style={{ color: "#64748b", width: 70 }}>Vị trí:</span> <b>{getPositionName(emp.position)}</b></div>
                      <div style={{ display: "flex", gap: 8 }}><span style={{ color: "#64748b", width: 70 }}>Cấp bậc:</span> <b>{getLevelName(emp.level)}</b></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer / Signatures */}
          <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, textAlign: "center", paddingTop: 40, paddingBottom: 40 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Xác nhận của Nhân viên</p>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b" }}>(Ký và ghi rõ họ tên)</p>
              <div style={{ height: 80 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, textTransform: "uppercase" }}>{emp.fullName}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Đại diện Công ty</p>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b" }}>(Ký tên và đóng dấu)</p>
              <div style={{ height: 80 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{emp.managerName || "...................................."}</p>
            </div>
          </div>
        </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fs-modal-wrap" style={{ 
      position: "fixed", inset: 0, zIndex: 1100, 
      background: "var(--background)", display: "flex", flexDirection: "column",
      animation: "fsFadeIn 0.2s ease"
    }}>
      <style>{`
        @keyframes fsSlideIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fsFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .fs-modal-wrap {
          position: fixed; inset: 0; z-index: 1100;
          background: var(--background);
          display: flex; flex-direction: column;
          animation: fsFadeIn 0.18s ease;
          overflow: hidden;
        }
        .fs-modal-body {
          display: flex; flex: 1; overflow: hidden;
        }
        /* Sidebar */
        .fs-sidebar {
          width: 260px; flex-shrink: 0;
          background: var(--card);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          padding: 28px 20px;
          overflow-y: auto;
        }
        .fs-sidebar::-webkit-scrollbar { display: none; }
        /* Content */
        .fs-content {
          flex: 1; overflow-y: auto;
          padding: 32px 48px 32px;
          animation: fsSlideIn 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .fs-content::-webkit-scrollbar { width: 5px; }
        .fs-content::-webkit-scrollbar-track { background: transparent; }
        .fs-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        .fs-step-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 12px;
          border: none; background: none; cursor: pointer;
          width: 100%; text-align: left;
          transition: background 0.15s;
          margin-bottom: 4px;
        }
        .fs-step-btn:hover { background: var(--muted); }
        .fs-step-btn.active { background: color-mix(in srgb, var(--primary) 10%, transparent); }
      `}</style>

      {/* Top header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56, flexShrink: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}>
        {/* Left: Brand + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi bi-person-lines-fill" style={{ fontSize: 14, color: "var(--primary)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontWeight: 500 }}>Nhân sự</span>
            <i className="bi bi-chevron-right" style={{ fontSize: 10, color: "var(--muted-foreground)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Chi tiết nhân viên</span>
          </div>
        </div>

        {/* Center */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data?.status === "active" && (
            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              Đang làm việc
            </span>
          )}
        </div>

        {/* Right: Actions + Close button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowPrintModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 9, border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)", cursor: "pointer",
              color: "var(--primary)", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 12%, transparent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
            }}
          >
            <i className="bi bi-printer" style={{ fontSize: 14 }} />
            Hồ sơ nhân viên
          </button>

          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 9, border: "1px solid var(--border)",
              background: "var(--background)", cursor: "pointer",
              color: "var(--foreground)", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--background)";
            }}
          >
            <i className="bi bi-x-lg" style={{ fontSize: 11 }} />
            Đóng
          </button>
        </div>
      </div>

      <div className="fs-modal-body">
        {/* Left Sidebar */}
        <aside className="fs-sidebar">
          <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
            <EmployeeAvatar 
              name={data?.fullName || ""} 
              url={data?.avatarUrl} 
              size={52} 
              borderRadius={14} 
              fontSize={20}
            />
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)", marginBottom: 2 }}>
              {data?.fullName || (loading ? "Đang tải..." : "...")}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {data?.code ? `#${data.code}` : "..."}
            </div>
            {data?.position && (
              <div style={{
                marginTop: 8, fontSize: 11, fontWeight: 600,
                color: "var(--primary)",
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: 6, padding: "3px 8px", display: "inline-block",
              }}>
                {getPositionName(data.position)}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            {tabs.map(tab => {
              const isCurrent = activeTab === tab.id;
              const cls = `fs-step-btn ${isCurrent ? "active" : ""}`;
              return (
                <button
                  key={tab.id}
                  className={cls}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {/* Circle */}
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isCurrent
                      ? "var(--primary)"
                      : "var(--muted)",
                    fontSize: 12, fontWeight: 800,
                    color: isCurrent ? "#fff" : "var(--muted-foreground)",
                    transition: "all 0.15s",
                    border: isCurrent ? "2px solid var(--primary)" : "2px solid transparent",
                  }}>
                    <i className={`bi ${tab.icon}`} style={{ fontSize: 11 }} />
                  </span>
                  {/* Label */}
                  <span style={{ flex: 1 }}>
                    <span style={{
                      display: "block", fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? "var(--primary)" : "var(--muted-foreground)",
                      lineHeight: 1.3,
                    }}>
                      {tab.label}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 1, display: "block" }}>
                        Đang xem
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom hint */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div style={{
              fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.6,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span>
                <i className="bi bi-shield-check" style={{ color: "var(--primary)", marginRight: 5 }} />
                Dữ liệu được bảo mật
              </span>
              <span>
                <i className="bi bi-arrow-counterclockwise" style={{ color: "var(--primary)", marginRight: 5 }} />
                Nhấn ESC để đóng
              </span>
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <main className="fs-content">
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 opacity-50">
                <div className="spinner-border text-primary mb-3" />
                <div className="fw-bold h5">Đang lấy dữ liệu từ hệ thống...</div>
              </div>
            ) : errorMsg ? (
              <div className="text-center py-5">
                <div className="bg-danger bg-opacity-10 text-danger p-4 rounded-4 d-inline-block mb-4">
                  <i className="bi bi-exclamation-triangle fs-1" />
                </div>
                <h4 className="fw-bold text-danger">Lỗi kết nối</h4>
                <p className="text-muted mb-4">{errorMsg}</p>
                <button className="btn btn-primary rounded-pill px-4" onClick={() => fetchDetail(employeeId!)}>Thử lại</button>
              </div>
            ) : data ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <i className={`bi ${tabs.find(t => t.id === activeTab)?.icon}`} style={{ fontSize: 16, color: "var(--primary)" }} />
                    </div>
                    <div>
                      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--foreground)" }}>
                        {tabs.find(t => t.id === activeTab)?.label}
                      </h1>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                        {activeTab === "overview" && "Thông tin tóm tắt về nhân sự"}
                        {activeTab === "personal" && "Thông tin định danh cá nhân, liên lạc và địa chỉ"}
                        {activeTab === "employment" && "Vị trí công việc, phòng ban và loại hình nhân viên"}
                        {activeTab === "contracts" && "Hợp đồng lao động, hồ sơ pháp lý và bảo hiểm"}
                        {activeTab === "payroll" && "Mức lương, phụ cấp và thông tin ngân hàng"}
                        {activeTab === "skills" && "Kỹ năng chuyên môn, học vấn và chứng chỉ"}
                        {activeTab === "history" && "Quá trình công tác tại công ty"}
                      </p>
                    </div>
                  </div>
                  <div style={{ height: 1, background: "var(--border)", marginTop: 16 }} />
                </div>

                <div>
                  {activeTab === "overview" && (
                    <>
                      <FieldGroup title="Thông tin cơ bản" icon="bi-person-fill" columns="repeat(4, 1fr)">
                        <Field label="Họ và tên" value={data.fullName} highlight />
                        <Field label="Mã nhân viên" value={data.code} highlight copyable noWrap />
                        <Field label="Email công việc" value={data.workEmail} copyable />
                        <Field label="Số điện thoại" value={data.phone} copyable />
                      </FieldGroup>
                      
                      <FieldGroup title="Tổ chức" icon="bi-diagram-3" columns="5fr 4fr 3fr">
                        <Field label="Phòng ban / Bộ phận" value={data.departmentName} highlight />
                        <Field label="Chức vụ / Vị trí" value={getPositionName(data.position)} highlight />
                        <Field label="Cấp bậc" value={getLevelName(data.level)} />
                      </FieldGroup>

                      <FieldGroup title="Tình trạng" icon="bi-activity">
                        <Field label="Loại hình nhân viên" value={getEmpTypeLabel(data.employeeType)} />
                        <Field label="Ngày bắt đầu làm việc" value={data.startDate ? new Date(data.startDate).toLocaleDateString("vi-VN") : undefined} />
                        <Field label="Trạng thái" value={data.status === "active" ? "Đang làm việc" : data.status === "resigned" ? "Đã nghỉ việc" : "—"} highlight />
                      </FieldGroup>
                    </>
                  )}

                  {activeTab === "personal" && (
                    <>
                      <FieldGroup title="Thông tin cơ bản" icon="bi-person-fill" columns="repeat(3, 1fr)">
                        <Field label="Chi nhánh" value={data.branchName} />
                        <Field label="Mã nhân viên" value={data.code} copyable noWrap />
                        <Field label="Họ và tên" value={data.fullName} />
                        <Field label="Ngày sinh" value={data.birthDate ? new Date(data.birthDate).toLocaleDateString("vi-VN") : undefined} />
                        <Field label="Giới tính" value={getGenderLabel(data.gender)} />
                      </FieldGroup>

                      <FieldGroup title="CCCD / Hộ chiếu" icon="bi-card-text" columns="4fr 3fr 5fr">
                        <Field label="Số CCCD / Hộ chiếu" value={data.nationalId} copyable />
                        <Field label="Ngày cấp" value={data.nationalIdDate ? new Date(data.nationalIdDate).toLocaleDateString("vi-VN") : undefined} />
                        <Field label="Nơi cấp" value={data.nationalIdPlace} />
                      </FieldGroup>

                      <FieldGroup title="Địa chỉ" icon="bi-house-door">
                        <Field label="Địa chỉ thường trú" value={data.permanentAddress} fullWidth />
                        <Field label="Địa chỉ tạm trú (nơi ở hiện tại)" value={data.currentAddress} fullWidth />
                      </FieldGroup>

                      <FieldGroup title="Thông tin liên lạc" icon="bi-telephone" columns="4fr 4fr 4fr">
                        <Field label="SĐT cá nhân" value={data.phone} copyable />
                        <Field label="Email cá nhân" value={data.personalEmail} copyable />
                        <Field label="Email công ty" value={data.workEmail} copyable />
                      </FieldGroup>

                      <FieldGroup title="Liên hệ khẩn cấp" icon="bi-person-heart">
                        <Field label="Tên người thân" value={data.emergencyName} />
                        <Field label="Mối quan hệ" value={data.emergencyRelation} />
                        <Field label="SĐT liên hệ khẩn cấp" value={data.emergencyPhone} copyable />
                      </FieldGroup>
                    </>
                  )}

                  {activeTab === "employment" && (
                    <>
                      <FieldGroup title="Vị trí và Tổ chức" icon="bi-diagram-3" columns="5fr 4fr 3fr">
                        <Field label="Phòng ban / Bộ phận" value={data.departmentName} highlight />
                        <Field label="Chức vụ / Vị trí" value={getPositionName(data.position)} highlight />
                        <Field label="Cấp bậc" value={getLevelName(data.level)} />
                      </FieldGroup>

                      <FieldGroup title="Quản lý và Phân loại" icon="bi-person-check">
                        <Field label="Người quản lý trực tiếp" value={data.managerName} />
                        <Field label="Loại hình nhân viên" value={getEmpTypeLabel(data.employeeType)} />
                        <Field label="Ngày bắt đầu làm việc" value={data.startDate ? new Date(data.startDate).toLocaleDateString("vi-VN") : undefined} />
                        <Field label="Địa điểm làm việc" value={getWorkLocationName(data.workLocation)} />
                      </FieldGroup>
                    </>
                  )}

                  {activeTab === "contracts" && (
                    <>
                      <FieldGroup title="Hợp đồng lao động hiện tại" icon="bi-file-earmark-check" columns="3fr 3fr 3fr 3fr">
                        <Field label="Loại hợp đồng" value={getContractTypeLabel(data.laborContracts?.[0]?.contractType || "")} />
                        <Field label="Số hợp đồng" value={data.laborContracts?.[0]?.contractNumber || "—"} copyable />
                        <Field label="Ngày ký hợp đồng" value={data.laborContracts?.[0]?.startDate ? new Date(data.laborContracts[0].startDate).toLocaleDateString("vi-VN") : undefined} />
                        <Field label="Ngày hết hạn" value={data.laborContracts?.[0]?.endDate ? new Date(data.laborContracts[0].endDate).toLocaleDateString("vi-VN") : undefined} />
                      </FieldGroup>

                      <FieldGroup title="Trạng thái hồ sơ" icon="bi-folder-check">
                        <Field label="Tình trạng hồ sơ" value={data.profileStatus === "complete" ? "Đã nộp đầy đủ" : data.profileStatus === "partial" ? "Còn thiếu giấy tờ" : data.profileStatus === "pending" ? "Chưa nộp hồ sơ" : data.profileStatus} />
                      </FieldGroup>

                      <FieldGroup title="Bảo hiểm và Thuế" icon="bi-shield-check">
                        <Field label="Số sổ BHXH" value={data.socialInsuranceNumber} copyable />
                        <Field label="Mã số thuế cá nhân (MST)" value={data.taxCode} copyable />
                        <Field label="Trạng thái bảo hiểm" value={
                          <span className={`badge rounded-pill ${data.isInsuranceEnrolled ? "bg-success-subtle text-success border border-success-subtle" : "bg-light text-muted border"}`}>
                            {data.isInsuranceEnrolled ? "Đang tham gia" : "Không tham gia"}
                          </span>
                        } />
                      </FieldGroup>
                    </>
                  )}

                  {activeTab === "payroll" && (
                    <>
                      <FieldGroup title="Mức lương" icon="bi-cash-stack">
                        <Field label="Lương cơ bản (VNĐ)" value={data.baseSalary ? data.baseSalary.toLocaleString("vi-VN") : undefined} highlight />
                      </FieldGroup>

                      <FieldGroup title="Các khoản phụ cấp (VNĐ/tháng)" icon="bi-plus-circle">
                        <Field label="Phụ cấp ăn trưa" value={data.mealAllowance ? data.mealAllowance.toLocaleString("vi-VN") : undefined} />
                        <Field label="Phụ cấp xăng xe" value={data.fuelAllowance ? data.fuelAllowance.toLocaleString("vi-VN") : undefined} />
                        <Field label="Phụ cấp điện thoại" value={data.phoneAllowance ? data.phoneAllowance.toLocaleString("vi-VN") : undefined} />
                        <Field label="Phụ cấp thâm niên" value={data.seniorityAllowance ? data.seniorityAllowance.toLocaleString("vi-VN") : undefined} />
                      </FieldGroup>

                      <FieldGroup title="Tài khoản ngân hàng" icon="bi-bank" columns="4fr 6fr 3fr">
                        <Field label="Số tài khoản" value={data.bankAccount} copyable highlight />
                        <Field label="Tên ngân hàng" value={data.bankName} highlight />
                        <Field label="Chi nhánh NH" value={data.bankBranch} />
                      </FieldGroup>

                      <FieldGroup title="Giảm trừ gia cảnh" icon="bi-people">
                        <Field label="Số người phụ thuộc" value={data.dependents?.toString()} />
                      </FieldGroup>
                    </>
                  )}

                  {activeTab === "skills" && (
                    <>
                      <FieldGroup title="Học vấn và Bằng cấp" icon="bi-mortarboard">
                        <Field label="Trình độ học vấn" value={data.education} fullWidth />
                        <Field label="Chứng chỉ / Bằng cấp khác" value={data.certifications} fullWidth />
                      </FieldGroup>

                      <FieldGroup title="Kỹ năng" icon="bi-stars">
                        <Field label="Kỹ năng chuyên môn" value={data.skills} fullWidth />
                        <Field label="Kỹ năng mềm" value={data.softSkills} fullWidth />
                      </FieldGroup>

                      <FieldGroup title="Ngày phép và Chấm công" icon="bi-calendar-check">
                        <Field label="Số ngày phép năm" value={data.annualLeave?.toString()} />
                        <Field label="Ca làm việc mặc định" value={data.workShift} />
                      </FieldGroup>

                      <FieldGroup title="Ghi chú khác" icon="bi-journal-text">
                        <Field label="Ghi chú nội bộ" value={data.notes} fullWidth />
                      </FieldGroup>
                    </>
                  )}

                  {activeTab === "history" && (
                    <div style={{ position: "relative", paddingLeft: 40, borderLeft: "2px solid color-mix(in srgb, var(--primary) 10%, transparent)", marginLeft: 20, paddingTop: 10 }}>
                      {data.employmentHistory && data.employmentHistory.length > 0 ? (
                        [...data.employmentHistory]
                          .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
                          .map((h, idx) => (
                          <div key={h.id} style={{ position: "relative", marginBottom: 40 }}>
                            <div style={{
                              position: "absolute", left: -51, top: 2, width: 20, height: 20,
                              borderRadius: "50%", background: "var(--background)", 
                              border: "4px solid var(--primary)", zIndex: 2,
                              boxShadow: "0 0 0 4px color-mix(in srgb, var(--primary) 5%, transparent)"
                            }} />
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {new Date(h.effectiveDate).toLocaleDateString("vi-VN")}
                              </div>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                                  {h.type === "promotion" ? "Thăng tiến / Bổ nhiệm" : h.type === "transfer" ? "Điều chuyển công tác" : h.newPosition || "Thay đổi thông tin"}
                                </h4>
                                <span className="badge bg-primary-subtle text-primary border border-primary border-opacity-10 rounded-pill px-2" style={{ fontSize: 10 }}>
                                  {h.type === "promotion" ? "THĂNG TIẾN" : h.type === "transfer" ? "ĐIỀU CHUYỂN" : "CẬP NHẬT"}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                                {h.newPosition && <div>Vị trí mới: <b>{h.newPosition}</b></div>}
                                {h.newDept && <div>Phòng ban: <b>{h.newDept}</b></div>}
                                {h.notes && <div className="mt-1 p-2 rounded bg-light border-start border-3 border-primary border-opacity-20 italic">"{h.notes}"</div>}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : null}

                      {/* Entry Event */}
                      <div style={{ position: "relative", marginBottom: 20 }}>
                        <div style={{
                          position: "absolute", left: -51, top: 2, width: 20, height: 20,
                          borderRadius: "50%", background: "var(--background)", 
                          border: "4px solid var(--success)", zIndex: 2,
                          boxShadow: "0 0 0 4px color-mix(in srgb, var(--success) 5%, transparent)"
                        }} />
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {data.startDate ? new Date(data.startDate).toLocaleDateString("vi-VN") : "—"}
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                              Bắt đầu làm việc tại công ty
                            </h4>
                            <span className="badge bg-success-subtle text-success border border-success border-opacity-10 rounded-pill px-2" style={{ fontSize: 10 }}>
                              GIA NHẬP
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.3 }}>
                            <div style={{ 
                              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
                              gap: "2px 20px", marginTop: 0, padding: "6px 12px",
                              background: "color-mix(in srgb, var(--success) 4%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--success) 10%, transparent)",
                              borderRadius: 8
                            }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Phòng ban:</span>
                                <b style={{ color: "var(--foreground)" }}>{data.departmentName || "—"}</b>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Chức vụ:</span>
                                <b style={{ color: "var(--foreground)" }}>{getPositionName(data.position)}</b>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Cấp bậc:</span>
                                <b style={{ color: "var(--foreground)" }}>{getLevelName(data.level)}</b>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Quản lý:</span>
                                <b style={{ color: "var(--foreground)" }}>{data.managerName || "—"}</b>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Loại hình NV:</span>
                                <b style={{ color: "var(--foreground)" }}>{getEmpTypeLabel(data.employeeType)}</b>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Chi nhánh:</span>
                                <b style={{ color: "var(--foreground)" }}>{data.branchName || "—"}</b>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "var(--muted-foreground)", width: 100 }}>Địa điểm:</span>
                                <b style={{ color: "var(--foreground)" }}>{getWorkLocationName(data.workLocation)}</b>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </div>
        </main>
      </div>
    </div>

    {/* Print Modal */}
    {showPrintModal && data && (
      <PrintPreviewModal
        title="Hồ sơ nhân viên"
        subtitle={data.fullName}
        onClose={() => setShowPrintModal(false)}
        actions={
          <button
            onClick={() => printDocumentById("employee-profile-print", "portrait", `Hồ sơ ${data.fullName}`, true, "15mm 15mm 15mm 20mm")}
            className="btn btn-primary"
            style={{ 
              borderRadius: 8, fontSize: 13, fontWeight: 600, 
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--primary)", border: "none",
              padding: "8px 16px"
            }}
          >
            <i className="bi bi-printer" /> In hồ sơ
          </button>
        }
        document={<EmployeePrintDocument emp={data} />}
        documentId="employee-profile-print"
        keepFirstPageMargin={true}
        printMargins="15mm 15mm 15mm 20mm"
      />
    )}
    </>
  );
}
