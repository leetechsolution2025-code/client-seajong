"use client";

import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { useToast } from "@/components/ui/Toast";

export interface RecruitmentFormRef {
  submit: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

interface RecruitmentRequestFormProps {
  onSuccess: (title?: string, content?: string) => void;
  onCancel: () => void;
  initialData?: any;
  onStepChange?: (step: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const STEP_ITEMS: ModernStepItem[] = [
  { num: 1, id: "basic", title: "Cơ bản", desc: "Thông tin vị trí", icon: "bi-info-circle" },
  { num: 2, id: "work", title: "Công việc", desc: "Mô tả & Yêu cầu", icon: "bi-file-earmark-text" },
  { num: 3, id: "extra", title: "Bổ sung", desc: "Thông tin khác", icon: "bi-plus-circle" },
];

const DEFAULT_SPECIALTIES = [
  "An ninh, bảo vệ", "Sản xuất, lắp ráp", "Vận hành, bảo trì, bảo dưỡng",
  "Kho vận, thu mua", "Vận tải, lái xe, giao nhận", "Chăm sóc khách hàng",
  "Hành chính, thư ký", "Thiết kế", "Marketing", "Bán hàng, kinh doanh",
  "Kế toán", "Nhân sự"
];

const formatNumber = (val: string | number) => {
  if (!val && val !== 0) return "";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumber = (val: string) => {
  return val.replace(/\./g, "");
};

export const RecruitmentRequestForm = forwardRef<RecruitmentFormRef, RecruitmentRequestFormProps>(
  ({ onSuccess, onCancel, initialData, onStepChange, onLoadingChange }, ref) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeWorkTab, setActiveWorkTab] = useState<"desc" | "req" | "benefit">("desc");
  const { data: session } = useSession();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    nextStep: () => setCurrentStep(prev => Math.min(prev + 1, 3)),
    prevStep: () => setCurrentStep(prev => Math.max(prev - 1, 1))
  }));

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);
  
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
    if (initialData) {
      let reqs: any = {};
      try { reqs = typeof initialData.requirements === 'string' ? JSON.parse(initialData.requirements) : (initialData.requirements || {}); } catch (e) {}

      let specArr: string[] = [];
      if (initialData.specialty) { specArr = initialData.specialty.split(", ").filter(Boolean); }
      else if (reqs.specialty) { specArr = Array.isArray(reqs.specialty) ? reqs.specialty : reqs.specialty.split(", ").filter(Boolean); }

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
    } else {
        setFormData(prev => ({
          ...prev,
          department: (session?.user as any)?.departmentName || "",
          requestedBy: session?.user?.name || "",
        }));
    }
  }, [initialData, session]);

  const filteredOptions = useMemo(() => {
    const search = specialtySearch.toLowerCase();
    return DEFAULT_SPECIALTIES.filter(opt => opt.toLowerCase().includes(search));
  }, [specialtySearch]);

  const handleSubmit = async () => {
    if (!formData.position.trim()) return toastError("Lỗi", "Vui lòng nhập vị trí tuyển dụng");
    setLoading(true);
    try {
      const url = initialData ? `/api/hr/recruitment/${initialData.id}` : "/api/hr/recruitment";
      const method = initialData ? "PATCH" : "POST";
      
      const payload = {
        ...formData,
        specialty: formData.specialty.join(", "),
        deadline: formData.needDate ? new Date(formData.needDate).toISOString() : null,
        requirements: JSON.stringify({
          ...formData,
          salaryRange: formData.salaryMin && formData.salaryMax ? `${formatNumber(formData.salaryMin)} - ${formatNumber(formData.salaryMax)} VNĐ` : "Thỏa thuận",
          ageRange: `${formData.ageMin} - ${formData.ageMax} tuổi`,
          requirementsText: formData.requirements,
        }),
        status: initialData ? initialData.status : "Pending",
        priority: "Normal",
        requesterId: session?.user?.id,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Có lỗi xảy ra");
      onSuccess(
        "Yêu cầu tuyển dụng mới",
        `Trưởng phòng **${session?.user?.name}** vừa gửi yêu cầu tuyển dụng cho vị trí **${formData.position}**.`
      );
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };
  const inputStyle = {
    borderRadius: "12px", padding: "12px 15px", border: "2px solid #e2e8f0",
    fontSize: "15px", transition: "all 0.2s"
  };
  
  const labelStyle = {
    fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px", display: "block", textTransform: "uppercase" as const
  };

  const toggleSpecialty = (opt: string) => {
    const current = formData.specialty;
    const next = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt];
    setFormData({ ...formData, specialty: next });
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <ModernStepper steps={STEP_ITEMS} currentStep={currentStep} onStepChange={setCurrentStep} paddingX={0} />
      </div>

      <div className="flex-grow-1 overflow-auto custom-scrollbar pe-2">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="row g-3">
                <div className="col-md-8">
                  <label style={labelStyle}>Tên vị trí cần tuyển dụng <span className="text-danger">*</span></label>
                  <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="VD: Nhân viên Kế toán Kho" />
                </div>
                <div className="col-md-4">
                    <label style={labelStyle}>Cấp bậc</label>
                    <select className="form-select shadow-none" style={inputStyle} value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                        <option>Giám đốc</option><option>Trưởng phòng</option><option>Trưởng nhóm</option><option>Chuyên gia</option><option>Nhân viên</option><option>Cộng tác viên</option>
                    </select>
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Hình thức</label>
                  <select className="form-select shadow-none" style={inputStyle} value={formData.workType} onChange={e => setFormData({...formData, workType: e.target.value})}>
                    <option>Toàn thời gian</option><option>Bán thời gian</option><option>Thực tập</option><option>Từ xa</option>
                  </select>
                </div>
                <div className="col-md-4">
                    <label style={labelStyle}>Số lượng</label>
                    <input type="number" className="form-control shadow-none" style={inputStyle} value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} />
                </div>
                <div className="col-md-4">
                    <label style={labelStyle}>Kinh nghiệm</label>
                    <select className="form-select shadow-none" style={inputStyle} value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}>
                        <option>Không yêu cầu</option><option>Dưới 1 năm</option><option>1 - 2 năm</option><option>2 - 5 năm</option><option>Trên 5 năm</option>
                    </select>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="d-flex gap-2 mb-3">
                    {["desc", "req", "benefit"].map(tab => (
                        <button key={tab} className={`btn btn-sm px-3 ${activeWorkTab === tab ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveWorkTab(tab as any)}>
                            {tab === 'desc' ? 'Mô tả' : tab === 'req' ? 'Yêu cầu' : 'Quyền lợi'}
                        </button>
                    ))}
                </div>
                <textarea className="form-control shadow-none" style={{ ...inputStyle, height: "200px" }} value={(formData as any)[activeWorkTab === 'desc' ? 'description' : activeWorkTab === 'req' ? 'requirements' : 'benefits']} onChange={e => setFormData({...formData, [activeWorkTab === 'desc' ? 'description' : activeWorkTab === 'req' ? 'requirements' : 'benefits']: e.target.value})} placeholder="Nhập nội dung chi tiết..."></textarea>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="row g-3">
                <div className="col-md-6">
                    <label style={labelStyle}>Ngày cần nhân sự</label>
                    <input type="date" className="form-control shadow-none" style={inputStyle} value={formData.needDate} onChange={e => setFormData({...formData, needDate: e.target.value})} />
                </div>
                <div className="col-md-6">
                    <label style={labelStyle}>Người lập</label>
                    <input type="text" className="form-control shadow-none" style={inputStyle} value={formData.requestedBy} readOnly />
                </div>
                <div className="col-12">
                    <label style={labelStyle}>Kỹ năng bổ sung</label>
                    <textarea className="form-control shadow-none" style={{ ...inputStyle, height: "100px" }} value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="Các kỹ năng khác..."></textarea>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
