import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("function AddCandidateModal(")
# We search for the exact delimiter that follows the modal
end_idx = content.find("// ─── Offcanvas Components", start_idx)

# Go back slightly to catch any other sub-components headers that might be immediately before
subcomp_idx = content.find("// ─── Sub-Components", start_idx)
if subcomp_idx != -1 and subcomp_idx < end_idx:
    end_idx = subcomp_idx

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end index!")
    exit(1)

new_func = """function AddCandidateModal({ isOpen, onClose, requests, onSuccess, editingCandidate }: {
  isOpen: boolean,
  onClose: () => void,
  requests: RecruitmentRequest[],
  onSuccess: () => void,
  editingCandidate?: any
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'exp' | 'skills'>('exp');
  const { success } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    requestId: "",
    position: "",
    email: "",
    phone: "",
    address: "",
    gender: "Nam",
    birthDate: "",
    education: "Đại học",
    desiredSalary: "",
    experience: "",
    expYears: "",
    skills: "",
    summary: "",
    cvUrl: "",
    profileUrl: "",
    source: "MANUAL",
    status: "Pending Review"
  });

  useEffect(() => {
    if (editingCandidate && isOpen) {
      setFormData({
        name: editingCandidate.name || "",
        requestId: editingCandidate.requestId || "",
        position: editingCandidate.position || "",
        email: editingCandidate.email || "",
        phone: editingCandidate.phone || "",
        address: editingCandidate.address || "",
        gender: editingCandidate.gender || "Nam",
        birthDate: editingCandidate.birthDate ? new Date(editingCandidate.birthDate).toISOString().split('T')[0] : "",
        education: editingCandidate.education || "Đại học",
        desiredSalary: editingCandidate.desiredSalary || "",
        experience: editingCandidate.experience || "",
        expYears: editingCandidate.expYears || "",
        skills: editingCandidate.skills || "",
        summary: editingCandidate.summary || "",
        cvUrl: editingCandidate.cvUrl || "",
        profileUrl: editingCandidate.profileUrl || "",
        source: editingCandidate.source || "MANUAL",
        status: editingCandidate.status || "Pending Review"
      });
    } else if (isOpen) {
      setFormData({
        name: "",
        requestId: "",
        position: "",
        email: "",
        phone: "",
        address: "",
        gender: "Nam",
        birthDate: "",
        education: "Đại học",
        desiredSalary: "",
        experience: "",
        expYears: "",
        skills: "",
        summary: "",
        cvUrl: "",
        profileUrl: "",
        source: "MANUAL",
        status: "Pending Review"
      });
    }
  }, [editingCandidate, isOpen]);

  const [isEditingComp, setIsEditingComp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingCandidate ? `/api/hr/candidates/${editingCandidate.id}` : "/api/hr/candidates";
      const method = editingCandidate ? "PATCH" : "POST";

      const submissionData = {
        ...formData,
        birthDate: formData.birthDate || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || "Lỗi khi xử lý dữ liệu");
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCleanText = () => {
    const field = activeTab === 'exp' ? 'experience' : 'skills';
    const text = formData[field as keyof typeof formData] as string;
    if (!text) return;

    const cleaned = text
      .split('\\n')
      .map(line => {
        const clean = line.replace(/\\*/g, '').trim();
        if (!clean) return "";
        return clean.startsWith('-') ? clean : `- ${clean}`;
      })
      .filter(line => line !== "")
      .join('\\n');

    setFormData({ ...formData, [field]: cleaned });
    success("Đã định dạng lại văn bản sạch sẽ!");
  };

  const labelStyle = { fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
  const inputStyle = { borderRadius: "10px", padding: "8px 12px", border: "1.5px solid #e2e8f0", fontSize: "13px", transition: "all 0.2s", background: "#fff" };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: "all 0.3s" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", zIndex: 2001,
        transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease-in-out",
        background: "#f8fafc", display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif"
      }}>
      {/* Top Header */}
      <div className="bg-white px-3 py-3 d-flex justify-content-between align-items-center border-bottom flex-shrink-0">
        <div className="d-flex align-items-center gap-2 flex-shrink-1 min-w-0">
          <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-3 flex-shrink-0" style={{ width: "36px", height: "36px" }}>
            <i className="bi bi-person-plus-fill fs-5" />
          </div>
          <div className="min-w-0">
            <h6 className="fw-bold text-dark mb-0 text-truncate" style={{ fontSize: "15px" }}>{editingCandidate ? "Sửa hồ sơ" : "Thêm ứng viên"}</h6>
            <p className="text-muted mb-0 text-truncate d-none d-sm-block" style={{ fontSize: "11px" }}>Điền thông tin ứng viên</p>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-light rounded-circle border-0 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "32px", height: "32px" }}>
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* Scrollable Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="custom-scrollbar bg-white">
        <form id="add-candidate-form" onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div className="d-flex flex-column gap-4">
            
            {/* Section 1: Basic Info */}
            <div className="w-100">
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                <i className="bi bi-person-lines-fill text-primary" />
                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>1. THÔNG TIN ỨNG VIÊN</h6>
              </div>
              <div className="row g-3">
                <div className="col-12">
                  <label style={labelStyle}>VỊ TRÍ ỨNG TUYỂN <span className="text-danger">*</span></label>
                  {requests.length === 0 ? (
                    <div className="p-3 rounded-3 bg-warning-subtle text-warning-emphasis small border-0">
                      <i className="bi bi-exclamation-triangle-fill me-2" />
                      Chưa có yêu cầu tuyển dụng nào.
                    </div>
                  ) : (
                    <select
                      className="form-select shadow-none border-0 fw-bold py-2 bg-primary-subtle text-primary"
                      style={{ borderRadius: "10px" }}
                      required
                      value={formData.requestId}
                      onChange={e => {
                        const req = requests.find(r => r.id === e.target.value);
                        setFormData({ ...formData, requestId: e.target.value, position: req ? req.position : "" });
                      }}
                    >
                      <option value="">Chọn vị trí...</option>
                      {requests.map(r => (
                        <option key={r.id} value={r.id}>{r.position}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="col-12">
                  <label style={labelStyle}>HỌ VÀ TÊN ỨNG VIÊN <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    style={{ ...inputStyle, width: "100%", fontSize: "16px" }}
                    className="form-control shadow-none fw-bold"
                    placeholder="Nguyễn Mỹ Linh"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label style={labelStyle}>GIỚI TÍNH</label>
                  <select style={{ ...inputStyle, width: "100%" }} className="form-select shadow-none" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="col-12">
                  <label style={labelStyle}>EMAIL LIÊN HỆ</label>
                  <div className="input-group bg-light rounded-3 px-2">
                    <span className="input-group-text bg-transparent border-0"><i className="bi bi-envelope text-muted" /></span>
                    <input
                      type="email"
                      style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}
                      className="form-control shadow-none border-0 px-1"
                      placeholder="linhmau097@gmail.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-12">
                  <label style={labelStyle}>SỐ ĐIỆN THOẠI</label>
                  <div className="input-group bg-light rounded-3 px-2">
                    <span className="input-group-text bg-transparent border-0"><i className="bi bi-telephone text-muted" /></span>
                    <input
                      type="tel"
                      style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}
                      className="form-control shadow-none border-0 px-1"
                      placeholder="0397047766"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <label style={labelStyle}>NGÀY SINH</label>
                  <input type="date" style={{ ...inputStyle, width: "100%" }} className="form-control shadow-none" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                </div>
                <div className="col-12">
                  <label style={labelStyle}>TRÌNH ĐỘ HỌC VẤN</label>
                  <select style={{ ...inputStyle, width: "100%" }} className="form-select shadow-none" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })}>
                    <option value="Đại học">Đại học</option>
                    <option value="Cao đẳng">Cao đẳng</option>
                    <option value="Thạc sĩ">Thạc sĩ</option>
                    <option value="Tiến sĩ">Tiến sĩ</option>
                    <option value="Phổ thông">Phổ thông</option>
                  </select>
                </div>
                <div className="col-12">
                  <label style={labelStyle}>KINH NGHIỆM</label>
                  <input
                    type="text"
                    style={{ ...inputStyle, width: "100%" }}
                    className="form-control shadow-none"
                    placeholder="5 năm"
                    value={formData.expYears}
                    onChange={e => setFormData({ ...formData, expYears: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label style={labelStyle}>ĐỊA CHỈ HIỆN TẠI</label>
                  <input
                    type="text"
                    style={{ ...inputStyle, width: "100%" }}
                    className="form-control shadow-none"
                    placeholder="Hà Nội"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label style={labelStyle}>MỨC LƯƠNG MONG MUỐN (ĐỒNG)</label>
                  <input
                    type="text"
                    style={{ ...inputStyle, width: "100%" }}
                    className="form-control shadow-none"
                    placeholder="Ví dụ: 15.000.000"
                    value={formData.desiredSalary}
                    onChange={e => setFormData({ ...formData, desiredSalary: formatCurrency(e.target.value) })}
                  />
                </div>
                <div className="col-12">
                  <label style={labelStyle}>PHÂN LOẠI BAN ĐẦU</label>
                  <div className="d-flex gap-4 mt-2">
                    {[
                      { value: 'New', label: 'Mới' },
                      { value: 'Qualified', label: 'Tiềm năng' }
                    ].map(s => (
                      <label key={s.value} className="d-flex align-items-center gap-2 cursor-pointer" style={{ fontSize: "13px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="candidate-status"
                          className="form-check-input mt-0 shadow-none"
                          checked={formData.status === s.value}
                          onChange={() => setFormData({ ...formData, status: s.value as any })}
                        />
                        <span className={formData.status === s.value ? 'text-primary fw-bold' : 'text-muted'}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-12">
                  <label style={labelStyle}>ĐƯỜNG DẪN CV (GOOGLE DRIVE/DROPBOX)</label>
                  <div className="input-group bg-light rounded-3 px-2">
                    <span className="input-group-text bg-transparent border-0"><i className="bi bi-link-45deg text-muted" /></span>
                    <input
                      type="url"
                      style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}
                      className="form-control shadow-none border-0 px-1 small"
                      placeholder="https://..."
                      value={formData.cvUrl}
                      onChange={e => setFormData({ ...formData, cvUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-100">
              {/* Section 2: Professional Competence */}
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom mt-3">
                <i className="bi bi-mortarboard-fill text-primary" />
                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>2. NĂNG LỰC CHUYÊN MÔN</h6>
              </div>
              
              <div className="d-flex flex-column gap-2">
                <div className="bg-light p-1 rounded-3 d-flex gap-2 align-items-center w-100" style={{ border: "1px solid #e2e8f0" }}>
                  <div className="d-flex gap-1 flex-grow-1">
                    {[
                      { id: 'exp', labelMobile: 'KINH NGHIỆM' },
                      { id: 'skills', labelMobile: 'KỸ NĂNG' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`btn btn-sm px-2 py-1 fw-bold border-0 transition-all flex-grow-1 ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}
                        style={{ fontSize: "11px", borderRadius: "6px" }}
                        onClick={() => setActiveTab(tab.id as any)}
                      >
                        {tab.labelMobile}
                      </button>
                    ))}
                  </div>
                  <div className="vr mx-1" style={{ height: "16px" }}></div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm px-2 py-0 border-0 flex-shrink-0 d-flex align-items-center justify-content-center gap-1"
                    title="Định dạng lại văn bản (Xóa dấu sao, thêm gạch đầu dòng)"
                    onClick={handleCleanText}
                    style={{ fontSize: "10px", height: "24px" }}
                  >
                    <i className="bi bi-stars" /> ĐỊNH DẠNG
                  </button>
                </div>
                <div className="card-body p-0 position-relative d-flex flex-column" style={{ minHeight: "250px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                  <div className="flex-grow-1 p-3 custom-scrollbar" style={{ background: "linear-gradient(to bottom, #fff, #fcfdfe)", overflowY: "auto", height: "250px", borderRadius: "10px" }}>
                    {isEditingComp ? (
                      <textarea
                        className="form-control h-100 border-0 shadow-none p-0"
                        placeholder={activeTab === 'exp' ? "Mô tả chi tiết quá trình làm việc..." : "Danh sách kỹ năng..."}
                        style={{ resize: "none", fontSize: "14px", lineHeight: "2", background: "transparent", color: "#334155", fontWeight: "500" }}
                        autoFocus
                        value={activeTab === 'exp' ? formData.experience : formData.skills}
                        onChange={e => setFormData({ ...formData, [activeTab === 'exp' ? 'experience' : 'skills']: e.target.value })}
                        onBlur={() => setIsEditingComp(false)}
                      />
                    ) : (
                      <div
                        className="h-100 w-100 cursor-pointer"
                        onClick={() => setIsEditingComp(true)}
                        style={{ cursor: "text" }}
                      >
                        {(activeTab === 'exp' ? formData.experience : formData.skills)?.split('\\n').map((line, i) => {
                          const trimmed = line.trim();
                          if (!trimmed) return <div key={i} style={{ height: "1em" }} />;
                          const cleanLine = trimmed.replace(/\\*/g, '').replace(/^-+\\s*/, '').trim();
                          return (
                            <div key={i} className="mb-2 d-flex gap-2 align-items-start">
                              <i className="bi bi-dot text-primary" style={{ fontSize: "20px", marginTop: "-4px", flexShrink: 0 }} />
                              <span className="text-dark" style={{ fontSize: "14px", lineHeight: "1.6", fontWeight: "500" }}>{cleanLine}</span>
                            </div>
                          );
                        })}
                        {!(activeTab === 'exp' ? formData.experience : formData.skills) && (
                          <div className="text-muted italic" style={{ fontSize: "14px" }}>Bấm vào đây để nhập nội dung...</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Floating Indicator */}
                  <div className="position-absolute bottom-0 right-0 p-3 opacity-25" style={{ pointerEvents: "none" }}>
                    <i className="bi bi-pencil-square fs-1" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="bg-white p-3 border-top flex-shrink-0">
        <BrandButton
          type="submit"
          form="add-candidate-form"
          className="w-100"
          loading={loading}
          icon="bi-check-lg"
          size="lg"
        >
          {editingCandidate ? "Cập nhật hồ sơ" : "Lưu hồ sơ"}
        </BrandButton>
      </div>

      <style>{`
          .bg-primary-subtle { background-color: #e0e7ff; }
          .text-primary { color: #003087 !important; }
          .btn-primary:hover { background-color: #002366 !important; transform: translateY(-1px); }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .transition-all { transition: all 0.2s ease-in-out; }
        `}</style>
      </div>
    </>,
    document.body
  );
}
\n"""

content = content[:start_idx] + new_func + content[end_idx:]
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated AddCandidateModal successfully.")
