"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Employee = {
  id: string; code: string; fullName: string; workEmail: string;
  phone?: string | null; departmentCode: string; departmentName: string;
  position: string; status: string; gender: string; employeeType: string; level: string;
  user?: { id: string; email: string; role: string } | null;
};
type Dept = { code: string; nameVi: string };

const EMPTY_FORM = {
  fullName: "", workEmail: "", password: "Pass@123",
  phone: "", departmentCode: "", position: "",
  gender: "male", level: "staff", employeeType: "official", status: "active",
};

type FormState = typeof EMPTY_FORM;

function nameToUsername(fullName: string): string {
  const map: Record<string, string> = {
    à:"a",á:"a",ả:"a",ã:"a",ạ:"a",
    ă:"a",ằ:"a",ắ:"a",ẳ:"a",ẵ:"a",ặ:"a",
    â:"a",ầ:"a",ấ:"a",ẩ:"a",ẫ:"a",ậ:"a",
    è:"e",é:"e",ẻ:"e",ẽ:"e",ẹ:"e",
    ê:"e",ề:"e",ế:"e",ể:"e",ễ:"e",ệ:"e",
    ì:"i",í:"i",ỉ:"i",ĩ:"i",ị:"i",
    ò:"o",ó:"o",ỏ:"o",õ:"o",ọ:"o",
    ô:"o",ồ:"o",ố:"o",ổ:"o",ỗ:"o",ộ:"o",
    ơ:"o",ờ:"o",ớ:"o",ở:"o",ỡ:"o",ợ:"o",
    ù:"u",ú:"u",ủ:"u",ũ:"u",ụ:"u",
    ư:"u",ừ:"u",ứ:"u",ử:"u",ữ:"u",ự:"u",
    ỳ:"y",ý:"y",ỷ:"y",ỹ:"y",ỵ:"y",
    đ:"d",
  };
  const normalize = (s: string) =>
    s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z0-9]/g, "");
  return fullName.trim().split(/\s+/).map(normalize).join("");
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)", fontSize: 13,
  borderRadius: "var(--radius)", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s",
};
const onFocusInput = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = "var(--primary)"; };
const onBlurInput  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = "var(--border)"; };

