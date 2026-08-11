"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";

interface BranchOption {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  // Group 1 – Personal Info
  branchCode: string;  // Chi nhánh
  code: string;
  fullName: string;
  avatarUrl: string;
  birthDate: string;
  gender: string;
  nationalId: string;
  nationalIdDate: string;
  nationalIdPlace: string;
  permanentAddress: string;
  currentAddress: string;
  phone: string;
  personalEmail: string;
  workEmail: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;

  // Group 2 – Employment Info
  departmentCode: string;
  departmentName: string;
  position: string;
  level: string;
  manager: string;
  employeeType: string;
  startDate: string;
  workLocation: string;

  // Group 3 – Contract & Legal
  contractType: string;
  contractNumber: string;
  contractSignDate: string;
  contractEndDate: string;
  profileStatus: string;
  socialInsuranceNumber: string;
  taxCode: string;

  // Group 4 – Salary & Benefits
  baseSalary: string;
  insuranceSalary: string;
  mealAllowance: string;
  fuelAllowance: string;
  phoneAllowance: string;
  seniorityAllowance: string;
  bankAccount: string;
  bankName: string;
  bankBranch: string;
  dependents: string;

  // Group 5 – Skills & Development
  skills: string;
  softSkills: string;
  education: string;
  certifications: string;

  // Group 6 – Attendance
  annualLeave: string;
  workShift: string;
  notes: string;
  isInsuranceEnrolled: boolean;
  // Probation extras
  mentorId?: string;
  probationValue?: string;
  probationUnit?: string;
  trainingPlan?: string;
}

const INITIAL_FORM: FormData = {
  branchCode: "", code: "", fullName: "", avatarUrl: "", birthDate: "", gender: "male",
  nationalId: "", nationalIdDate: "", nationalIdPlace: "Cục Cảnh sát QLHC về TTXH",
  permanentAddress: "", currentAddress: "",
  phone: "", personalEmail: "", workEmail: "",
  emergencyName: "", emergencyRelation: "", emergencyPhone: "",
  departmentCode: "", departmentName: "", position: "", level: "staff",
  manager: "", employeeType: "official", startDate: "", workLocation: "main",
  contractType: "indefinite", contractNumber: "", contractSignDate: "",
  contractEndDate: "", profileStatus: "pending",
  socialInsuranceNumber: "", taxCode: "",
  baseSalary: "", insuranceSalary: "", mealAllowance: "", fuelAllowance: "",
  phoneAllowance: "", seniorityAllowance: "",
  bankAccount: "", bankName: "", bankBranch: "", dependents: "0",
  skills: "", softSkills: "", education: "", certifications: "",
  annualLeave: "12", workShift: "standard", notes: "",
  isInsuranceEnrolled: false,
};

const STEPS = [
  { id: 1, label: "Định danh", icon: "bi-person-vcard", short: "Cá nhân" },
  { id: 2, label: "Công việc", icon: "bi-briefcase", short: "Công việc" },
  { id: 3, label: "Hợp đồng", icon: "bi-file-earmark-text", short: "HĐ và Pháp lý" },
  { id: 4, label: "Lương và Phúc lợi", icon: "bi-cash-stack", short: "Lương & Phúc lợi" },
];

