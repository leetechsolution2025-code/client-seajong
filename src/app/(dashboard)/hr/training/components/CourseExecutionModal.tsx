"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tab, TabItem } from "@/components/ui/Tab";
import { Table, TableColumn } from "@/components/ui/Table";

interface CourseExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
  onSuccess: () => void;
}

const EXEC_TABS: TabItem[] = [
  { key: "attendance", label: "Điểm danh & Học viên" },
  { key: "test", label: "Cấu hình Bài Test" },
  { key: "results", label: "Kết quả & Đánh giá" },
];

export const CourseExecutionModal = ({ isOpen, onClose, course, onSuccess }: CourseExecutionModalProps) => {
  const [activeTab, setActiveTab] = useState("attendance");
  const [participants, setParticipants] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchParticipants = async () => {
    if (!course) return;
    const res = await fetch(`/api/hr/training/courses/${course.id}/participants`);
    const data = await res.json();
    setParticipants(data);
  };

  const fetchQuestions = async () => {
    if (!course) return;
    const res = await fetch(`/api/hr/training/courses/${course.id}/questions`);
    const data = await res.json();
    setQuestions(data.map((q: any) => ({ ...q, options: JSON.parse(q.options) })));
  };

  const fetchEmployees = async () => {
    const res = await fetch("/api/hr/employees");
    const data = await res.json();
    setEmployees(data);
  };

  useEffect(() => {
    if (isOpen && course) {
      fetchParticipants();
      fetchQuestions();
      fetchEmployees();
    }
  }, [isOpen, course]);

  const handleAddParticipant = async (employeeId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/hr/training/courses/${course.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([employeeId])
      });
      fetchParticipants();
    } finally {
      setLoading(false);
    }
  };

  const updateParticipant = async (employeeId: string, updates: any) => {
    await fetch(`/api/hr/training/courses/${course.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, ...updates })
    });
    fetchParticipants();
  };

  const handleSaveQuestions = async () => {
    setLoading(true);
    try {
      await fetch(`/api/hr/training/courses/${course.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questions)
      });
      alert("Đã lưu bộ câu hỏi!");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
  };

  const participantColumns: TableColumn<any>[] = [
    {
      header: "Nhân viên",
      render: (row) => {
        const emp = employees.find(e => e.id === row.employeeId);
        return (
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>
              {emp?.fullName?.charAt(0)}
            </div>
            <div>
              <div className="fw-bold small">{emp?.fullName || "N/A"}</div>
              <div className="text-muted" style={{ fontSize: "10px" }}>{emp?.code}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Điểm danh",
      render: (row) => (
        <select 
          className="form-select form-select-sm shadow-none" 
          style={{ width: "110px", fontSize: "12px" }}
          value={row.attendance}
          onChange={(e) => updateParticipant(row.employeeId, { attendance: e.target.value })}
        >
          <option value="PENDING">Chờ</option>
          <option value="PRESENT">Có mặt</option>
          <option value="ABSENT">Vắng</option>
        </select>
      )
    },
    {
      header: "Điểm thi",
      render: (row) => (
        <input 
          type="number" className="form-control form-control-sm shadow-none" 
          style={{ width: "60px" }} 
          value={row.testScore || ""} 
          onChange={(e) => updateParticipant(row.employeeId, { testScore: parseFloat(e.target.value) })}
        />
      )
    }
  ];

  const resultColumns: TableColumn<any>[] = [
    {
      header: "Nhân viên",
      render: (row) => {
        const emp = employees.find(e => e.id === row.employeeId);
        return <div className="fw-bold small">{emp?.fullName}</div>;
      }
    },
    {
      header: "Kết quả bài Test",
      render: (row) => (
        <div className="d-flex align-items-center gap-2">
          <div className="progress flex-grow-1" style={{ height: "6px", width: "100px" }}>
            <div className="progress-bar bg-success" style={{ width: `${(row.testScore || 0) * 10}%` }}></div>
          </div>
          <span className="small fw-bold">{(row.testScore || 0).toFixed(1)}/10</span>
        </div>
      )
    },
    {
      header: "Đánh giá hiệu quả",
      render: (row) => (
        <input 
          type="text" className="form-control form-control-sm shadow-none" 
          placeholder="Nhận xét..."
          value={row.feedback || ""}
          onChange={(e) => updateParticipant(row.employeeId, { feedback: e.target.value })}
        />
      )
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ 
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
            background: "rgba(0, 0, 0, 0.4)", zIndex: 2000, 
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            style={{ 
              width: "100%", maxWidth: "900px", height: "80vh",
              background: "var(--background)", borderRadius: "24px", overflow: "hidden",
              display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center bg-white sticky-top">
              <div>
                <h6 className="mb-0 fw-bold">Triển khai đào tạo: {course?.request?.topic}</h6>
                <div className="text-muted small">Quản lý điểm danh và bài thi trắc nghiệm</div>
              </div>
              <button className="btn-close shadow-none" onClick={onClose}></button>
            </div>

            <div className="px-4 py-2 bg-light border-bottom">
              <Tab tabs={EXEC_TABS} active={activeTab} onChange={setActiveTab} />
            </div>

            <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
              {activeTab === "attendance" && (
                <div className="row h-100">
                  <div className="col-md-8 border-end h-100 overflow-auto">
                    <h6 className="fw-bold mb-3 small">Danh sách học viên tham gia</h6>
                    <Table rows={participants} columns={participantColumns} emptyText="Chưa có học viên nào được thêm" compact />
                  </div>
                  <div className="col-md-4">
                    <h6 className="fw-bold mb-3 small">Thêm học viên nhanh</h6>
                    <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: "400px" }}>
                      {employees.filter(e => !participants.some(p => p.employeeId === e.id)).map(e => (
                        <div key={e.id} className="d-flex align-items-center justify-content-between p-2 border rounded-3 hover-bg-light" style={{ cursor: "pointer" }} onClick={() => handleAddParticipant(e.id)}>
                          <span className="small fw-medium">{e.fullName}</span>
                          <i className="bi bi-plus-circle text-primary"></i>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "test" && (
                <div className="d-flex flex-column gap-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0">Ngân hàng câu hỏi trắc nghiệm (MCQ)</h6>
                    <button className="btn btn-sm btn-outline-primary fw-bold" onClick={handleAddQuestion}>+ Thêm câu hỏi</button>
                  </div>
                  
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-4 border rounded-4 bg-light bg-opacity-50 position-relative">
                      <div className="mb-3">
                        <label className="small fw-bold text-muted mb-2">CÂU HỎI {idx + 1}</label>
                        <input 
                          type="text" className="form-control shadow-none fw-bold" 
                          value={q.question} 
                          onChange={(e) => {
                            const next = [...questions];
                            next[idx].question = e.target.value;
                            setQuestions(next);
                          }}
                          placeholder="Nhập nội dung câu hỏi..." 
                        />
                      </div>
                      <div className="row g-2">
                        {q.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="col-md-6">
                            <div className="input-group input-group-sm">
                              <span className="input-group-text bg-white">
                                <input 
                                  type="radio" className="form-check-input" 
                                  name={`correct-${idx}`} 
                                  checked={q.correctAnswer === optIdx}
                                  onChange={() => {
                                    const next = [...questions];
                                    next[idx].correctAnswer = optIdx;
                                    setQuestions(next);
                                  }}
                                />
                              </span>
                              <input 
                                type="text" className="form-control shadow-none" 
                                value={opt}
                                onChange={(e) => {
                                  const next = [...questions];
                                  next[idx].options[optIdx] = e.target.value;
                                  setQuestions(next);
                                }}
                                placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}`} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="btn-close position-absolute top-0 end-0 m-3 p-2" style={{ fontSize: "10px" }} onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}></button>
                    </div>
                  ))}

                  {questions.length > 0 && (
                    <button className="btn btn-primary fw-bold py-2 mt-2" onClick={handleSaveQuestions}>Lưu bộ câu hỏi</button>
                  )}
                </div>
              )}

              {activeTab === "results" && (
                <div>
                  <h6 className="fw-bold mb-3">Tổng hợp kết quả & Đánh giá sau đào tạo</h6>
                  <Table rows={participants} columns={resultColumns} compact />
                </div>
              )}
            </div>

            <div className="p-4 border-top bg-light d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Tình trạng: <span className="fw-bold text-primary">{course?.status}</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-light fw-bold px-4" onClick={onClose}>Đóng</button>
                {course?.status !== "COMPLETED" && (
                  <button 
                    className="btn btn-success fw-bold px-4"
                    onClick={async () => {
                      if (!confirm("Xác nhận hoàn thành khoá học? Dữ liệu sẽ được chốt để báo cáo.")) return;
                      await fetch(`/api/hr/training/courses/${course.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "COMPLETED" })
                      });
                      onSuccess();
                      onClose();
                    }}
                  >
                    Hoàn thành khoá học
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      <style jsx>{`
        .hover-bg-light:hover { background-color: #f8fafc; }
      `}</style>
    </AnimatePresence>
  );
};
