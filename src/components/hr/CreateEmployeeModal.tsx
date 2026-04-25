"use client";

import React, { useEffect, useState, useRef } from "react";
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
}

const INITIAL_FORM: FormData = {
  branchCode: "", code: "", fullName: "", birthDate: "", gender: "male",
  nationalId: "", nationalIdDate: "", nationalIdPlace: "Cục Cảnh sát QLHC về TTXH",
  permanentAddress: "", currentAddress: "",
  phone: "", personalEmail: "", workEmail: "",
  emergencyName: "", emergencyRelation: "", emergencyPhone: "",
  departmentCode: "", departmentName: "", position: "", level: "staff",
  manager: "", employeeType: "official", startDate: "", workLocation: "main",
  contractType: "indefinite", contractNumber: "", contractSignDate: "",
  contractEndDate: "", profileStatus: "pending",
  socialInsuranceNumber: "", taxCode: "",
  baseSalary: "", mealAllowance: "", fuelAllowance: "",
  phoneAllowance: "", seniorityAllowance: "",
  bankAccount: "", bankName: "", bankBranch: "", dependents: "0",
  skills: "", softSkills: "", education: "", certifications: "",
  annualLeave: "12", workShift: "standard", notes: "",
};

const STEPS = [
  { id: 1, label: "Định danh", icon: "bi-person-vcard", short: "Cá nhân" },
  { id: 2, label: "Công việc", icon: "bi-briefcase", short: "Công việc" },
  { id: 3, label: "Hợp đồng", icon: "bi-file-earmark-text", short: "HĐ & Pháp lý" },
  { id: 4, label: "Lương & Phúc lợi", icon: "bi-cash-stack", short: "C&B" },
  { id: 5, label: "Kỹ năng", icon: "bi-award", short: "Kỹ năng" },
  { id: 6, label: "Chuyên cần", icon: "bi-calendar-check", short: "Nghỉ phép" },
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

function Input({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...INPUT_STYLE,
        borderColor: focused ? "var(--primary)" : "var(--border)",
        boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)" : "none",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
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
      placeholder={placeholder}
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
  return (
    <>
      {/* ── Row 1: Chi nhánh | Mã NV | Họ tên | Ngày sinh | Giới tính ── */}
      <FieldGroup title="Thông tin cơ bản" icon="bi-person-fill" columns="4fr 3fr 4fr 3fr 2fr">

        {/* Chi nhánh (4/12) */}
        <Field label="Chi nhánh">
          {branchesLoading ? (
            <div style={{ height: 40, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ) : branches.length === 0 ? (
            /* Khoá khi không có chi nhánh */
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

        {/* Mã nhân viên auto (3/12) */}
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

        {/* Họ và tên (4/12) */}
        <Field label="Họ và tên" required>
          <Input value={form.fullName} onChange={v => set("fullName", v)} placeholder="Nguyễn Văn A" />
        </Field>

        {/* Ngày sinh (3/12) */}
        <Field label="Ngày sinh">
          <Input type="date" value={form.birthDate} onChange={v => set("birthDate", v)} />
        </Field>

        {/* Giới tính (2/12) */}
        <Field label="Giới tính">
          <Select value={form.gender} onChange={v => set("gender", v)}>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </Select>
        </Field>

      </FieldGroup>

      <FieldGroup title="CCCD / Hộ chiếu" icon="bi-card-text" columns="4fr 3fr 5fr">
        {/* Số CCCD (4/12) */}
        <Field label="Số CCCD / Hộ chiếu">
          <Input value={form.nationalId} onChange={v => set("nationalId", v)} placeholder="012xxxxxxxxx" />
        </Field>
        {/* Ngày cấp (3/12) */}
        <Field label="Ngày cấp">
          <Input type="date" value={form.nationalIdDate} onChange={v => set("nationalIdDate", v)} />
        </Field>
        {/* Nơi cấp (5/12) */}
        <Field label="Nơi cấp">
          <Input value={form.nationalIdPlace} onChange={v => set("nationalIdPlace", v)} placeholder="Cục Cảnh sát QLHC về TTXH" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Địa chỉ" icon="bi-house-door">
        <Field label="Địa chỉ thường trú" fullWidth>
          <Input value={form.permanentAddress} onChange={v => set("permanentAddress", v)} placeholder="Số nhà, đường, phường, quận, tỉnh..." />
        </Field>
        <Field label="Địa chỉ tạm trú (nơi ở hiện tại)" fullWidth>
          <Input value={form.currentAddress} onChange={v => set("currentAddress", v)} placeholder="Để trống nếu giống thường trú" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Thông tin liên lạc" icon="bi-telephone">
        <Field label="SĐT cá nhân">
          <Input type="tel" value={form.phone} onChange={v => set("phone", v)} placeholder="0912 345 678" />
        </Field>
        <Field label="Email cá nhân">
          <Input type="email" value={form.personalEmail} onChange={v => set("personalEmail", v)} placeholder="name@gmail.com" />
        </Field>
        <Field label="Email công ty (Email đăng nhập)" required hint={`Tự sinh theo dạng: ho.ten@${form.workEmail?.split("@")[1] || "..."}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <i className="bi bi-lock-fill" style={{ fontSize: 12, flexShrink: 0, color: "var(--muted-foreground)" }} />
            <input
              type="email"
              value={form.workEmail}
              readOnly
              title="Tự sinh từ họ và tên + domain công ty"
              style={{
                width: "100%", padding: "9px 10px",
                background: "var(--muted)", border: "1px solid var(--border)",
                borderRadius: 10, color: "var(--muted-foreground)",
                fontSize: 13, outline: "none", boxSizing: "border-box" as const,
                cursor: "not-allowed",
              }}
            />
          </div>
        </Field>
      </FieldGroup>

      <FieldGroup title="Liên hệ khẩn cấp" icon="bi-person-heart">
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
  support: "Hỗ trợ & Vận hành",
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

function Step2({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  const [depts, setDepts] = useState<DeptOption[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [positions, setPositions] = useState<{ code: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ code: string; name: string; sortOrder: number }[]>([]);
  const [workLocations, setWorkLocations] = useState<{ code: string; name: string }[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [workLocationsLoading, setWorkLocationsLoading] = useState(true);

  // Fetch departments, positions, levels once
  useEffect(() => {
    fetch("/api/hr/departments")
      .then(r => r.json())
      .then(d => setDepts(d.departments ?? []))
      .catch(() => setDepts([]))
      .finally(() => setDeptsLoading(false));

    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d ?? []))
      .catch(() => setPositions([]))
      .finally(() => setPositionsLoading(false));

    fetch("/api/board/categories?type=cap_bac")
      .then(r => r.json())
      .then(d => setLevels(d ?? []))
      .catch(() => setLevels([]))
      .finally(() => setLevelsLoading(false));

    fetch("/api/board/categories?type=dia_diem_lam_viec")
      .then(r => r.json())
      .then(d => setWorkLocations(d ?? []))
      .catch(() => setWorkLocations([]))
      .finally(() => setWorkLocationsLoading(false));
  }, []);

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
      <FieldGroup title="Vị trí & Tổ chức" icon="bi-diagram-3" columns="5fr 4fr 3fr">
        {/* Phòng ban — select từ DB */}
        <Field label="Phòng ban / Bộ phận" required>
          {deptsLoading ? (
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

        <Field label="Chức vụ / Vị trí" required>
          {positionsLoading ? (
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
          {levelsLoading ? (
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
      </FieldGroup>

      <FieldGroup title="Quản lý & Phân loại" icon="bi-person-check">

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

        <Field label="Loại hình nhân viên">
          <Select value={form.employeeType} onChange={v => set("employeeType", v)}>
            <option value="official">Chính thức</option>
            <option value="probation">Thử việc</option>
            <option value="intern">Thực tập sinh</option>
            <option value="collaborator">Cộng tác viên</option>
          </Select>
        </Field>
        <Field label="Ngày bắt đầu làm việc" required>
          <Input type="date" value={form.startDate} onChange={v => set("startDate", v)} />
        </Field>
        <Field label="Địa điểm làm việc">
          {workLocationsLoading ? (
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
      <FieldGroup title="Hợp đồng lao động" icon="bi-file-earmark-check" columns="3fr 3fr 3fr 3fr">

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

        {/* Ngày ký */}
        <Field label="Ngày ký hợp đồng">
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

      </FieldGroup>

      <FieldGroup title="Trạng thái hồ sơ" icon="bi-folder-check">
        <Field label="Tình trạng hồ sơ">
          <Select value={form.profileStatus} onChange={v => set("profileStatus", v)}>
            <option value="complete">Đã nộp đầy đủ</option>
            <option value="partial">Còn thiếu giấy tờ</option>
            <option value="pending">Chưa nộp hồ sơ</option>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup title="Bảo hiểm & Thuế" icon="bi-shield-check">
        <Field label="Số sổ BHXH">
          <Input value={form.socialInsuranceNumber} onChange={v => set("socialInsuranceNumber", v)} placeholder="0123456789" />
        </Field>
        <Field label="Mã số thuế cá nhân (MST)">
          <Input value={form.taxCode} onChange={v => set("taxCode", v)} placeholder="8xxxxxxxxx" />
        </Field>
      </FieldGroup>
    </>
  );
}


function Step4({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <FieldGroup title="Mức lương" icon="bi-cash-stack">
        <Field label="Lương cơ bản (VNĐ)" hint="Lương đóng bảo hiểm">
          <Input type="number" value={form.baseSalary} onChange={v => set("baseSalary", v)} placeholder="10000000" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Các khoản phụ cấp (VNĐ/tháng)" icon="bi-plus-circle">
        <Field label="Phụ cấp ăn trưa">
          <Input type="number" value={form.mealAllowance} onChange={v => set("mealAllowance", v)} placeholder="730000" />
        </Field>
        <Field label="Phụ cấp xăng xe">
          <Input type="number" value={form.fuelAllowance} onChange={v => set("fuelAllowance", v)} placeholder="500000" />
        </Field>
        <Field label="Phụ cấp điện thoại">
          <Input type="number" value={form.phoneAllowance} onChange={v => set("phoneAllowance", v)} placeholder="200000" />
        </Field>
        <Field label="Phụ cấp thâm niên">
          <Input type="number" value={form.seniorityAllowance} onChange={v => set("seniorityAllowance", v)} placeholder="0" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Tài khoản ngân hàng" icon="bi-bank" columns="4fr 6fr 3fr">
        <Field label="Số tài khoản">
          <Input value={form.bankAccount} onChange={v => set("bankAccount", v)} placeholder="19034xxxxxxxxxx" />
        </Field>
        <Field label="Tên ngân hàng">
          <Input value={form.bankName} onChange={v => set("bankName", v)} placeholder="Techcombank" />
        </Field>
        <Field label="Chi nhánh NH">
          <Input value={form.bankBranch} onChange={v => set("bankBranch", v)} placeholder="TP. Hồ Chí Minh" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Giảm trừ gia cảnh" icon="bi-people">
        <Field label="Số người phụ thuộc" hint="Để tính thuế TNCN">
          <Input type="number" value={form.dependents} onChange={v => set("dependents", v)} placeholder="0" />
        </Field>
      </FieldGroup>
    </>
  );
}

function Step5({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <FieldGroup title="Kỹ năng chuyên môn" icon="bi-code-square">
        <Field label="Technical Skills" fullWidth hint="VD: Next.js, Python, SQL, Docker...">
          <Textarea
            value={form.skills}
            onChange={v => set("skills", v)}
            placeholder="Liệt kê các kỹ năng chuyên môn, mỗi kỹ năng cách nhau bởi dấu phẩy"
            rows={3}
          />
        </Field>
        <Field label="Soft Skills" fullWidth>
          <Textarea
            value={form.softSkills}
            onChange={v => set("softSkills", v)}
            placeholder="VD: Lãnh đạo nhóm, Giao tiếp, Quản lý thời gian..."
            rows={3}
          />
        </Field>
      </FieldGroup>

      <FieldGroup title="Học vấn & Chứng chỉ" icon="bi-mortarboard">
        <Field label="Trình độ học vấn" fullWidth>
          <Textarea
            value={form.education}
            onChange={v => set("education", v)}
            placeholder="VD: Đại học CNTT - ĐH Bách Khoa TP.HCM (2018-2022) - Kỹ sư Công nghệ Thông tin"
            rows={3}
          />
        </Field>
        <Field label="Chứng chỉ & Khóa học" fullWidth>
          <Textarea
            value={form.certifications}
            onChange={v => set("certifications", v)}
            placeholder="VD: AWS Solution Architect (2023), IELTS 7.0 (2022)..."
            rows={3}
          />
        </Field>
      </FieldGroup>
    </>
  );
}

function Step6({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <FieldGroup title="Phép năm & Ca làm việc" icon="bi-calendar3">
        <Field label="Số ngày phép năm" hint="Mặc định theo quy định công ty">
          <Input type="number" value={form.annualLeave} onChange={v => set("annualLeave", v)} placeholder="12" />
        </Field>
        <Field label="Ca làm việc">
          <Select value={form.workShift} onChange={v => set("workShift", v)}>
            <option value="standard">Giờ hành chính (8:00 - 17:00)</option>
            <option value="flexible">Giờ linh hoạt</option>
            <option value="shift_a">Ca A (6:00 - 14:00)</option>
            <option value="shift_b">Ca B (14:00 - 22:00)</option>
            <option value="shift_c">Ca C (22:00 - 6:00)</option>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup title="Ghi chú" icon="bi-sticky">
        <Field label="Ghi chú nội bộ" fullWidth>
          <Textarea
            value={form.notes}
            onChange={v => set("notes", v)}
            placeholder="Thông tin bổ sung, lưu ý đặc biệt về nhân viên này..."
            rows={4}
          />
        </Field>
      </FieldGroup>

      {/* Summary */}
      <div style={{
        background: "color-mix(in srgb, var(--primary) 6%, var(--background))",
        border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
        borderRadius: 14, padding: "18px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <i className="bi bi-check-circle-fill" style={{ color: "var(--primary)", fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>Xác nhận thông tin</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "6px 16px" }}>
          {[
            { label: "Họ tên", value: form.fullName || "—" },
            { label: "Mã NV", value: form.code || "—" },
            { label: "Email CT", value: form.workEmail || "—" },
            { label: "Phòng ban", value: form.departmentName || "—" },
            { label: "Chức vụ", value: form.position || "—" },
            { label: "Ngày vào", value: form.startDate || "—" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", gap: 6, fontSize: 12.5 }}>
              <span style={{ color: "var(--muted-foreground)", minWidth: 80 }}>{item.label}:</span>
              <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
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
  const isEditMode = !!employeeId;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, ...(initialData ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; tempPassword: string } | null>(null);

  const [emailDomain, setEmailDomain] = useState("company.vn");

  // Fetch domain email từ CompanyInfo.shortName
  useEffect(() => {
    fetch("/api/company", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.shortName) setEmailDomain(`${d.shortName}.vn`);
      })
      .catch(() => { });
  }, []);

  const set = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const validateStep = (s: number) => {
    if (s === 1 && (!form.code || !form.fullName || !form.workEmail)) return false;
    if (s === 2 && (!form.departmentCode || !form.departmentName || !form.position || !form.startDate)) return false;
    return true;
  };

  const handleNext = () => {
    setTouched(true);
    if (!validateStep(step)) return;
    setTouched(false);
    setStep(s => Math.min(6, s + 1));
    window.scrollTo(0, 0);
  };

  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async () => {
    setTouched(true);
    if (!validateStep(1) || !validateStep(2)) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc (bước 1 & 2).");
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
        // Bước 4
        baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
        mealAllowance: form.mealAllowance ? Number(form.mealAllowance) : null,
        fuelAllowance: form.fuelAllowance ? Number(form.fuelAllowance) : null,
        phoneAllowance: form.phoneAllowance ? Number(form.phoneAllowance) : null,
        seniorityAllowance: form.seniorityAllowance ? Number(form.seniorityAllowance) : null,
        bankAccount: form.bankAccount || null,
        bankName: form.bankName || null,
        bankBranch: form.bankBranch || null,
        dependents: Number(form.dependents) || 0,
        // Bước 5
        skills: form.skills || null,
        softSkills: form.softSkills || null,
        education: form.education || null,
        certifications: form.certifications || null,
        // Bước 6
        annualLeave: Number(form.annualLeave) || 12,
        workShift: form.workShift,
        notes: form.notes || null,
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
      void data;
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const isFirstStepInvalid = touched && !validateStep(step);

  const stepContent = [
    <Step1 key={1} form={form} set={set} branches={branches} branchesLoading={branchesLoading} />,
    <Step2 key={2} form={form} set={set} />,
    <Step3 key={3} form={form} set={set} />,
    <Step4 key={4} form={form} set={set} />,
    <Step5 key={5} form={form} set={set} />,
    <Step6 key={6} form={form} set={set} />,
  ];

  return (
    <>
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
        .fs-step-btn.done   { cursor: pointer; }
        .fs-step-btn.locked { cursor: not-allowed; opacity: 0.45; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Màn hình thành công + thông tin đăng nhập tạm ───── */}
      {createdAccount && (
        <div className="fs-modal-wrap" style={{ zIndex: 1200, alignItems: "center", justifyContent: "center" }}>
          <div style={{
            background: "var(--card)", borderRadius: 20,
            padding: "40px 48px", maxWidth: 480, width: "100%",
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
            textAlign: "center",
          }}>
            {/* Icon thành công */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              background: "rgba(16,185,129,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="bi bi-person-check-fill" style={{ fontSize: 32, color: "#10b981" }} />
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "var(--foreground)" }}>
              Tạo nhân viên thành công!
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--muted-foreground)" }}>
              Tài khoản đăng nhập đã được tạo tự động. Vui lòng ghi lại và trao cho nhân viên.
            </p>

            {/* Thông tin đăng nhập */}
            <div style={{
              background: "var(--background)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "20px 24px", textAlign: "left", marginBottom: 24,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                Thông tin đăng nhập lần đầu
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-envelope-fill" style={{ fontSize: 13, color: "var(--primary)", width: 18, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Email đăng nhập</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--foreground)", fontFamily: "monospace" }}>{createdAccount.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-key-fill" style={{ fontSize: 13, color: "#f59e0b", width: 18, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Mật khẩu tạm thời</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", fontFamily: "monospace", letterSpacing: "0.08em" }}>{createdAccount.tempPassword}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                ⚠️ Nhân viên nên đổi mật khẩu ngay sau lần đăng nhập đầu tiên.
              </div>
            </div>

            <button
              onClick={() => { setCreatedAccount(null); onCreated(); }}
              style={{
                width: "100%", padding: "12px", borderRadius: 12,
                background: "var(--primary)", color: "#fff",
                border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 3px 10px color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              <i className="bi bi-check-circle-fill" style={{ marginRight: 8 }} />
              Đã ghi nhận — Đóng
            </button>
          </div>
        </div>
      )}

      {/* ── Fullscreen wrapper ─────────────────────────── */}
      <div className="fs-modal-wrap">

        {/* ── Top header bar ──────────────────────────────────── */}
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
              <i className="bi bi-person-plus-fill" style={{ fontSize: 14, color: "var(--primary)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontWeight: 500 }}>Nhân sự</span>
              <i className="bi bi-chevron-right" style={{ fontSize: 10, color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Tạo nhân viên mới</span>
            </div>
          </div>

          {/* Center: Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>
              Bước {step} / {STEPS.length}
            </span>
            <div style={{ width: 140, height: 5, background: "var(--muted)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(step / STEPS.length) * 100}%`,
                background: "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #7c3aed))",
                borderRadius: 99,
                transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>
              {Math.round((step / STEPS.length) * 100)}%
            </span>
          </div>

          {/* Right: Close button */}
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

        {/* ── Body: sidebar + content ─────────────────────────── */}
        <div className="fs-modal-body">

          {/* ── Left sidebar ──────────────────────────────────── */}
          <aside className="fs-sidebar">
            {/* Mini avatar zone */}
            <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 12,
                background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #7c3aed))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-person-plus" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)", marginBottom: 2 }}>
                {form.fullName || "Nhân viên mới"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {form.code ? `#${form.code}` : "Mã chưa đặt"}
              </div>
              {form.position && (
                <div style={{
                  marginTop: 8, fontSize: 11, fontWeight: 600,
                  color: "var(--primary)",
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: 6, padding: "3px 8px", display: "inline-block",
                }}>
                  {form.position}
                </div>
              )}
            </div>

            {/* Step list */}
            <div style={{ flex: 1 }}>
              {STEPS.map(s => {
                const isDone = step > s.id;
                const isCurrent = step === s.id;
                const cls = `fs-step-btn ${isCurrent ? "active" : isDone ? "done" : "locked"}`;
                return (
                  <button
                    key={s.id}
                    className={cls}
                    onClick={() => { if (isDone || isCurrent) setStep(s.id); }}
                    tabIndex={isDone || isCurrent ? 0 : -1}
                  >
                    {/* Circle */}
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isCurrent
                        ? "var(--primary)"
                        : isDone
                          ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                          : "var(--muted)",
                      fontSize: 12, fontWeight: 800,
                      color: isCurrent ? "#fff" : isDone ? "var(--primary)" : "var(--muted-foreground)",
                      transition: "all 0.15s",
                      border: isCurrent ? "2px solid var(--primary)" : "2px solid transparent",
                    }}>
                      {isDone
                        ? <i className="bi bi-check" style={{ fontSize: 12 }} />
                        : <i className={`bi ${s.icon}`} style={{ fontSize: 11 }} />
                      }
                    </span>
                    {/* Label */}
                    <span style={{ flex: 1 }}>
                      <span style={{
                        display: "block", fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? "var(--primary)" : isDone ? "var(--foreground)" : "var(--muted-foreground)",
                        lineHeight: 1.3,
                      }}>
                        {s.label}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 1, display: "block" }}>
                          Đang nhập
                        </span>
                      )}
                      {isDone && (
                        <span style={{ fontSize: 10.5, color: "#10b981", marginTop: 1, display: "block" }}>
                          Hoàn thành ✓
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
                  Nhấn ESC để hủy
                </span>
              </div>
            </div>
          </aside>

          {/* ── Main content ──────────────────────────────────── */}
          <main className="fs-content">
            {/* Step heading */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className={`bi ${STEPS[step - 1].icon}`} style={{ fontSize: 16, color: "var(--primary)" }} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--foreground)" }}>
                    {STEPS[step - 1].label}
                  </h1>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                    {[
                      "Thông tin định danh cá nhân, liên lạc và địa chỉ",
                      "Vị trí công việc, phòng ban và loại hình nhân viên",
                      "Hợp đồng lao động, hồ sơ pháp lý và bảo hiểm",
                      "Mức lương, phụ cấp và thông tin ngân hàng",
                      "Kỹ năng chuyên môn, học vấn và chứng chỉ",
                      "Phép năm, ca làm việc và ghi chú nội bộ",
                    ][step - 1]}
                  </p>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--border)", marginTop: 16 }} />
            </div>

            {/* Validation error */}
            {isFirstStepInvalid && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 24,
              }}>
                <i className="bi bi-exclamation-circle-fill" style={{ color: "#ef4444", fontSize: 15, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                  Vui lòng điền đầy đủ các trường bắt buộc (<span style={{ textDecoration: "underline" }}>dấu *</span>)
                </span>
              </div>
            )}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 24,
              }}>
                <i className="bi bi-exclamation-circle-fill" style={{ color: "#ef4444", fontSize: 15, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {/* Step content */}
            {stepContent[step - 1]}

            {/* ── Footer navigation ─────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {step < 6 ? "* Trường bắt buộc cần điền" : "Kiểm tra kỹ trước khi lưu"}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                {step > 1 && (
                  <button
                    onClick={handlePrev}
                    disabled={saving}
                    style={{
                      padding: "10px 20px", borderRadius: 11,
                      background: "var(--background)", border: "1px solid var(--border)",
                      color: "var(--foreground)", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      transition: "all 0.15s",
                    }}
                  >
                    <i className="bi bi-arrow-left" />
                    Quay lại
                  </button>
                )}
                {step < 6 ? (
                  <button
                    onClick={handleNext}
                    style={{
                      padding: "10px 24px", borderRadius: 11,
                      background: "var(--primary)", border: "none",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      transition: "all 0.15s",
                      boxShadow: "0 3px 10px color-mix(in srgb, var(--primary) 35%, transparent)",
                    }}
                  >
                    Tiếp theo
                    <i className="bi bi-arrow-right" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{
                      padding: "10px 28px", borderRadius: 11,
                      background: saving
                        ? "var(--muted)"
                        : "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 65%, #7c3aed))",
                      border: "none",
                      color: saving ? "var(--muted-foreground)" : "#fff",
                      fontSize: 13, fontWeight: 700,
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 7,
                      transition: "all 0.2s",
                      boxShadow: saving ? "none" : "0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
                    }}
                  >
                    {saving ? (
                      <>
                        <span style={{
                          width: 14, height: 14,
                          border: "2px solid var(--muted-foreground)",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                          display: "inline-block",
                        }} />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill" />
                        {isEditMode ? "Cập nhật thông tin" : "Tạo nhân viên"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
