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

function FieldGroup({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`bi ${icon}`} style={{ fontSize: 12, color: "var(--primary)" }} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>
          {title}
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "10px",
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
    <div style={{ gridColumn: col, display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{
        width: "100%", padding: "8px 12px",
        background: "var(--background)", 
        border: "1px solid var(--border)",
        borderRadius: 8, color: "var(--foreground)", 
        fontSize: 12.5, fontWeight: 500,
        minHeight: 36, display: "flex", alignItems: "center", justifyContent: "space-between",
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
            <i className="bi bi-copy" style={{ fontSize: 11 }}></i>
          </button>
        )}
      </div>
      {hint && <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1 }}>{hint}</span>}
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .fs-employee-offcanvas {
            max-width: 100% !important;
            border-left: none !important;
          }
        }
      `}</style>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1099,
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Offcanvas Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fs-employee-offcanvas"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              maxWidth: 400,
              zIndex: 1100,
              background: "var(--card)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.12)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header / Content */}
            <div style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              overflowY: "auto",
              height: "100%",
            }}>
              {/* Close & Action row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-person-badge" style={{ fontSize: 15 }} />
                  Hồ sơ nhân sự
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    title="In hồ sơ"
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      border: "1px solid var(--border)", background: "var(--background)",
                      color: "var(--foreground)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}
                  >
                    <i className="bi bi-printer" style={{ fontSize: 14 }} />
                  </button>
                  <button
                    onClick={onClose}
                    title="Đóng"
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      border: "1px solid var(--border)", background: "var(--background)",
                      color: "var(--foreground)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}
                  >
                    <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
                  </button>
                </div>
              </div>

              {/* Employee info */}
              {loading ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-5 opacity-50">
                  <div className="spinner-border spinner-border-sm text-primary mb-3" />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Đang tải hồ sơ...</div>
                </div>
              ) : errorMsg ? (
                <div className="text-center py-5">
                  <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-3 d-inline-block mb-3">
                    <i className="bi bi-exclamation-triangle fs-3" />
                  </div>
                  <h5 className="fw-bold text-danger">Lỗi kết nối</h5>
                  <p className="text-muted small mb-3">{errorMsg}</p>
                  <button className="btn btn-sm btn-primary rounded-pill px-3" onClick={() => fetchDetail(employeeId!)}>Thử lại</button>
                </div>
              ) : data ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <EmployeeAvatar 
                      name={data.fullName} 
                      url={data.avatarUrl} 
                      size={48} 
                      borderRadius={12} 
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {data.fullName}
                      </h3>
                      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontFamily: "monospace", margin: "2px 0 4px" }}>
                        {data.code}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: "var(--primary)",
                          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          borderRadius: 4, padding: "2px 6px",
                        }}>
                          {getPositionName(data.position)}
                        </span>
                        {data.status === "active" ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.1)",
                            borderRadius: 4, padding: "2px 6px",
                          }}>
                            Đang làm việc
                          </span>
                        ) : data.status === "resigned" ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: "#ef4444",
                            background: "rgba(239, 68, 68, 0.1)",
                            borderRadius: 4, padding: "2px 6px",
                        }}>
                          Đã nghỉ việc
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

                {/* Additional details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Số điện thoại */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Số điện thoại
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--foreground)" }}>
                      {data.phone || "—"}
                    </span>
                  </div>

                  {/* Email công việc */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Email công việc
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--foreground)" }}>
                      {data.workEmail || "—"}
                    </span>
                  </div>

                  {/* Bộ phận & Chức vụ */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                        Bộ phận
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--foreground)", wordBreak: "break-word" }}>
                        {data.departmentName || "—"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                        Chức vụ
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--foreground)", wordBreak: "break-word" }}>
                        {getPositionName(data.position)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

                {/* Quá trình công tác Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <i className="bi bi-clock-history" style={{ fontSize: 12, color: "var(--primary)" }} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>
                      Quá trình công tác
                    </span>
                  </div>

                  {/* Timeline of Quá trình công tác */}
                  <div style={{ position: "relative", paddingLeft: 20, borderLeft: "2px solid color-mix(in srgb, var(--primary) 10%, transparent)", marginLeft: 13, paddingTop: 4 }}>
                    {data.employmentHistory && data.employmentHistory.length > 0 ? (
                      [...data.employmentHistory]
                        .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
                        .map((h) => (
                        <div key={h.id} style={{ position: "relative", marginBottom: 20 }}>
                          <div style={{
                            position: "absolute", left: -27, top: 3, width: 12, height: 12,
                            borderRadius: "50%", background: "var(--card)", 
                            border: "3px solid var(--primary)", zIndex: 2,
                          }} />
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {new Date(h.effectiveDate).toLocaleDateString("vi-VN")}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                                {h.type === "promotion" ? "Thăng tiến / Bổ nhiệm" : h.type === "transfer" ? "Điều chuyển công tác" : h.newPosition || "Thay đổi thông tin"}
                              </h4>
                              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                                {h.newPosition && <div>Vị trí mới: <b>{getPositionName(h.newPosition)}</b></div>}
                                {h.newDept && <div>Phòng ban: <b>{h.newDept}</b></div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : null}

                    {/* Entry Event */}
                    <div style={{ position: "relative", marginBottom: 5 }}>
                      <div style={{
                        position: "absolute", left: -27, top: 3, width: 12, height: 12,
                        borderRadius: "50%", background: "var(--card)", 
                        border: "3px solid var(--success)", zIndex: 2,
                      }} />
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {data.startDate ? new Date(data.startDate).toLocaleDateString("vi-VN") : "—"}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                            Gia nhập công ty
                          </h4>
                          <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.3 }}>
                            Bắt đầu làm việc chính thức tại bộ phận <b>{data.departmentName}</b> với vị trí <b>{getPositionName(data.position)}</b>.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

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