// ── Form dùng chung cho Thêm & Sửa ───────────────────────────────────────────
function EmployeeForm({
  form, setForm, depts, emailManual, setEmailManual,
  isEdit, error, saving, onSave, onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  depts: Dept[];
  emailManual: boolean;
  setEmailManual: (v: boolean) => void;
  isEdit: boolean;
  error: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (key === "workEmail") setEmailManual(true);
  };

  const FIELDS: { label: string; key: keyof FormState; placeholder: string; type?: string; required?: boolean; editDisabled?: boolean }[] = [
    { label: "Họ và tên",    key: "fullName",  placeholder: "Nguyễn Văn A",     required: true },
    { label: "Email công ty", key: "workEmail", placeholder: "vana@company.vn",  type: "email", required: true, editDisabled: true },
    ...(!isEdit ? [{ label: "Mật khẩu", key: "password" as keyof FormState, placeholder: "Pass@123" }] : []),
    { label: "Số điện thoại", key: "phone",    placeholder: "0901 234 567" },
    { label: "Chức vụ",       key: "position", placeholder: "Nhân viên kinh doanh", required: true },
  ];

  return (
    <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 24 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800 }}>
        {isEdit ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
      </h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted-foreground)" }}>
        {isEdit ? "Cập nhật thông tin nhân viên. Email không thể thay đổi." : "Email công ty được tự động sinh từ họ tên."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {FIELDS.map(({ label, key, placeholder, type, required, editDisabled }) => (
          <div key={key}>
            <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>
              {label}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
            </p>
            <input
              type={type || "text"}
              value={form[key] as string}
              onChange={set(key)}
              placeholder={placeholder}
              disabled={isEdit && !!editDisabled}
              style={{ ...inputStyle, opacity: (isEdit && editDisabled) ? 0.6 : 1 }}
              onFocus={onFocusInput} onBlur={onBlurInput}
            />
            {key === "workEmail" && emailManual && !isEdit && (
              <button type="button" onClick={() => setEmailManual(false)}
                style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 600 }}>
                ↺ Tự sinh lại từ họ tên
              </button>
            )}
          </div>
        ))}

        {/* Phòng ban */}
        <div>
          <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>
            Phòng ban<span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>
          </p>
          <select value={form.departmentCode} onChange={set("departmentCode")}
            style={{ ...inputStyle, cursor: "pointer" }} onFocus={onFocusInput} onBlur={onBlurInput}>
            <option value="">-- Chọn phòng ban --</option>
            {depts.map(d => <option key={d.code} value={d.code}>{d.nameVi}</option>)}
          </select>
        </div>

        {/* Giới tính */}
        <div>
          <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Giới tính</p>
          <select value={form.gender} onChange={set("gender")}
            style={{ ...inputStyle, cursor: "pointer" }} onFocus={onFocusInput} onBlur={onBlurInput}>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>

        {/* Loại hợp đồng */}
        <div>
          <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Loại hợp đồng</p>
          <select value={form.employeeType} onChange={set("employeeType")}
            style={{ ...inputStyle, cursor: "pointer" }} onFocus={onFocusInput} onBlur={onBlurInput}>
            <option value="official">Chính thức</option>
            <option value="probation">Thử việc</option>
            <option value="intern">Thực tập sinh</option>
            <option value="collaborator">Cộng tác viên</option>
          </select>
        </div>

        {/* Cấp bậc */}
        <div>
          <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Cấp bậc</p>
          <select value={form.level} onChange={set("level")}
            style={{ ...inputStyle, cursor: "pointer" }} onFocus={onFocusInput} onBlur={onBlurInput}>
            <option value="staff">Nhân viên</option>
            <option value="mid_manager">Quản lý cấp trung</option>
            <option value="senior_manager">Quản lý cấp cao</option>
          </select>
        </div>

        {/* Trạng thái (chỉ khi sửa) */}
        {isEdit && (
          <div>
            <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Trạng thái</p>
            <select value={form.status} onChange={set("status")}
              style={{ ...inputStyle, cursor: "pointer" }} onFocus={onFocusInput} onBlur={onBlurInput}>
              <option value="active">Đang làm việc</option>
              <option value="inactive">Tạm nghỉ</option>
              <option value="resigned">Đã nghỉ việc</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#f43f5e", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="bi bi-exclamation-circle-fill" /> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={onSave} disabled={saving}
          style={{ padding: "8px 20px", border: "none", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          {saving
            ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang lưu...</>
            : <><i className={isEdit ? "bi bi-check-lg" : "bi bi-person-plus"} /> {isEdit ? "Lưu thay đổi" : "Tạo nhân viên"}</>
          }
        </button>
        <button onClick={onCancel}
          style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}>
          Hủy
        </button>
      </div>
    </div>
  );
}

// ── Confirm Delete dialog ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ emp, onConfirm, onCancel, deleting }: {
  emp: Employee; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 3000 }} />
      <div style={{
        position: "fixed", inset: 0, margin: "auto", zIndex: 3001,
        width: "min(440px, calc(100vw - 32px))", height: "fit-content",
        background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        padding: 28, display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-trash3-fill" style={{ fontSize: 20, color: "#ef4444" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Xác nhận xóa nhân viên</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>Hành động này không thể hoàn tác</p>
          </div>
        </div>
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{emp.fullName}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>{emp.workEmail} · {emp.departmentName}</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
            ⚠ Tài khoản đăng nhập của nhân viên này cũng sẽ bị xóa.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
            style={{ padding: "8px 18px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Hủy
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ padding: "8px 18px", border: "none", borderRadius: "var(--radius)", background: deleting ? "var(--muted)" : "#ef4444", color: deleting ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {deleting ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang xóa...</> : <><i className="bi bi-trash3" /> Xóa nhân viên</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [depts, setDepts]         = useState<Dept[]>([]);
  const [company, setCompany]     = useState<{ shortName?: string }>({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  // Add form
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState<FormState>(EMPTY_FORM);
  const [addEmailManual, setAddEmailManual] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");

  // Edit form
  const [editEmp, setEditEmp]     = useState<Employee | null>(null);
  const [editForm, setEditForm]   = useState<FormState>(EMPTY_FORM);
  const [editEmailManual]         = useState(true); // edit luôn manual
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete
  const [deleteEmp, setDeleteEmp] = useState<Employee | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [emps, ds, co] = await Promise.all([
      fetch("/api/company/employees").then(r => r.json()).catch(() => []),
      fetch("/api/company/departments").then(r => r.json()).catch(() => []),
      fetch("/api/company").then(r => r.json()).catch(() => ({})),
    ]);
    setEmployees(Array.isArray(emps) ? emps : []);
    setDepts(Array.isArray(ds) ? ds : []);
    setCompany(co ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-sinh email khi thêm mới
  useEffect(() => {
    if (addEmailManual) return;
    const domain = company.shortName ?? "company";
    const username = nameToUsername(addForm.fullName);
    setAddForm(f => ({ ...f, workEmail: username ? `${username}@${domain}.vn` : "" }));
  }, [addForm.fullName, company.shortName, addEmailManual]);

  const filtered = employees.filter(e =>
    e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    e.workEmail?.toLowerCase().includes(search.toLowerCase()) ||
    e.departmentCode?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Thêm mới ───────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.fullName.trim())    { setAddError("Họ tên không được để trống"); return; }
    if (!addForm.workEmail.trim())   { setAddError("Email không được để trống"); return; }
    if (!addForm.departmentCode)     { setAddError("Vui lòng chọn phòng ban"); return; }
    if (!addForm.position.trim())    { setAddError("Chức vụ không được để trống"); return; }
    const dept = depts.find(d => d.code === addForm.departmentCode);
    setAddSaving(true); setAddError("");
    try {
      const res = await fetch("/api/company/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, departmentName: dept?.nameVi ?? addForm.departmentCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo nhân viên");
      setShowAdd(false);
      setAddForm(EMPTY_FORM);
      setAddEmailManual(false);
      load();
    } catch (e: any) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  // ── Mở form sửa ────────────────────────────────────────────────────────────
  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setEditForm({
      fullName: emp.fullName,
      workEmail: emp.workEmail,
      password: "",
      phone: emp.phone ?? "",
      departmentCode: emp.departmentCode,
      position: emp.position,
      gender: emp.gender ?? "male",
      level: emp.level ?? "staff",
      employeeType: emp.employeeType ?? "official",
      status: emp.status ?? "active",
    });
    setEditError("");
  };

  // ── Lưu sửa ────────────────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editEmp) return;
    if (!editForm.fullName.trim())    { setEditError("Họ tên không được để trống"); return; }
    if (!editForm.departmentCode)     { setEditError("Vui lòng chọn phòng ban"); return; }
    if (!editForm.position.trim())    { setEditError("Chức vụ không được để trống"); return; }
    setEditSaving(true); setEditError("");
    try {
      const res = await fetch(`/api/company/employees/${editEmp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật");
      setEditEmp(null);
      load();
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  // ── Xóa ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteEmp) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/company/employees/${deleteEmp.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa nhân viên");
      setDeleteEmp(null);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    active:   { label: "Đang làm",  color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    inactive: { label: "Tạm nghỉ",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    resigned: { label: "Đã nghỉ",   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000, margin: "0 auto", width: "100%" }}>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {deleteEmp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfirmDeleteModal emp={deleteEmp} onConfirm={handleDelete} onCancel={() => setDeleteEmp(null)} deleting={deleting} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Nhân viên</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
            Danh sách nhân viên và tài khoản hệ thống ({employees.length} người)
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm nhân viên..."
            style={{ ...inputStyle, width: 220 }} onFocus={onFocusInput} onBlur={onBlurInput} />
          <button onClick={() => { setShowAdd(true); setAddForm(EMPTY_FORM); setAddEmailManual(false); setAddError(""); }}
            style={{ padding: "9px 18px", border: "none", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <i className="bi bi-person-plus" /> Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Form Thêm mới */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <EmployeeForm
              form={addForm} setForm={setAddForm}
              depts={depts} emailManual={addEmailManual} setEmailManual={setAddEmailManual}
              isEdit={false} error={addError} saving={addSaving}
              onSave={handleAdd} onCancel={() => { setShowAdd(false); setAddError(""); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Sửa */}
      <AnimatePresence>
        {editEmp && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <EmployeeForm
              form={editForm} setForm={setEditForm}
              depts={depts} emailManual={editEmailManual} setEmailManual={() => {}}
              isEdit={true} error={editError} saving={editSaving}
              onSave={handleEdit} onCancel={() => { setEditEmp(null); setEditError(""); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 1s linear infinite", display: "block", marginBottom: 8 }} />
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-people" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14 }}>{search ? "Không tìm thấy nhân viên" : "Chưa có nhân viên nào"}</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                {["Nhân viên", "Email công ty", "Phòng ban", "Chức vụ", "Loại HĐ", "Vai trò", "Trạng thái", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => {
                const st = STATUS_CFG[emp.status] ?? STATUS_CFG.active;
                const isEditing = editEmp?.id === emp.id;
                return (
                  <tr key={emp.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s", background: isEditing ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "transparent" }}
                    onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = "var(--muted)"; }}
                    onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = "transparent"; }}>

                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>
                          {emp.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{emp.fullName}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{emp.code}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--foreground)" }}>{emp.workEmail}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                        {emp.departmentName || emp.departmentCode}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--foreground)" }}>{emp.position}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        {{ official: "Chính thức", probation: "Thử việc", intern: "Thực tập", collaborator: "CTV" }[emp.employeeType] ?? emp.employeeType}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: emp.user?.role === "ADMIN" ? "rgba(99,102,241,0.1)" : "rgba(0,0,0,0.05)", color: emp.user?.role === "ADMIN" ? "#6366f1" : "var(--muted-foreground)" }}>
                        {emp.user?.role ?? "USER"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => isEditing ? setEditEmp(null) : openEdit(emp)}
                          title={isEditing ? "Đóng form sửa" : "Chỉnh sửa"}
                          style={{
                            width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
                            background: isEditing ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                            color: isEditing ? "var(--primary)" : "var(--muted-foreground)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.color = "var(--primary)";
                            e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color = isEditing ? "var(--primary)" : "var(--muted-foreground)";
                            e.currentTarget.style.background = isEditing ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent";
                          }}
                        >
                          <i className={isEditing ? "bi bi-x-lg" : "bi bi-pencil"} style={{ fontSize: 12 }} />
                        </button>
                        <button
                          onClick={() => setDeleteEmp(emp)}
                          title="Xóa nhân viên"
                          style={{
                            width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
                            background: "transparent", color: "var(--muted-foreground)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "#ef4444";
                            e.currentTarget.style.color = "#ef4444";
                            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color = "var(--muted-foreground)";
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <i className="bi bi-trash3" style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