// ─── Field helpers ─────────────────────────────────────────────────────────────
function FieldGroup({ title, icon, children, columns }: {
  title: string; icon: string; children: React.ReactNode; columns?: string;
}) {
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
      <div className="fs-field-group-grid" style={{
        display: "grid",
        gridTemplateColumns: columns ?? "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px 16px",
      }}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label, required, children, fullWidth, narrow, hint,
}: {
  label: string; required?: boolean; children: React.ReactNode;
  fullWidth?: boolean; narrow?: boolean; hint?: string;
}) {
  const col = fullWidth ? "1 / -1" : narrow ? "span 1" : undefined;
  const minW = narrow ? "120px" : undefined;
  return (
    <div style={{ gridColumn: col, minWidth: minW, display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{hint}</span>}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: 10, color: "var(--foreground)", fontSize: 13,
  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: 32,
};

function Input({ value, onChange, type = "text", placeholder, suffix }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; suffix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isNumeric = type === "number";

  const getDisplayValue = () => {
    if (!isNumeric) return value;
    if (!value) return "";
    const clean = value.replace(/\D/g, "");
    if (!clean) return "";
    const num = parseInt(clean, 10);
    return isNaN(num) ? "" : num.toLocaleString("vi-VN");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isNumeric) {
      onChange(e.target.value);
      return;
    }
    const clean = e.target.value.replace(/\D/g, "");
    onChange(clean);
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      <input
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? "numeric" : undefined}
        value={getDisplayValue() ?? ""}
        onChange={handleChange}
        placeholder={undefined}
        style={{
          ...INPUT_STYLE,
          paddingRight: suffix ? (suffix.length > 3 ? 80 : 50) : 10,
          borderColor: focused ? "var(--primary)" : "var(--border)",
          boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)" : "none",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {suffix && (
        <span
          style={{
            position: "absolute",
            right: 12,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--muted-foreground)",
            pointerEvents: "none",
            userSelect: "none",
            textTransform: "none",
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...SELECT_STYLE,
        borderColor: focused ? "var(--primary)" : "var(--border)",
        boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)" : "none",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={undefined}
      rows={rows}
      style={{
        ...INPUT_STYLE,
        resize: "vertical",
        borderColor: focused ? "var(--primary)" : "var(--border)",
        boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)" : "none",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function Step1({ form, set, branches, branchesLoading }: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
  branches: BranchOption[];
  branchesLoading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        set("avatarUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="fs-avatar-form-layout">
        {/* Avatar Upload */}
        <div style={{ flexShrink: 0 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Ảnh đại diện
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 120, height: 150, borderRadius: 16, border: "2px dashed var(--border)",
              background: "var(--muted)", cursor: "pointer", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", position: "relative"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
            ) : (
              <div style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-camera-fill" style={{ fontSize: 24 }} />
                <div style={{ fontSize: 10, marginTop: 4 }}>Tải lên</div>
              </div>
            )}
            {form.avatarUrl && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0"}
              >
                <i className="bi bi-pencil-square" style={{ color: "#fff", fontSize: 20 }} />
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            accept="image/*"
            onChange={handleFileChange}
          />
          {form.avatarUrl && (
            <button 
              onClick={() => set("avatarUrl", "")}
              style={{
                marginTop: 8, background: "none", border: "none", color: "#ef4444",
                fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
              }}
            >
              <i className="bi bi-trash3" /> Xóa ảnh
            </button>
          )}
        </div>

        {/* ── Form Fields ── */}
        <div style={{ flex: 1 }}>
          <FieldGroup title="Thông tin cơ bản" icon="bi-person-fill" columns="1fr 1fr 1fr">
            {/* Chi nhánh */}
            <Field label="Chi nhánh">
              {branchesLoading ? (
                <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ) : branches.length === 0 ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", borderRadius: 10,
                  background: "var(--muted)", border: "1px solid var(--border)",
                  color: "var(--muted-foreground)", fontSize: 13,
                  cursor: "not-allowed", opacity: 0.6,
                }}>
                  <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0 }} />
                  <span>Công ty chưa có chi nhánh</span>
                </div>
              ) : (
                <Select value={form.branchCode} onChange={v => set("branchCode", v)}>
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </Select>
              )}
            </Field>

            {/* Mã nhân viên */}
            <Field label="Mã nhân viên" required>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  value={form.code}
                  readOnly
                  style={{
                    width: "100%", padding: "9px 10px",
                    background: "var(--muted)", border: "1px solid var(--border)",
                    borderRadius: 10, color: "var(--muted-foreground)",
                    fontSize: 12.5, outline: "none", boxSizing: "border-box" as const,
                    cursor: "not-allowed", fontFamily: "monospace", letterSpacing: "0.04em",
                  }}
                />
              </div>
            </Field>

            {/* Họ và tên */}
            <Field label="Họ và tên" required>
              <Input value={form.fullName} onChange={v => set("fullName", v)} placeholder="Nguyễn Văn A" />
            </Field>

            <div className="fs-row-side-by-side">
              {/* Ngày sinh */}
              <Field label="Ngày sinh">
                <Input type="date" value={form.birthDate} onChange={v => set("birthDate", v)} />
              </Field>

              {/* Giới tính */}
              <Field label="Giới tính">
                <Select value={form.gender} onChange={v => set("gender", v)}>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </Select>
              </Field>
            </div>
          </FieldGroup>
        </div>
      </div>

      <FieldGroup title="CCCD / Hộ chiếu" icon="bi-card-text" columns="1fr 1fr 1fr">
        <div className="fs-row-cccd-date">
          <Field label="Số CCCD / Hộ chiếu">
            <Input value={form.nationalId} onChange={v => set("nationalId", v)} placeholder="012xxxxxxxxx" />
          </Field>
          <Field label="Ngày cấp">
            <Input type="date" value={form.nationalIdDate} onChange={v => set("nationalIdDate", v)} />
          </Field>
        </div>
        <Field label="Nơi cấp">
          <Input value={form.nationalIdPlace} onChange={v => set("nationalIdPlace", v)} placeholder="Cục Cảnh sát QLHC về TTXH" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Địa chỉ" icon="bi-house-door" columns="1fr 1fr">
        <Field label="Địa chỉ thường trú">
          <Input value={form.permanentAddress} onChange={v => set("permanentAddress", v)} placeholder="Số nhà, đường, phường, quận, tỉnh..." />
        </Field>
        <Field label="Địa chỉ tạm trú (nơi ở hiện tại)">
          <Input value={form.currentAddress} onChange={v => set("currentAddress", v)} placeholder="Để trống nếu giống thường trú" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Thông tin liên lạc" icon="bi-telephone" columns="1fr 1fr 1fr">
        <div className="fs-row-phone-email">
          <Field label="SĐT cá nhân">
            <Input type="tel" value={form.phone} onChange={v => set("phone", v)} placeholder="0912 345 678" />
          </Field>
          <Field label="Email cá nhân">
            <Input type="email" value={form.personalEmail} onChange={v => set("personalEmail", v)} placeholder="name@gmail.com" />
          </Field>
        </div>
        <Field label="Email công ty (Email đăng nhập)" required hint={`Định dạng gợi ý: ho.ten@${form.workEmail?.split("@")[1] || "seajong.com"}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <i className="bi bi-envelope-at-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--primary)" }} />
            <input
              type="email"
              value={form.workEmail}
              onChange={e => set("workEmail", e.target.value)}
              style={{
                width: "100%", padding: "9px 10px",
                background: "var(--background)", border: "1px solid var(--border)",
                borderRadius: 10, color: "var(--foreground)",
                fontSize: 13, outline: "none", boxSizing: "border-box" as const,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
        </Field>
      </FieldGroup>

      <FieldGroup title="Liên hệ khẩn cấp" icon="bi-person-heart" columns="1fr 1fr 1fr">
        <div className="fs-row-side-by-side">
          <Field label="Tên người thân">
            <Input value={form.emergencyName} onChange={v => set("emergencyName", v)} placeholder="Nguyễn Thị B" />
          </Field>
          <Field label="Mối quan hệ">
            <Select value={form.emergencyRelation} onChange={v => set("emergencyRelation", v)}>
              <option value="">-- Chọn --</option>
              <option value="spouse">Vợ/Chồng</option>
              <option value="parent">Bố/Mẹ</option>
              <option value="sibling">Anh/Chị/Em</option>
              <option value="child">Con</option>
              <option value="other">Khác</option>
            </Select>
          </Field>
        </div>
        <Field label="SĐT liên hệ khẩn cấp">
          <Input type="tel" value={form.emergencyPhone} onChange={v => set("emergencyPhone", v)} placeholder="0912 345 678" />
        </Field>
      </FieldGroup>
    </>
  );
}

interface DeptOption { id: string; code: string; nameVi: string; group: string; icon: string | null; }
interface ManagerOption { id: string; code: string; fullName: string; position: string; departmentName: string; }

const GROUP_LABELS: Record<string, string> = {
  management: "Quản lý cấp cao",
  core: "Phòng ban lõi",
  business: "Kinh doanh",
  support: "Hỗ trợ và Vận hành",
};

const LEVEL_LABEL: Record<string, string> = {
  staff: "Nhân viên",
  mid_manager: "Quản lý cấp trung",
  senior_manager: "Quản lý cấp cao",
};

const MANAGER_HINT: Record<string, string> = {
  staff: "Hiển thị Quản lý cấp trung",
  mid_manager: "Hiển thị Quản lý cấp cao",
  senior_manager: "Không có quản lý cấp trên",
};

function Step2({ 
  form, 
  set, 
  depts, 
  positions, 
  levels, 
  workLocations, 
  loading 
}: { 
  form: FormData; 
  set: (k: keyof FormData, v: string) => void;
  depts: DeptOption[];
  positions: { code: string; name: string }[];
  levels: { code: string; name: string; sortOrder: number }[];
  workLocations: { code: string; name: string }[];
  loading: boolean;
}) {
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);

  const prevLevelRef = useRef(form.level);

  // Fetch managers whenever level changes
  useEffect(() => {
    if (form.level === "senior_manager") {
      if (prevLevelRef.current !== form.level) {
        set("manager", ""); // clear
      }
      setManagers([]);
      prevLevelRef.current = form.level;
      return;
    }
    setManagersLoading(true);
    if (prevLevelRef.current !== form.level) {
      set("manager", ""); // reset on actual level change
    }
    fetch(`/api/hr/managers?forLevel=${form.level}`)
      .then(r => r.json())
      .then(d => setManagers(d.managers ?? []))
      .catch(() => setManagers([]))
      .finally(() => {
        setManagersLoading(false);
        prevLevelRef.current = form.level;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.level]);

  // Group departments
  const grouped = depts.reduce<Record<string, DeptOption[]>>((acc, d) => {
    if (!acc[d.group]) acc[d.group] = [];
    acc[d.group].push(d);
    return acc;
  }, {});
  const groupOrder = ["management", "core", "business", "support"];

  const handleDept = (code: string) => {
    const dept = depts.find(d => d.code === code);
    set("departmentCode", code);
    set("departmentName", dept?.nameVi ?? "");
  };

  // Resolve current level sortOrder to know if we are the highest
  const currentLevelObj = levels.find(l => l.code === form.level);
  const isSenior = currentLevelObj ? currentLevelObj.sortOrder === 1 : form.level === "senior_manager";

  // Hint mapping dynamic
  const getManagerHint = () => {
    if (isSenior) return "Không có quản lý cấp trên";
    if (currentLevelObj) {
      const parentLevel = levels.find(l => l.sortOrder === currentLevelObj.sortOrder - 1);
      return parentLevel ? `Hiển thị ${parentLevel.name}` : "Hiển thị Quản lý cấp trên";
    }
    return MANAGER_HINT[form.level] ?? "Hiển thị Quản lý cấp trên";
  };
  const getEmptyManagerText = () => {
    if (currentLevelObj) {
      const parentLevel = levels.find(l => l.sortOrder === currentLevelObj.sortOrder - 1);
      return parentLevel ? parentLevel.name : "Quản lý cấp trên";
    }
    return LEVEL_LABEL[form.level === "staff" ? "mid_manager" : "senior_manager"] ?? "Quản lý cấp trên";
  };

  // Shared select style
  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "9px 32px 9px 12px",
    background: "var(--background)", border: "1px solid var(--border)",
    borderRadius: 10, fontSize: 13, outline: "none",
    boxSizing: "border-box", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
    transition: "border-color 0.15s, box-shadow 0.15s",
    color: "var(--foreground)",
  };

  return (
    <>
      <FieldGroup title="Vị trí và Tổ chức" icon="bi-diagram-3" columns="1fr 1fr 1fr">
        {/* Phòng ban — select từ DB */}
        <Field label="Phòng ban / Bộ phận" required>
          {loading ? (
            <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ) : (
            <select
              value={form.departmentCode}
              onChange={e => handleDept(e.target.value)}
              style={{ ...selectStyle, color: form.departmentCode ? "var(--foreground)" : "var(--muted-foreground)" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <option value="">Chọn phòng ban</option>
              {groupOrder.map(grp => grouped[grp] ? (
                <optgroup key={grp} label={GROUP_LABELS[grp] ?? grp}>
                  {grouped[grp].map(d => (
                    <option key={d.code} value={d.code}>{d.nameVi}</option>
                  ))}
                </optgroup>
              ) : null)}
            </select>
          )}
        </Field>

        <div className="fs-row-side-by-side">
          <Field label="Chức vụ / Vị trí" required>
            {loading ? (
              <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ) : (
              <select
                value={form.position}
                onChange={e => set("position", e.target.value)}
                style={{ ...selectStyle, color: form.position ? "var(--foreground)" : "var(--muted-foreground)" }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <option value="">Chọn chức vụ/vị trí</option>
                {positions.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Cấp bậc (Grade/Level)" required>
            {loading ? (
              <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ) : (
              <select
                value={form.level}
                onChange={e => set("level", e.target.value)}
                style={{ ...selectStyle, color: form.level ? "var(--foreground)" : "var(--muted-foreground)" }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <option value="">Chọn cấp bậc</option>
                {levels.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Quản lý và Phân loại" icon="bi-person-check" columns="1fr 1fr">
        {/* Người quản lý trực tiếp */}
        <Field
          label="Người quản lý trực tiếp"
          hint={getManagerHint()}
        >
          {isSenior ? (
            /* Quản lý cấp cao → khoá lại */
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--muted-foreground)" }} />
              <input
                readOnly disabled value="Không áp dụng"
                style={{
                  width: "100%", padding: "9px 10px",
                  background: "var(--muted)", border: "1px solid var(--border)",
                  borderRadius: 10, color: "var(--muted-foreground)",
                  fontSize: 13, outline: "none", boxSizing: "border-box" as const,
                  cursor: "not-allowed",
                }}
              />
            </div>
          ) : managersLoading ? (
            <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ) : (
            <select
              value={form.manager}
              onChange={e => set("manager", e.target.value)}
              style={{ ...selectStyle, color: form.manager ? "var(--foreground)" : "var(--muted-foreground)" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <option value="">
                {managers.length === 0
                  ? `Chưa có ${getEmptyManagerText()} nào`
                  : `Chọn ${getEmptyManagerText()}`
                }
              </option>
              {managers.map(m => (
                <option key={m.id} value={m.code}>
                  {m.fullName}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Địa điểm làm việc">
          {loading ? (
            <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ) : (
            <select
              value={form.workLocation}
              onChange={e => set("workLocation", e.target.value)}
              style={{ ...selectStyle, color: form.workLocation ? "var(--foreground)" : "var(--muted-foreground)" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <option value="">Chọn địa điểm làm việc</option>
              {workLocations.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          )}
        </Field>

        <div className="fs-row-side-by-side">
          <Field label="Loại nhân viên">
            <Select value={form.employeeType} onChange={v => set("employeeType", v)}>
              <option value="official">Chính thức</option>
              <option value="probation">Thử việc</option>
              <option value="intern">Thực tập sinh</option>
              <option value="collaborator">Cộng tác viên</option>
            </Select>
          </Field>

          <Field label="Ngày bắt đầu" required>
            <Input type="date" value={form.startDate} onChange={v => set("startDate", v)} />
          </Field>
        </div>
      </FieldGroup>
    </>
  );
}


function Step3({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  const noContract = form.contractType === "unsigned";
  const noEndDate = form.contractType === "indefinite" || form.contractType === "unsigned";

  // Shared readonly input style
  const lockedStyle: React.CSSProperties = {
    width: "100%", padding: "9px 10px",
    background: "var(--muted)", border: "1px solid var(--border)",
    borderRadius: 10, color: "var(--muted-foreground)",
    fontSize: 13, outline: "none", boxSizing: "border-box",
    cursor: "not-allowed",
  };

  return (
    <>
      <FieldGroup title="Hợp đồng lao động" icon="bi-file-earmark-check" columns="1fr 1fr 1fr 1fr">
        {/* Loại hợp đồng */}
        <Field label="Loại hợp đồng">
          <Select
            value={form.contractType}
            onChange={v => {
              set("contractType", v);
              // Khi chọn "Chưa ký" hoặc "Không xác định" → clear end date
              if (v === "unsigned" || v === "indefinite") set("contractEndDate", "");
              if (v === "unsigned") { set("contractNumber", ""); set("contractSignDate", ""); }
            }}
          >
            <option value="unsigned">Chưa ký hợp đồng</option>
            <option value="probation">Hợp đồng thử việc</option>
            <option value="definite">Hợp đồng có xác định thời hạn</option>
            <option value="indefinite">Hợp đồng không xác định thời hạn</option>
          </Select>
        </Field>

        {/* Số hợp đồng */}
        <Field label="Số hợp đồng">
          {noContract ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--muted-foreground)" }} />
              <input readOnly value="" placeholder="—" style={lockedStyle} />
            </div>
          ) : (
            <Input value={form.contractNumber} onChange={v => set("contractNumber", v)} placeholder="HĐ-2025-001" />
          )}
        </Field>

        <div className="fs-row-side-by-side">
          {/* Ngày ký */}
          <Field label="Ngày ký">
            {noContract ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--muted-foreground)" }} />
                <input readOnly value="" placeholder="—" style={lockedStyle} />
              </div>
            ) : (
              <Input type="date" value={form.contractSignDate} onChange={v => set("contractSignDate", v)} />
            )}
          </Field>

          {/* Ngày hết hạn */}
          <Field
            label="Ngày hết hạn"
            hint={noEndDate ? (noContract ? "Chưa ký hợp đồng" : "Không xác định") : undefined}
          >
            {noEndDate ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--muted-foreground)" }} />
                <input readOnly value="" placeholder="—" style={lockedStyle} />
              </div>
            ) : (
              <Input type="date" value={form.contractEndDate} onChange={v => set("contractEndDate", v)} />
            )}
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Bảo hiểm và Pháp lý" icon="bi-shield-check" columns="1fr 1fr 1fr 1fr">
        <Field label="Tình trạng hồ sơ">
          <Select value={form.profileStatus} onChange={v => set("profileStatus", v)}>
            <option value="complete">Đã nộp đầy đủ</option>
            <option value="partial">Còn thiếu giấy tờ</option>
            <option value="pending">Chưa nộp hồ sơ</option>
          </Select>
        </Field>
        <div className="fs-row-side-by-side">
          <Field label="Số sổ BHXH">
            <Input value={form.socialInsuranceNumber} onChange={v => set("socialInsuranceNumber", v)} placeholder="0123456789" />
          </Field>
          <Field label="Mã số thuế">
            <Input value={form.taxCode} onChange={v => set("taxCode", v)} placeholder="8xxxxxxxxx" />
          </Field>
        </div>
        <Field label="Tham gia đóng bảo hiểm">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div 
              onClick={() => set("isInsuranceEnrolled", !form.isInsuranceEnrolled as any)}
              style={{
                width: 44, height: 22, borderRadius: 11,
                background: form.isInsuranceEnrolled ? "var(--primary)" : "var(--muted)",
                position: "relative", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: form.isInsuranceEnrolled ? 24 : 2,
                transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: form.isInsuranceEnrolled ? "var(--primary)" : "var(--muted-foreground)" }}>
              {form.isInsuranceEnrolled ? "Đang tham gia" : "Không tham gia"}
            </span>
          </div>
        </Field>
      </FieldGroup>
    </>
  );
}


function Step4({ 
  form, 
  set, 
  positions, 
  depts 
}: { 
  form: FormData; 
  set: (k: keyof FormData, v: string) => void;
  positions: { code: string; name: string }[];
  depts: DeptOption[];
}) {
  const getPositionName = (code: string) => {
    const p = positions.find(pos => pos.code === code);
    return p ? p.name : code;
  };

  return (
    <>
      <FieldGroup title="Lương và Phụ cấp" icon="bi-cash-stack" columns="1fr 1fr 1fr">
        <div className="fs-row-side-by-side">
          <Field label="Lương cơ bản">
            <Input type="number" value={form.baseSalary} onChange={v => set("baseSalary", v)} suffix="vnđ" />
          </Field>
          <Field label="Lương đóng bảo hiểm">
            <Input type="number" value={form.insuranceSalary} onChange={v => set("insuranceSalary", v)} suffix="vnđ" />
          </Field>
        </div>
        <div className="fs-row-side-by-side">
          <Field label="Phụ cấp ăn trưa">
            <Input type="number" value={form.mealAllowance} onChange={v => set("mealAllowance", v)} suffix="vnđ/ngày" />
          </Field>
          <Field label="Phụ cấp xăng xe">
            <Input type="number" value={form.fuelAllowance} onChange={v => set("fuelAllowance", v)} suffix="vnđ" />
          </Field>
        </div>
        <div className="fs-row-side-by-side">
          <Field label="Phụ cấp điện thoại">
            <Input type="number" value={form.phoneAllowance} onChange={v => set("phoneAllowance", v)} suffix="vnđ" />
          </Field>
          <Field label="Phụ cấp thâm niên">
            <Input type="number" value={form.seniorityAllowance} onChange={v => set("seniorityAllowance", v)} suffix="vnđ" />
          </Field>
        </div>
        <Field label="Số người phụ thuộc" hint="Để tính thuế TNCN">
          <Input type="number" value={form.dependents} onChange={v => set("dependents", v)} placeholder="0" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Tài khoản ngân hàng" icon="bi-bank" columns="1fr 1fr 1fr">
        <Field label="Số tài khoản">
          <Input value={form.bankAccount} onChange={v => set("bankAccount", v)} placeholder="19034xxxxxxxxxx" />
        </Field>
        <Field label="Tên ngân hàng">
          <Input value={form.bankName} onChange={v => set("bankName", v)} placeholder="Techcombank" />
        </Field>
        <Field label="Chi nhánh ngân hàng">
          <Input value={form.bankBranch} onChange={v => set("bankBranch", v)} placeholder="TP. Hồ Chí Minh" />
        </Field>
      </FieldGroup>

    </>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onCreated: () => void;
  departments: { code: string; name: string }[];
  initialData?: Partial<FormData>;
  employeeId?: string; // Nếu có → edit mode
}

export default function CreateEmployeeModal({ onClose, onCreated, departments, initialData, employeeId }: Props) {
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const isEditMode = !!employeeId;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, ...(initialData ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; tempPassword: string } | null>(null);

  const [emailDomain, setEmailDomain] = useState("company.com");
  const [depts, setDepts] = useState<DeptOption[]>([]);
  const [positions, setPositions] = useState<{ code: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ code: string; name: string; sortOrder: number }[]>([]);
  const [workLocations, setWorkLocations] = useState<{ code: string; name: string }[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Fetch domain email từ CompanyInfo.shortName
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [companyRes, deptsRes, posRes, levelsRes, locRes] = await Promise.all([
          fetch("/api/company", { cache: "no-store" }),
          fetch("/api/hr/departments"),
          fetch("/api/board/categories?type=position"),
          fetch("/api/board/categories?type=cap_bac"),
          fetch("/api/board/categories?type=dia_diem_lam_viec"),
        ]);

        const company = await companyRes.json();
        if (company?.shortName) setEmailDomain(`${company.shortName}.com`);

        const d = await deptsRes.json();
        setDepts(d.departments ?? []);

        const p = await posRes.json();
        setPositions(p ?? []);

        const l = await levelsRes.json();
        setLevels(l ?? []);

        const w = await locRes.json();
        setWorkLocations(w ?? []);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      } finally {
        setLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, []);

  const set = (k: keyof FormData, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }));

  // ── Fetch employee data if edit mode ───────────────────────────────────────
  useEffect(() => {
    if (isEditMode && employeeId) {
      const fetchEmployee = async () => {
        try {
          const res = await fetch(`/api/hr/employees/${employeeId}`);
          if (!res.ok) throw new Error("Failed to fetch employee");
          const result = await res.json();
          const data = result.employee;
          
          if (!data) throw new Error("No data found");
          
          // Map data to form state (format dates for HTML input)
          const formatDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : "";
          
          setForm({
            branchCode: data.branchCode || "",
            code: data.code || "",
            fullName: data.fullName || "",
            avatarUrl: data.avatarUrl || "",
            birthDate: formatDate(data.birthDate),
            gender: data.gender || "male",
            nationalId: data.nationalId || "",
            nationalIdDate: formatDate(data.nationalIdDate),
            nationalIdPlace: data.nationalIdPlace || "",
            permanentAddress: data.permanentAddress || "",
            currentAddress: data.currentAddress || "",
            phone: data.phone || "",
            personalEmail: data.personalEmail || "",
            workEmail: data.workEmail || "",
            emergencyName: data.emergencyName || "",
            emergencyRelation: data.emergencyRelation || "",
            emergencyPhone: data.emergencyPhone || "",
            departmentCode: data.departmentCode || "",
            departmentName: data.departmentName || "",
            position: data.position || "",
            level: data.level || "staff",
            manager: data.manager || "",
            employeeType: data.employeeType || "official",
            startDate: formatDate(data.startDate),
            workLocation: data.workLocation || "main",
            contractType: data.contractType || "unsigned",
            contractNumber: data.contractNumber || "",
            contractSignDate: formatDate(data.contractSignDate),
            contractEndDate: formatDate(data.contractEndDate),
            profileStatus: data.profileStatus || "pending",
            socialInsuranceNumber: data.socialInsuranceNumber || "",
            taxCode: data.taxCode || "",
            baseSalary: data.baseSalary ? String(data.baseSalary) : "",
            insuranceSalary: data.insuranceSalary ? String(data.insuranceSalary) : "",
            mealAllowance: data.mealAllowance ? String(data.mealAllowance) : "",
            fuelAllowance: data.fuelAllowance ? String(data.fuelAllowance) : "",
            phoneAllowance: data.phoneAllowance ? String(data.phoneAllowance) : "",
            seniorityAllowance: data.seniorityAllowance ? String(data.seniorityAllowance) : "",
            bankAccount: data.bankAccount || "",
            bankName: data.bankName || "",
            bankBranch: data.bankBranch || "",
            dependents: String(data.dependents || 0),
            skills: data.skills || "",
            softSkills: data.softSkills || "",
            education: data.education || "",
            certifications: data.certifications || "",
            annualLeave: String(data.annualLeave || 12),
            workShift: data.workShift || "standard",
            notes: data.notes || "",
            isInsuranceEnrolled: !!data.isInsuranceEnrolled,
          });
        } catch (err) {
          setError("Không thể tải thông tin nhân sự để chỉnh sửa");
        }
      };
      fetchEmployee();
    }
  }, [isEditMode, employeeId]);

  // ── Helper: generate employee code ──────────────────────────────────────────
  const generateCode = (branchCode: string) => {
    // A — branch prefix
    const A =
      branchCode === "sejong-royal" ? "SEA"
        : branchCode === "seajong" ? "SEJ"
          : "EMP";

    // B — yyyymmdd
    const now = new Date();
    const B = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    // C — last 4 digits of timestamp
    const C = Date.now().toString().slice(-4);

    // D — 4 random alphanumeric characters
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const D = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    return `${A}-${B}-${C}-${D}`;
  };

  // Auto-generate on mount (chỉ khi tạo mới)
  useEffect(() => {
    if (!isEditMode) set("code", generateCode(form.branchCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate when branch changes (chỉ khi tạo mới)
  useEffect(() => {
    if (!isEditMode && form.branchCode !== undefined) {
      set("code", generateCode(form.branchCode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branchCode]);

  // ── Helper: Vietnamese → slug ─────────────────────────────────────────────
  const toSlug = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")     // strip diacritics
      .replace(/\u0111/g, "d")             // đ → d
      .replace(/\u0110/g, "D")             // Đ → D
      .replace(/[^a-zA-Z0-9]/g, "")       // remove non-alphanumeric
      .toLowerCase();
  };

  // Auto-generate workEmail khi fullName thay đổi (chỉ khi tạo mới)
  useEffect(() => {
    if (isEditMode) return; // edit mode: giữ email gốc
    const slug = toSlug(form.fullName);
    set("workEmail", slug ? `${slug}@${emailDomain}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fullName, emailDomain]);

  // Fetch branches on mount
  useEffect(() => {
    fetch("/api/hr/branches")
      .then(r => r.json())
      .then(d => setBranches(d.branches ?? []))
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, []);

  const validateStep = (s: number) => {
    if (s === 1 && (!form.code || !form.fullName || !form.workEmail)) return false;
    if (s === 2 && (!form.departmentCode || !form.departmentName || !form.position || !form.startDate)) return false;
    return true;
  };

  const handleNext = () => {
    setTouched(true);
    if (!validateStep(step)) return;
    setTouched(false);
    setStep(s => Math.min(4, s + 1));
    window.scrollTo(0, 0);
  };

  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async () => {
    setTouched(true);
    if (!validateStep(1) || !validateStep(2)) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc (bước 1 và 2).");
      return;
    }
















    setSaving(true);
    setError(null);
    try {
      const payload = {
        // Bước 1
        branchCode: form.branchCode || null,
        code: form.code.trim(),
        fullName: form.fullName.trim(),
        avatarUrl: form.avatarUrl || null,
        gender: form.gender,
        birthDate: form.birthDate || null,
        nationalId: form.nationalId || null,
        nationalIdDate: form.nationalIdDate || null,
        nationalIdPlace: form.nationalIdPlace || null,
        permanentAddress: form.permanentAddress || null,
        currentAddress: form.currentAddress || null,
        phone: form.phone || null,
        workEmail: form.workEmail.trim(),
        personalEmail: form.personalEmail || null,
        emergencyName: form.emergencyName || null,
        emergencyRelation: form.emergencyRelation || null,
        emergencyPhone: form.emergencyPhone || null,
        // Bước 2
        departmentCode: form.departmentCode.trim(),
        departmentName: form.departmentName.trim(),
        position: form.position.trim(),
        level: form.level,
        manager: form.manager || null,
        employeeType: form.employeeType,
        startDate: form.startDate || null,
        workLocation: form.workLocation,
        // Bước 3
        contractType: form.contractType,
        contractNumber: form.contractNumber || null,
        contractSignDate: form.contractSignDate || null,
        contractEndDate: form.contractEndDate || null,
        profileStatus: form.profileStatus,
        socialInsuranceNumber: form.socialInsuranceNumber || null,
        taxCode: form.taxCode || null,
        isInsuranceEnrolled: form.isInsuranceEnrolled,
        // Bước 4
        baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
        insuranceSalary: form.insuranceSalary ? Number(form.insuranceSalary) : null,
        mealAllowance: form.mealAllowance ? Number(form.mealAllowance) : null,
        fuelAllowance: form.fuelAllowance ? Number(form.fuelAllowance) : null,
        phoneAllowance: form.phoneAllowance ? Number(form.phoneAllowance) : null,
        seniorityAllowance: form.seniorityAllowance ? Number(form.seniorityAllowance) : null,
        bankAccount: form.bankAccount || null,
        bankName: form.bankName || null,
        bankBranch: form.bankBranch || null,
        dependents: Number(form.dependents) || 0,
      };

      const url = isEditMode ? `/api/hr/employees/${employeeId}` : "/api/hr/employees";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Lỗi ${res.status}`);
          }

          const data = await res.json();
          if (!isEditMode && data.tempPassword) {
            setCreatedAccount({
              email: data.loginEmail || payload.workEmail,
              tempPassword: data.tempPassword,
            });
          } else {
            onCreated();
          }
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
          setSaving(false);
        }
      };

      const isFirstStepInvalid = touched && !validateStep(step);

      const stepContent = [
        <Step1 key={1} form={form} set={set} branches={branches} branchesLoading={branchesLoading} />,
        <Step2 key={2} form={form} set={set} depts={depts} positions={positions} levels={levels} workLocations={workLocations} loading={loadingMetadata} />,
        <Step3 key={3} form={form} set={set} />,
        <Step4 key={4} form={form} set={set} positions={positions} depts={depts} />,
      ];

      return createPortal(
        <>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            .offcanvas-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.4);
              z-index: 1040;
              transition: opacity 0.3s ease;
              opacity: 0;
              pointer-events: none;
            }
            .offcanvas-backdrop.show {
              opacity: 1;
              pointer-events: auto;
            }
            .offcanvas {
              position: fixed;
              top: 0;
              right: 0;
              bottom: 0;
              width: 100%;
              max-width: 400px;
              height: 100vh;
              display: flex;
              flex-direction: column;
              box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
              transition: transform 0.3s ease-in-out, visibility 0.3s;
              transform: translateX(100%);
              background: var(--background);
              z-index: 1045;
              visibility: hidden;
            }
            .offcanvas.show {
              transform: translateX(0);
              visibility: visible;
            }
            .offcanvas-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 20px;
              border-bottom: 1px solid var(--border);
              flex-shrink: 0;
            }
            .offcanvas-body {
              flex: 1;
              overflow-y: auto;
              padding: 20px;
            }
            .offcanvas-footer {
              padding: 16px 20px;
              border-top: 1px solid var(--border);
              background: var(--card);
              flex-shrink: 0;
            }
            
            /* Force vertical stacking/1-column layouts inside offcanvas */
            .fs-field-group-grid {
              display: grid;
              grid-template-columns: 1fr !important;
              gap: 14px !important;
            }
            .fs-grid-row-2col {
              display: grid;
              grid-template-columns: 1fr !important;
              grid-column: span 1 !important;
              gap: 14px !important;
            }
            .fs-row-side-by-side {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 12px !important;
            }
            .fs-row-cccd-date {
              display: grid !important;
              grid-template-columns: 1.6fr 1fr !important;
              gap: 12px !important;
            }
            .fs-row-phone-email {
              display: grid !important;
              grid-template-columns: 1fr 1.4fr !important;
              gap: 12px !important;
            }
            
            /* Compact typography/spacing for 400px offcanvas */
            .app-card {
              padding: 16px !important;
              margin-bottom: 16px !important;
              border-radius: 12px !important;
            }
            .app-card-title {
              font-size: 13.5px !important;
              margin-bottom: 12px !important;
            }
            .form-label {
              font-size: 11px !important;
              font-weight: 600 !important;
              margin-bottom: 3px !important;
              color: var(--muted-foreground) !important;
            }
            .form-control, .form-select {
              font-size: 12.5px !important;
              padding: 7px 10px !important;
              border-radius: 6px !important;
              height: 36px !important;
            }
            textarea.form-control {
              height: auto !important;
              min-height: 60px !important;
            }

            /* Avatar styling in offcanvas */
            .fs-avatar-form-layout {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              gap: 16px !important;
              width: 100% !important;
              margin-bottom: 16px !important;
            }
            .fs-avatar-form-layout > div {
              width: 100% !important;
            }
            .fs-avatar-form-layout > div:first-child {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 4px;
            }
          `}</style>

          {/* Backdrop */}
          <div
            className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
            onClick={handleClose}
          />

          {/* Success Dialog overlay */}
          {createdAccount && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 1200,
              background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16,
            }}>
              <div style={{
                background: "var(--card)", borderRadius: 20,
                padding: "32px 24px", maxWidth: 360, width: "100%",
                boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
                textAlign: "center",
              }}>
                {/* Icon thành công */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
                  background: "rgba(16,185,129,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className="bi bi-person-check-fill" style={{ fontSize: 28, color: "#10b981" }} />
                </div>
                <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "var(--foreground)" }}>
                  Tạo nhân viên thành công!
                </h2>
                <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "var(--muted-foreground)" }}>
                  Tài khoản đăng nhập đã được tạo tự động. Vui lòng ghi lại và trao cho nhân viên.
                </p>

                {/* Thông tin đăng nhập */}
                <div style={{
                  background: "var(--background)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "16px 18px", textAlign: "left", marginBottom: 20,
                }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: "var(--muted-foreground)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                    Thông tin đăng nhập lần đầu
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <i className="bi bi-envelope-fill" style={{ fontSize: 12, color: "var(--primary)", width: 16, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Email đăng nhập</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "monospace", wordBreak: "break-all" }}>{createdAccount.email}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <i className="bi bi-key-fill" style={{ fontSize: 12, color: "#f59e0b", width: 16, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Mật khẩu tạm thời</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b", fontFamily: "monospace", letterSpacing: "0.08em" }}>{createdAccount.tempPassword}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    ⚠️ Nhân viên nên đổi mật khẩu ngay sau lần đăng nhập đầu tiên.
                  </div>
                </div>

                <button
                  onClick={() => { setCreatedAccount(null); onCreated(); }}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 10,
                    background: "var(--primary)", color: "#fff",
                    border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 3px 10px color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                >
                  <i className="bi bi-check-circle-fill" style={{ marginRight: 6 }} />
                  Hoàn tất
                </button>
              </div>
            </div>
          )}

          {/* Drawer Container */}
          <div className={`offcanvas offcanvas-end ${open ? "show" : ""}`}>
            {/* Header */}
            <div className="offcanvas-header" style={{ background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className="bi bi-person-plus-fill" style={{ fontSize: 13, color: "var(--primary)" }} />
                </div>
                <h5 className="mb-0 fw-bold" style={{ fontSize: 15, color: "var(--foreground)" }}>
                  {isEditMode ? "Chỉnh sửa nhân sự" : "Tạo nhân viên mới"}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
                style={{ fontSize: 12 }}
              />
            </div>

            {/* Body */}
            <div className="offcanvas-body">
              {/* Stepper progress dots */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, gap: 6 }}>
                {STEPS.map(s => {
                  const isCurrent = step === s.id;
                  const isDone = s.id < step;
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => {
                        if (validateStep(s.id - 1) || s.id < step) {
                          setStep(s.id);
                        }
                      }}
                      style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: isCurrent ? "var(--primary)" : isDone ? "#10b981" : "var(--border)",
                        cursor: (validateStep(s.id - 1) || s.id < step) ? "pointer" : "not-allowed",
                        transition: "all 0.2s"
                      }}
                      title={s.label}
                    />
                  );
                })}
              </div>

              {/* Step description heading */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  Bước {step} / {STEPS.length} — {STEPS[step - 1].label}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                  {[
                    "Thông tin định danh cá nhân, liên lạc và địa chỉ",
                    "Vị trí công việc, phòng ban và loại hình nhân viên",
                    "Hợp đồng lao động, hồ sơ pháp lý và bảo hiểm",
                    "Mức lương, phụ cấp và thông tin ngân hàng",
                  ][step - 1]}
                </p>
              </div>

              {/* Validation & Error banners */}
              {isFirstStepInvalid && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10, padding: "8px 12px", marginBottom: 16,
                }}>
                  <i className="bi bi-exclamation-circle-fill" style={{ color: "#ef4444", fontSize: 13, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                    Vui lòng điền đầy đủ các trường bắt buộc (*)
                  </span>
                </div>
              )}
              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10, padding: "8px 12px", marginBottom: 16,
                }}>
                  <i className="bi bi-exclamation-circle-fill" style={{ color: "#ef4444", fontSize: 13, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{error}</span>
                </div>
              )}

              {/* Form Step Content */}
              <div style={{ minHeight: "calc(100vh - 280px)" }}>
                {stepContent[step - 1]}
              </div>
            </div>

            {/* Footer */}
            <div className="offcanvas-footer">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={step === 1}
                  className="btn btn-light border rounded-pill px-3"
                  style={{
                    fontSize: 12.5, height: 36, fontWeight: 600,
                    visibility: step === 1 ? "hidden" : "visible",
                    display: "flex", alignItems: "center", gap: 4
                  }}
                >
                  <i className="bi bi-arrow-left" /> Quay lại
                </button>

                {step < STEPS.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn btn-primary rounded-pill px-4"
                    style={{
                      fontSize: 13, height: 38, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 6,
                      boxShadow: "0 4px 12px color-mix(in srgb, var(--primary) 20%, transparent)"
                    }}
                  >
                    Tiếp theo <i className="bi bi-arrow-right" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn btn-success rounded-pill px-4"
                    style={{
                      fontSize: 13, height: 38, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 6,
                      background: "#10b981", borderColor: "#10b981",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
                    }}
                  >
                    {saving ? (
                      <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    ) : (
                      <i className="bi bi-check-circle-fill" />
                    )}
                    <span>{isEditMode ? "Lưu thay đổi" : "Hoàn thành & Tạo"}</span>
                  </button>
                )}
              </div>

            </div>
        </div>
      </>,
      document.body
    );
  }
