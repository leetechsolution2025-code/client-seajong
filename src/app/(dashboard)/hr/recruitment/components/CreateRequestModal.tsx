"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const STEP_ITEMS: ModernStepItem[] = [
  { num: 1, id: "basic", title: "Cơ bản", desc: "Thông tin vị trí", icon: "bi-info-circle" },
  { num: 2, id: "work", title: "Công việc", desc: "Mô tả & Yêu cầu", icon: "bi-file-earmark-text" },
  { num: 3, id: "extra", title: "Bổ sung", desc: "Thông tin khác", icon: "bi-plus-circle" },
];

const DEFAULT_SPECIALTIES = [
  "An ninh, bảo vệ",
  "Sản xuất, lắp ráp",
  "Vận hành, bảo trì, bảo dưỡng",
  "Kho vận, thu mua",
  "Vận tải, lái xe, giao nhận",
  "Chăm sóc khách hàng",
  "Hành chính, thư ký",
  "Thiết kế",
  "Marketing",
  "Bán hàng, kinh doanh",
  "Kế toán",
  "Nhân sự"
];

const formatNumber = (val: string | number) => {
  if (!val && val !== 0) return "";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumber = (val: string) => {
  return val.replace(/\./g, "");
};

export const CreateRequestModal = ({ isOpen, onClose, onSuccess, initialData }: CreateRequestModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeWorkTab, setActiveWorkTab] = useState<"desc" | "req" | "benefit">("desc");
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  
  // Specialty State
  const [isSpecialtyOpen, setIsSpecialtyOpen] = useState(false);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const specialtyRef = useRef<HTMLDivElement>(null);
  const specialtyInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    department: "",
    position: "",
    quantity: 1,
    level: "Nhân viên",
    workType: "Toàn thời gian",
    salaryMin: "" as string,
    salaryMax: "" as string,
    gender: "Tất cả",
    ageMin: "" as string,
    ageMax: "" as string,
    education: "Đại học",
    experience: "1-2 năm",
    specialty: [] as string[],
    description: "",
    requirements: "",
    benefits: "",
    skills: "",
    requestDate: new Date().toISOString().split('T')[0],
    needDate: "",
    requestedBy: "",
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialtyRef.current && !specialtyRef.current.contains(event.target as Node)) {
        setIsSpecialtyOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const DRAFT_KEY = "recruitment_request_draft";

  useEffect(() => {
    if (initialData && isOpen) {
      let reqs: any = {};
      try {
        reqs = typeof initialData.requirements === 'string' ? JSON.parse(initialData.requirements) : (initialData.requirements || {});
      } catch (e) {}

      let specArr: string[] = [];
      if (initialData.specialty) {
        specArr = initialData.specialty.split(", ").filter(Boolean);
      } else if (reqs.specialty) {
        specArr = Array.isArray(reqs.specialty) ? reqs.specialty : reqs.specialty.split(", ").filter(Boolean);
      }

      setFormData({
        department: initialData.department || "",
        position: initialData.position || "",
        quantity: initialData.quantity || 1,
        level: reqs.level || "Nhân viên",
        workType: reqs.workType || initialData.workType || "Toàn thời gian",
        salaryMin: reqs.salaryMin?.toString() || "",
        salaryMax: reqs.salaryMax?.toString() || "",
        gender: reqs.gender || "Tất cả",
        ageMin: reqs.ageMin?.toString() || "",
        ageMax: reqs.ageMax?.toString() || "",
        education: reqs.education || "Đại học",
        experience: reqs.experience || "1-2 năm",
        specialty: specArr,
        description: initialData.description || "",
        requirements: reqs.requirementsText || "",
        benefits: reqs.benefits || "",
        skills: reqs.skills || "",
        requestDate: initialData.createdAt ? new Date(initialData.createdAt).toISOString().split('T')[0] : (reqs.requestDate || new Date().toISOString().split('T')[0]),
        needDate: initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : (reqs.needDate || ""),
        requestedBy: initialData.requestedBy || session?.user?.name || "",
      });
    } else if (isOpen) {
      const savedDraft = sessionStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(prev => ({
            ...parsed.formData,
            // Always refresh session info if draft is empty or for safety
            department: parsed.formData.department || (session?.user as any)?.departmentName || "",
            requestedBy: parsed.formData.requestedBy || session?.user?.name || "",
          }));
          setCurrentStep(parsed.currentStep || 1);
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      } else {
        setFormData(prev => ({
          ...prev,
          department: (session?.user as any)?.departmentName || "",
          requestedBy: session?.user?.name || "",
          specialty: [],
          ageMin: "",
          ageMax: "",
          salaryMin: "",
          salaryMax: "",
          skills: "",
          requestDate: new Date().toISOString().split('T')[0],
          needDate: ""
        }));
        setCurrentStep(1);
      }
    }
  }, [initialData, isOpen, session]);

  useEffect(() => {
    if (isOpen && !initialData) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentStep }));
    }
  }, [formData, currentStep, isOpen, initialData]);

  const filteredOptions = useMemo(() => {
    const search = specialtySearch.toLowerCase();
    return DEFAULT_SPECIALTIES.filter(opt => opt.toLowerCase().includes(search));
  }, [specialtySearch]);

  const handleSubmit = async () => {
    if (!formData.position.trim()) return alert("Vui lòng nhập vị trí tuyển dụng");
    setLoading(true);
    try {
      const url = initialData ? `/api/hr/recruitment/${initialData.id}` : "/api/hr/recruitment";
      const method = initialData ? "PATCH" : "POST";
      
      const payload = {
        department: formData.department,
        position: formData.position,
        specialty: formData.specialty.join(", "),
        quantity: formData.quantity,
        deadline: formData.needDate ? new Date(formData.needDate).toISOString() : null,
        description: formData.description,
        requestedBy: formData.requestedBy,
        requirements: JSON.stringify({
          level: formData.level,
          workType: formData.workType,
          salaryMin: formData.salaryMin,
          salaryMax: formData.salaryMax,
          salaryRange: formData.salaryMin && formData.salaryMax ? `${formatNumber(formData.salaryMin)} - ${formatNumber(formData.salaryMax)}` : "Thỏa thuận",
          gender: formData.gender,
          ageMin: formData.ageMin,
          ageMax: formData.ageMax,
          ageRange: `${formData.ageMin} - ${formData.ageMax} tuổi`,
          education: formData.education,
          experience: formData.experience,
          requirementsText: formData.requirements,
          benefits: formData.benefits,
          skills: formData.skills,
          requestDate: formData.requestDate,
          needDate: formData.needDate,
          specialty: formData.specialty
        }),
        status: initialData ? initialData.status : "Pending",
        priority: "Normal",
        requesterId: session?.user?.id,
        // Map direct columns
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        workType: formData.workType,
        experience: formData.experience,
        education: formData.education,
        gender: formData.gender,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        level: formData.level,
        skills: formData.skills
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Có lỗi xảy ra");

      sessionStorage.removeItem(DRAFT_KEY); // Clear draft after successful submission
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const inputStyle = {
    borderRadius: "10px", padding: "10px 15px", border: "1.5px solid #e2e8f0",
    fontSize: "14px", transition: "all 0.2s"
  };

  const labelStyle = {
    fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block"
  };

  const toggleSpecialty = (opt: string) => {
    const current = formData.specialty;
    const next = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt];
    setFormData({ ...formData, specialty: next });
    specialtyInputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ 
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
            background: "rgba(15, 23, 42, 0.4)", zIndex: 2000, 
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)"
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            style={{ 
              width: "100%", maxWidth: "850px", height: "620px",
              background: "#fff", borderRadius: "24px", overflow: "hidden",
              display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif"
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-bottom d-flex justify-content-between align-items-center bg-white">
              <div>
                <h5 className="mb-0 fw-bold text-dark">{initialData ? "Chỉnh sửa yêu cầu" : "Tạo yêu cầu tuyển dụng"}</h5>
                <p className="text-muted mb-0 small">Phiếu yêu cầu nhân sự nội bộ</p>
              </div>
              <button className="btn-close shadow-none" onClick={onClose}></button>
            </div>

            <div className="bg-white">
              <ModernStepper steps={STEP_ITEMS} currentStep={currentStep} onStepChange={setCurrentStep} paddingX={40} />
            </div>

            {/* Form Body */}
            <div className="flex-grow-1 overflow-auto px-5 py-4 custom-scrollbar">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label style={labelStyle}>Tên vị trí cần tuyển dụng <span className="text-danger">*</span></label>
                        <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="VD: Nhân viên Kế toán Kho" />
                      </div>
                      
                      <div className="col-md-4" ref={specialtyRef}>
                        <label style={labelStyle}>Ngành nghề</label>
                        <div className="position-relative">
                          <div 
                            className="d-flex align-items-center bg-white border custom-scrollbar-horizontal" 
                            style={{ ...inputStyle, cursor: "text", minHeight: "43px", padding: "4px 8px", gap: "6px", overflowX: "auto", flexWrap: "nowrap" }}
                            onClick={() => {
                                setIsSpecialtyOpen(true);
                                specialtyInputRef.current?.focus();
                            }}
                          >
                            {formData.specialty.map(item => (
                                <span key={item} className="badge d-flex align-items-center gap-1 py-1 px-2 flex-shrink-0" style={{ background: "#e2e8f0", color: "#475569", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
                                    {item}
                                    <i className="bi bi-x ms-1" style={{ cursor: "pointer", fontSize: "14px" }} onClick={(e) => { e.stopPropagation(); toggleSpecialty(item); }}></i>
                                </span>
                            ))}
                            <input 
                              ref={specialtyInputRef}
                              type="text"
                              className="border-0 shadow-none bg-transparent py-1 flex-grow-1"
                              style={{ fontSize: "14px", outline: "none", minWidth: "100px" }}
                              placeholder={formData.specialty.length === 0 ? "Chọn ngành nghề" : ""}
                              value={specialtySearch}
                              onChange={(e) => {
                                setSpecialtySearch(e.target.value);
                                setIsSpecialtyOpen(true);
                              }}
                              onFocus={() => setIsSpecialtyOpen(true)}
                            />
                            <i className={`bi bi-chevron-${isSpecialtyOpen ? 'up' : 'down'} text-muted ms-auto sticky-end bg-white ps-2`} />
                          </div>
                          <AnimatePresence>
                            {isSpecialtyOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="position-absolute w-100 mt-2 bg-white border rounded-3 shadow-lg p-2" 
                                style={{ zIndex: 100, maxHeight: "250px", overflowY: "auto" }}
                              >
                                {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                                  <div key={opt} className="d-flex align-items-center gap-2 p-2 rounded-2 hover-bg-light" style={{ cursor: "pointer", fontSize: "13px" }} onClick={() => toggleSpecialty(opt)}>
                                    <input type="checkbox" className="form-check-input m-0 shadow-none" checked={formData.specialty.includes(opt)} readOnly style={{ pointerEvents: "none" }} />
                                    <span className={formData.specialty.includes(opt) ? "fw-bold text-primary" : ""}>{opt}</span>
                                  </div>
                                )) : (
                                    <div className="p-3 text-center text-muted small">Không tìm thấy kết quả</div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label style={labelStyle}>Cấp bậc</label>
                        <select className="form-select shadow-none" style={inputStyle} value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                          <option>Giám đốc</option>
                          <option>Trưởng phòng</option>
                          <option>Trưởng nhóm</option>
                          <option>Chuyên gia</option>
                          <option>Nhân viên</option>
                          <option>Cộng tác viên</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label style={labelStyle}>Hình thức làm việc</label>
                        <select className="form-select shadow-none" style={inputStyle} value={formData.workType} onChange={e => setFormData({...formData, workType: e.target.value})}>
                          <option>Toàn thời gian</option>
                          <option>Bán thời gian</option>
                          <option>Thực tập</option>
                          <option>Từ xa</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label style={labelStyle}>Số lượng cần tuyển</label>
                        <input type="number" className="form-control shadow-none" style={inputStyle} value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} />
                      </div>

                      <div className="col-md-4">
                        <label style={labelStyle}>Kinh nghiệm</label>
                        <select className="form-select shadow-none" style={inputStyle} value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}>
                          <option>Không yêu cầu</option>
                          <option>Dưới 1 năm</option>
                          <option>1 - 2 năm</option>
                          <option>2 - 5 năm</option>
                          <option>Trên 5 năm</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label style={labelStyle}>Trình độ</label>
                        <select className="form-select shadow-none" style={inputStyle} value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})}>
                          <option>Trên đại học</option>
                          <option>Đại học</option>
                          <option>Cao đẳng</option>
                          <option>Trung cấp</option>
                          <option>Trung học</option>
                          <option>Chứng chỉ</option>
                          <option>Không yêu cầu</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label style={labelStyle}>Giới tính</label>
                        <div className="d-flex gap-3 mt-2">
                          {["Tất cả", "Nam", "Nữ"].map(g => (
                            <div key={g} className="form-check">
                              <input className="form-check-input" type="radio" name="gender" id={`g-${g}`} checked={formData.gender === g} onChange={() => setFormData({...formData, gender: g})} />
                              <label className="form-check-label small" htmlFor={`g-${g}`}>{g}</label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label style={labelStyle}>Độ tuổi yêu cầu</label>
                        <div className="d-flex align-items-center gap-2">
                          <div className="input-group">
                            <input type="text" className="form-control shadow-none border-end-0" style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} value={formData.ageMin} onChange={e => setFormData({...formData, ageMin: e.target.value.replace(/[^0-9]/g, "")})} placeholder="Từ" />
                            <span className="input-group-text bg-light border-start-0" style={{ borderTopRightRadius: "10px", borderBottomRightRadius: "10px", fontSize: "12px" }}>tuổi</span>
                          </div>
                          <span className="text-muted">-</span>
                          <div className="input-group">
                            <input type="text" className="form-control shadow-none border-end-0" style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} value={formData.ageMax} onChange={e => setFormData({...formData, ageMax: e.target.value.replace(/[^0-9]/g, "")})} placeholder="Đến" />
                            <span className="input-group-text bg-light border-start-0" style={{ borderTopRightRadius: "10px", borderBottomRightRadius: "10px", fontSize: "12px" }}>tuổi</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label style={labelStyle}>Mức lương đề xuất (VNĐ)</label>
                        <div className="d-flex align-items-center gap-2">
                          <div className="input-group">
                            <input 
                              type="text" className="form-control shadow-none border-end-0" 
                              style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} 
                              value={formatNumber(formData.salaryMin)} 
                              onChange={e => setFormData({...formData, salaryMin: parseNumber(e.target.value)})}
                              placeholder="Tối thiểu" 
                            />
                            <span className="input-group-text bg-light border-start-0" style={{ borderTopRightRadius: "10px", borderBottomRightRadius: "10px", fontSize: "12px" }}>VNĐ</span>
                          </div>
                          <span className="text-muted">-</span>
                          <div className="input-group">
                            <input 
                              type="text" className="form-control shadow-none border-end-0" 
                              style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} 
                              value={formatNumber(formData.salaryMax)} 
                              onChange={e => setFormData({...formData, salaryMax: parseNumber(e.target.value)})}
                              placeholder="Tối đa" 
                            />
                            <span className="input-group-text bg-light border-start-0" style={{ borderTopRightRadius: "10px", borderBottomRightRadius: "10px", fontSize: "12px" }}>VNĐ</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-100 d-flex flex-column">
                    <div className="d-flex gap-2 mb-3">
                      {[
                        { id: "desc", label: "Mô tả", icon: "bi-list-task" },
                        { id: "req", label: "Yêu cầu", icon: "bi-person-check" },
                        { id: "benefit", label: "Quyền lợi", icon: "bi-gift" }
                      ].map(tab => (
                        <button 
                          key={tab.id}
                          className={`btn btn-sm px-4 fw-bold shadow-sm transition-all`}
                          style={{ 
                            borderRadius: "20px", 
                            background: activeWorkTab === tab.id ? "#003087" : "#f1f5f9", 
                            color: activeWorkTab === tab.id ? "#fff" : "#475569", 
                            border: activeWorkTab === tab.id ? "1px solid #003087" : "1px solid #e2e8f0", 
                            fontSize: "12px" 
                          }}
                          onClick={() => setActiveWorkTab(tab.id as any)}
                        >
                          <i className={`bi ${tab.icon} me-2`}></i>{tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-grow-1">
                      <AnimatePresence mode="wait">
                        {activeWorkTab === "desc" && (
                          <motion.div key="desc" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                            <label style={labelStyle}>Mô tả công việc <span className="text-danger">*</span></label>
                            <textarea className="form-control shadow-none" style={{ ...inputStyle, height: "280px" }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Các đầu việc chính ứng viên sẽ đảm nhận..."></textarea>
                          </motion.div>
                        )}
                        {activeWorkTab === "req" && (
                          <motion.div key="req" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                            <label style={labelStyle}>Yêu cầu ứng viên</label>
                            <textarea className="form-control shadow-none" style={{ ...inputStyle, height: "280px" }} value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} placeholder="Kỹ năng, thái độ, bằng cấp cần thiết..."></textarea>
                          </motion.div>
                        )}
                        {activeWorkTab === "benefit" && (
                          <motion.div key="benefit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                            <label style={labelStyle}>Quyền lợi và Chế độ</label>
                            <textarea className="form-control shadow-none" style={{ ...inputStyle, height: "280px" }} value={formData.benefits} onChange={e => setFormData({...formData, benefits: e.target.value})} placeholder="Phụ cấp, thưởng, BHXH, môi trường làm việc..."></textarea>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="row g-4">
                      {/* Left Column: Administrative Fields */}
                      <div className="col-md-5">
                        <div className="d-flex flex-column gap-3">
                          <div>
                            <label style={labelStyle}>Ngày yêu cầu</label>
                            <input type="date" className="form-control shadow-none" style={inputStyle} value={formData.requestDate} onChange={e => setFormData({...formData, requestDate: e.target.value})} />
                          </div>
                          <div>
                            <label style={labelStyle}>Ngày cần nhân sự</label>
                            <input type="date" className="form-control shadow-none" style={inputStyle} value={formData.needDate} onChange={e => setFormData({...formData, needDate: e.target.value})} />
                          </div>
                          <div>
                            <label style={labelStyle}>Phòng ban / Bộ phận yêu cầu</label>
                            <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                          </div>
                          <div>
                            <label style={labelStyle}>Người lập yêu cầu</label>
                            <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.requestedBy} onChange={e => setFormData({...formData, requestedBy: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Skills Textarea */}
                      <div className="col-md-7">
                        <label style={labelStyle}>Các kỹ năng cần thiết</label>
                        <textarea 
                          className="form-control shadow-none" 
                          style={{ ...inputStyle, height: "305px" }} 
                          value={formData.skills} 
                          onChange={e => setFormData({...formData, skills: e.target.value})} 
                          placeholder="Ví dụ: Kỹ năng giao tiếp, Giải quyết vấn đề, Thành thạo Excel..."
                        ></textarea>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-top bg-light d-flex justify-content-between align-items-center">
              <button className="btn btn-link text-decoration-none fw-bold text-muted p-0" onClick={prevStep} disabled={currentStep === 1} style={{ visibility: currentStep === 1 ? "hidden" : "visible" }}>
                <i className="bi bi-arrow-left me-2"></i> Quay lại
              </button>
              <div className="d-flex gap-3">
                <button className="btn btn-light fw-bold px-4" style={{ borderRadius: "10px" }} onClick={onClose}>Hủy bỏ</button>
                <button 
                  className="btn btn-primary px-4 fw-bold shadow-sm" 
                  style={{ borderRadius: "10px", background: "#003087", border: "none" }} 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : (initialData ? "Cập nhật" : "Gửi yêu cầu")}
                </button>
              </div>
            </div>
          </motion.div>
          <style jsx>{`
            .hover-bg-light:hover { background-color: #f8fafc; }
            .transition-all { transition: all 0.2s ease; }
            .badge { cursor: default; }
            .badge i:hover { color: #1e293b; }
            .custom-scrollbar-horizontal::-webkit-scrollbar { display: none; }
            .custom-scrollbar-horizontal { -ms-overflow-style: none; scrollbar-width: none; }
            .sticky-end { position: sticky; right: 0; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
