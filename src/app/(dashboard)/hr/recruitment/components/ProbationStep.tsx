"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import CreateEmployeeModal from "@/components/hr/CreateEmployeeModal";
import { BrandButton } from "@/components/ui/BrandButton";

interface Candidate {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  status: string;
  experience: string;
  matchScore: number;
  gender?: string;
  birthDate?: string;
  address?: string;
  desiredSalary?: string;
  education?: string;
  request?: {
    position: string;
    department: string;
    departmentCode?: string;
    level?: string;
  };
  scorecards?: any[];
  skills?: string;
}

export function ProbationStep({ onFinalize }: { onFinalize?: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [selectedProbationCandidate, setSelectedProbationCandidate] = useState<Candidate | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Offcanvas fields state
  const [mentorId, setMentorId] = useState("");
  const [probationValue, setProbationValue] = useState("2");
  const [probationUnit, setProbationUnit] = useState("month");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainingPlan, setTrainingPlan] = useState("");

  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const { success, error } = useToast();

  const fetchProbationData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/recruitment/probation");
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data);
      }
    } catch (err) {
      console.error("Fetch probation error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProbationData();
    fetch("/api/hr/departments")
      .then(r => r.json())
      .then(d => setDepartments(d.departments || []))
      .catch(err => console.error("Fetch depts error:", err));

    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d || []))
      .catch(err => console.error("Fetch positions error:", err));

    fetch("/api/board/categories?type=cap_bac")
      .then(r => r.json())
      .then(d => setLevels(d || []))
      .catch(err => console.error("Fetch levels error:", err));
  }, []);

  useEffect(() => {
    if (selectedProbationCandidate) {
      const dept = selectedProbationCandidate.request?.department;
      const deptCode = departments.find(d => d.nameVi === dept || d.code === dept || d.name === dept)?.code;

      if (deptCode) {
        setLoadingEmployees(true);
        fetch(`/api/hr/employees?department=${deptCode}&pageSize=100`)
          .then(r => r.json())
          .then(data => {
            const emps = data.employees || [];
            setDepartmentEmployees(emps);
            const defaultMentor = emps.find((e: any) => e.position?.toLowerCase().includes("trưởng phòng") || e.level === "mid_manager")?.id;
            if (defaultMentor) setMentorId(defaultMentor);
          })
          .catch(err => console.error("Fetch employees error:", err))
          .finally(() => setLoadingEmployees(false));
      } else {
        setDepartmentEmployees([]);
      }

      // Tự động điền thời gian thử việc từ Scorecards (Báo cáo tuyển dụng)
      if (selectedProbationCandidate.scorecards && selectedProbationCandidate.scorecards.length > 0) {
        const suggests = selectedProbationCandidate.scorecards.map(s => s.probationSuggest).filter(Boolean);
        if (suggests.length > 0) {
          const first = suggests[0].toLowerCase();
          const match = first.match(/\d+/);
          if (match) {
            const val = match[0];
            setProbationValue(val);
            // Nếu có từ khóa ngày/day hoặc số > 12 thì để đơn vị là ngày
            if (first.includes("ngày") || first.includes("day") || parseInt(val) > 12) {
              setProbationUnit("day");
            } else {
              setProbationUnit("month");
            }
          }
        }
      }
    }
  }, [selectedProbationCandidate, departments]);

  // Auto-generate unique email when candidate is selected
  useEffect(() => {
    if (selectedProbationCandidate) {
      setIsGeneratingEmail(true);
      fetch(`/api/hr/employees/generate-email?fullName=${encodeURIComponent(selectedProbationCandidate.name)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setGeneratedEmail(data.email);
          }
        })
        .finally(() => setIsGeneratingEmail(false));
    } else {
      setGeneratedEmail("");
    }
  }, [selectedProbationCandidate]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/hr/recruitment/candidates/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        success("Thành công", `Đã cập nhật trạng thái: ${status}`);
        fetchProbationData();
      } else {
        error("Lỗi", data.error);
      }
    } catch (err: any) {
      error("Lỗi", err.message);
    }
  };

  const handleOnboard = (candidate: Candidate) => {
    if (!mentorId) {
      error("Thiếu thông tin", "Vui lòng chọn Người theo dõi (Mentor) trước khi tiếp nhận nhân sự.");
      return;
    }
    setSelectedCandidate(candidate);
    setShowOnboardModal(true);
  };

  const getStatusBadge = (status: string) => {
    const cfg: any = {
      "Đã tiếp nhận": { bg: "#e0f2fe", color: "#0369a1", label: "Đồng ý tuyển dụng" },
      "Đã gửi thư mời": { bg: "#fef9c3", color: "#854d0e", label: "Đã gửi thư mời" },
      "Đang thử việc": { bg: "#dcfce7", color: "#166534", label: "Đang thử việc" },
      "Đã nhận việc": { bg: "#dcfce7", color: "#166534", label: "Đã nhận việc" },
      "Từ chối nhận việc": { bg: "#fee2e2", color: "#991b1b", label: "Từ chối tuyển dụng" },
      "Không nhận việc": { bg: "#fee2e2", color: "#991b1b", label: "Không nhận việc" },
      "Đã chuyển thành nhân viên": { bg: "#f1f5f9", color: "#475569", label: "Đã vào làm" },
    };
    const c = cfg[status] || { bg: "#f1f5f9", color: "#475569", label: status };
    return (
      <span style={{ padding: "4px 12px", fontSize: "11px", fontWeight: 700, borderRadius: "20px", backgroundColor: c.bg, color: c.color }}>
        {c.label}
      </span>
    );
  };

  const TABLE_HEADER_STYLE: React.CSSProperties = {
    padding: "10px 16px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase",
    color: "#64748b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
    textAlign: "left", letterSpacing: "0.05em",
    position: "sticky", top: 0, zIndex: 10
  };

  return (
    <div className="d-flex flex-column h-100 mt-1">
      {/* Main Table */}
      <div className="bg-white rounded-3 shadow-sm flex-grow-1 overflow-hidden d-flex flex-column">
        <div className="overflow-auto custom-scrollbar flex-grow-1">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: "12.5px" }}>
            <thead>
              <tr>
                <th className="ps-4" style={TABLE_HEADER_STYLE}>Ứng viên</th>
                <th style={TABLE_HEADER_STYLE}>Vị trí & Phòng ban</th>
                <th style={TABLE_HEADER_STYLE}>Theo dõi</th>
                <th style={TABLE_HEADER_STYLE}>Trạng thái</th>
                <th className="pe-4 text-end" style={TABLE_HEADER_STYLE}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    <span className="text-muted">Đang tải dữ liệu...</span>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <div className="mb-3"><i className="bi bi-inbox text-muted fs-1"></i></div>
                    <p className="text-muted mb-0">Chưa có ứng viên nào trong giai đoạn này.</p>
                  </td>
                </tr>
              ) : candidates.map(c => (
                <tr
                  key={c.id}
                  style={{ cursor: (c.status === "Đang thử việc" || c.status === "Đã nhận việc") ? "pointer" : "default" }}
                  onClick={() => {
                    if (c.status === "Đang thử việc" || c.status === "Đã nhận việc") {
                      setSelectedProbationCandidate(c);
                    }
                  }}
                >
                  <td className="ps-4 py-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 28, height: 28, fontSize: "11px" }}>
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="fw-bold">{c.name}</div>
                        <div className="text-muted" style={{ fontSize: "10.5px" }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="fw-bold">{c.request?.position || c.position}</div>
                    <div className="text-muted" style={{ fontSize: "10.5px" }}>{c.request?.department || "N/A"}</div>
                  </td>
                  <td className="py-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="text-muted italic" style={{ fontSize: "11px" }}>
                        <i className="bi bi-person-badge me-1"></i> Chưa phân công
                      </div>
                    </div>
                  </td>
                  <td className="py-2">
                    {getStatusBadge(c.status)}
                  </td>
                  <td className="pe-4 py-2 text-end">
                    <div className="d-flex justify-content-end gap-2">
                      {c.status === "Đã nhận việc" && (
                        <button 
                          className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center gap-1" 
                          style={{ fontSize: "10.5px", background: "#003087", border: "none" }} 
                          onClick={(e) => { e.stopPropagation(); setSelectedProbationCandidate(c); }}
                        >
                          <i className="bi bi-person-gear-fill"></i>
                          Phân công thử việc
                        </button>
                      )}
                      {c.status === "Đã tiếp nhận" && (
                        <button className="btn btn-primary btn-sm rounded-pill px-3" style={{ fontSize: "11px" }} onClick={() => updateStatus(c.id, "Đã gửi thư mời")}>
                          Gửi thư mời
                        </button>
                      )}
                      {c.status === "Đã gửi thư mời" && (
                        <>
                          <button className="btn btn-success btn-sm rounded-pill px-3" style={{ fontSize: "11px" }} onClick={(e) => { e.stopPropagation(); updateStatus(c.id, "Đã nhận việc"); }}>
                            Chấp nhận
                          </button>
                          <button className="btn btn-outline-danger btn-sm rounded-pill px-3" style={{ fontSize: "11px" }} onClick={(e) => { e.stopPropagation(); updateStatus(c.id, "Không nhận việc"); }}>
                            Từ chối
                          </button>
                        </>
                      )}
                      {c.status === "Đang thử việc" && (
                        <button className="btn btn-dark btn-sm rounded-pill px-3 shadow-sm" style={{ background: "#003087", fontSize: "11px" }} onClick={(e) => { e.stopPropagation(); handleOnboard(c); }}>
                          <i className="bi bi-person-plus-fill me-1"></i> Tiếp nhận nhân sự
                        </button>
                      )}
                      {c.status === "Đã chuyển thành nhân viên" && (
                        <span className="text-muted small italic">Đã hoàn tất</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showOnboardModal && selectedCandidate && (
        <CreateEmployeeModal
          onClose={() => setShowOnboardModal(false)}
          departments={departments}
          onCreated={async () => {
            updateStatus(selectedCandidate.id, "Đã chuyển thành nhân viên");

            // Also update the Recruitment Request status to Completed
            if ((selectedCandidate as any).requestId) {
              await fetch(`/api/hr/recruitment/${(selectedCandidate as any).requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Completed" })
              });
            }

            setShowOnboardModal(false);
            fetchProbationData();
            if (onFinalize) onFinalize();
          }}
          initialData={{
            fullName: selectedCandidate.name,
            gender: selectedCandidate.gender?.toLowerCase() === "nữ" ? "female" : "male",
            phone: selectedCandidate.phone,
            personalEmail: selectedCandidate.email,
            workEmail: generatedEmail || "",
            birthDate: selectedCandidate.birthDate ? new Date(selectedCandidate.birthDate).toISOString().split('T')[0] : "",
            currentAddress: selectedCandidate.address,
            // Map position string to existing position code
            position: (() => {
              const candPos = (selectedCandidate.request?.position || selectedCandidate.position || "").toLowerCase();
              const match = positions.find(p =>
                candPos.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(candPos)
              );
              return match ? match.code : "";
            })(),
            departmentName: selectedCandidate.request?.department || "",
            departmentCode: departments.find(d =>
              d.nameVi === selectedCandidate.request?.department ||
              d.code === selectedCandidate.request?.department ||
              d.name === selectedCandidate.request?.department
            )?.code || "",
            // Map level string to existing level code
            level: (() => {
              const candLevel = (selectedCandidate.request?.level || "").toLowerCase();
              if (candLevel.includes("nhân viên") || candLevel === "staff") return "staff";
              if (candLevel.includes("cấp trung") || candLevel === "mid_manager") return "mid_manager";
              if (candLevel.includes("cấp cao") || candLevel === "senior_manager") return "senior_manager";
              return candLevel;
            })(),
            employeeType: "probation",
            baseSalary: (() => {
              const scs = selectedCandidate.scorecards || [];
              const avg = scs.length > 0 ? Math.round(scs.reduce((acc, s) => acc + (s.salarySuggest || 0), 0) / scs.length) : 0;
              return avg > 0 ? avg.toString() : "";
            })(),
            education: selectedCandidate.education || "",
            skills: selectedCandidate.skills || "",
            startDate: startDate, // From offcanvas state
            mentorId: mentorId,
            probationValue: probationValue,
            probationUnit: probationUnit,
            trainingPlan: trainingPlan
          }}
        />
      )}

      {selectedProbationCandidate && (
        <>
          <div className="position-fixed top-0 start-0 end-0 bottom-0 bg-dark opacity-25" style={{ zIndex: 100004 }} onClick={() => setSelectedProbationCandidate(null)}></div>
          <div
            className="position-fixed top-0 end-0 bottom-0 bg-white shadow-lg border-start d-flex flex-column"
            style={{ width: 400, zIndex: 100005, transition: "all 0.3s ease-in-out" }}
          >
            {/* Header */}
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light">
              <div>
                <h6 className="fw-bold mb-0 text-primary" style={{ fontSize: "15px" }}>Phân công thử việc</h6>
                <div className="text-muted" style={{ fontSize: "10.5px" }}>Thiết lập quy trình cho {selectedProbationCandidate.name}</div>
              </div>
              <button className="btn-close" style={{ padding: "0.25rem", fontSize: "10px" }} onClick={() => setSelectedProbationCandidate(null)}></button>
            </div>

            {/* Body */}
            <div className="p-3 flex-grow-1 overflow-auto custom-scrollbar">
              {/* Candidate Info Card */}
              <div className="p-3 rounded-3 border bg-primary-subtle border-primary-subtle mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 40, height: 40, fontSize: "14px" }}>
                    {selectedProbationCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <div className="fw-bold mb-0" style={{ fontSize: "14px" }}>{selectedProbationCandidate.name}</div>
                    <div className="text-primary fw-medium" style={{ fontSize: "12px" }}>{selectedProbationCandidate.request?.position || selectedProbationCandidate.position}</div>
                  </div>
                </div>
              </div>

              <form className="d-flex flex-column gap-3">
                {/* Mentor Selection */}
                <div>
                  <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: "11px" }}>
                    Người theo dõi <span className="text-danger">*</span>
                  </label>
                  <div className="input-group input-group-sm shadow-sm">
                    <span className="input-group-text bg-white border-end-0"><i className="bi bi-person-badge text-primary"></i></span>
                    <select
                      className="form-select border-start-0 ps-0"
                      style={{ fontSize: "13px" }}
                      value={mentorId}
                      onChange={(e) => setMentorId(e.target.value)}
                    >
                      <option value="" disabled>Chọn người theo dõi...</option>
                      {loadingEmployees ? (
                        <option disabled>Đang tải danh sách...</option>
                      ) : departmentEmployees.length > 0 ? (
                        departmentEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.fullName}</option>
                        ))
                      ) : (
                        <option disabled>Không có nhân viên nào trong phòng này</option>
                      )}
                    </select>
                  </div>
                  <div className="form-text italic text-muted mt-1" style={{ fontSize: "11px" }}>Người này sẽ chịu trách nhiệm đánh giá kết quả thử việc.</div>
                </div>

                <div className="row g-3">
                  {/* Probation Period */}
                  <div className="col-6">
                    <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: "11px" }}>Thời gian thử việc</label>
                    <div className="input-group input-group-sm shadow-sm">
                      <input
                        type="number"
                        className="form-control"
                        style={{ fontSize: "13px" }}
                        value={probationValue}
                        onChange={(e) => setProbationValue(e.target.value)}
                      />
                      <select
                        className="form-select"
                        style={{ fontSize: "12px", maxWidth: "90px" }}
                        value={probationUnit}
                        onChange={(e) => setProbationUnit(e.target.value)}
                      >
                        <option value="month">Tháng</option>
                        <option value="day">Ngày</option>
                      </select>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="col-6">
                    <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: "11px" }}>Ngày bắt đầu</label>
                    <div className="input-group input-group-sm shadow-sm">
                      <input
                        type="date"
                        className="form-control"
                        style={{ fontSize: "13px" }}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Candidate Info Summary */}
                <div>
                  <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: "11px" }}>Thông tin nhân viên</label>
                  <div className="p-3 rounded-3 border bg-light shadow-sm" style={{ fontSize: "12.5px" }}>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <span className="text-muted">Email cá nhân:</span>
                        <span className="fw-medium">{selectedProbationCandidate.email}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <span className="text-muted">Email công việc:</span>
                        <span className="fw-bold text-primary">
                          {isGeneratingEmail ? (
                            <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }}></span>
                          ) : (
                            generatedEmail || "Đang tạo..."
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <span className="text-muted">Số điện thoại:</span>
                        <span className="fw-medium">{selectedProbationCandidate.phone || "N/A"}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <span className="text-muted">Mức lương đề xuất:</span>
                        <span className="fw-bold text-success">
                          {(() => {
                            const scs = selectedProbationCandidate.scorecards || [];
                            const avg = scs.length > 0 ? Math.round(scs.reduce((acc, s) => acc + (s.salarySuggest || 0), 0) / scs.length) : 0;
                            return avg > 0 ? avg.toLocaleString() + " VNĐ" : "Thoả thuận";
                          })()}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <span className="text-muted">Vị trí:</span>
                        <span className="fw-medium">{selectedProbationCandidate.request?.position || selectedProbationCandidate.position}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-1">
                        <span className="text-muted">Phòng ban:</span>
                        <span className="fw-medium">{selectedProbationCandidate.request?.department || "N/A"}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Cấp bậc:</span>
                        <span className="fw-medium">
                          {(() => {
                            const levelMap: any = {
                              "staff": "Nhân viên",
                              "mid_manager": "Quản lý cấp trung",
                              "senior_manager": "Quản lý cấp cao"
                            };
                            return levelMap[selectedProbationCandidate.request?.level || ""] || selectedProbationCandidate.request?.level || "N/A";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-3 border-top bg-light">
              <div className="d-flex gap-2">
                <BrandButton
                  className="flex-grow-1"
                  onClick={() => {
                    const candidate = selectedProbationCandidate;
                    setSelectedProbationCandidate(null);
                    setTimeout(() => handleOnboard(candidate), 100);
                  }}
                >
                  Tiếp nhận nhân sự
                </BrandButton>
                <BrandButton
                  variant="outline"
                  className="flex-grow-1"
                  onClick={() => setSelectedProbationCandidate(null)}
                >
                  Để sau
                </BrandButton>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .fw-black { font-weight: 900; }
        .bg-primary-subtle { background-color: #e0e7ff; }
        .bg-success-subtle { background-color: #dcfce7; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
