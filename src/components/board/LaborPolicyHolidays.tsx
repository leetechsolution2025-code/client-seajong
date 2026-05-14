"use client";

import React, { useState, useEffect } from "react";
import { BrandButton } from "@/components/ui/BrandButton";
import { motion, AnimatePresence } from "framer-motion";

interface Holiday {
  id: string;
  name: string;
  type: "Ngày lễ" | "Tết" | "Nghỉ bù";
  startDate: string;
  endDate: string;
  days: number;
}

const DEFAULT_2026_HOLIDAYS: Holiday[] = [
  { id: "1", name: "Tết Dương lịch", type: "Ngày lễ", startDate: "2026-01-01", endDate: "2026-01-01", days: 1 },
  { id: "2", name: "Tết Nguyên Đán (Bính Ngọ)", type: "Tết", startDate: "2026-01-22", endDate: "2026-01-26", days: 5 },
  { id: "3", name: "Giỗ Tổ Hùng Vương", type: "Ngày lễ", startDate: "2026-04-28", endDate: "2026-04-28", days: 1 },
  { id: "4", name: "Ngày Giải phóng miền Nam", type: "Ngày lễ", startDate: "2026-04-30", endDate: "2026-04-30", days: 1 },
  { id: "5", name: "Ngày Quốc tế Lao động", type: "Ngày lễ", startDate: "2026-05-01", endDate: "2026-05-01", days: 1 },
  { id: "6", name: "Quốc khánh", type: "Ngày lễ", startDate: "2026-09-02", endDate: "2026-09-03", days: 2 },
];

const Badge = ({ type }: { type: string }) => {
  const colors: any = {
    "Ngày lễ": "bg-primary-subtle text-primary",
    "Tết": "bg-danger-subtle text-danger",
    "Nghỉ bù": "bg-warning-subtle text-warning",
  };
  return <span className={`badge rounded-pill px-2 py-1 ${colors[type] || "bg-light text-muted"}`} style={{ fontSize: '10px' }}>{type}</span>;
};

const getDayName = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return days[date.getDay()];
};

const formatDateVN = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
};

export function LaborPolicyHolidays({ policy, onSave }: { policy: any; onSave: (content: string) => void }) {
  const [year, setYear] = useState(2026);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Holiday | null>(null);

  useEffect(() => {
    if (policy?.content) {
      try {
        const parsed = JSON.parse(policy.content);
        if (parsed[year] && parsed[year].length > 0) {
          setHolidays(parsed[year]);
        } else {
          // Nếu năm này chưa có dữ liệu, tự động nạp mặc định
          handleInitDefault();
        }
      } catch (e) { 
        handleInitDefault();
      }
    } else {
      // Nếu chưa có bất kỳ chính sách nào, cũng nạp mặc định
      handleInitDefault();
    }
  }, [policy, year]);

  const handleInitDefault = () => {
    if (year === 2026) {
      setHolidays(DEFAULT_2026_HOLIDAYS);
    } else {
      setHolidays(DEFAULT_2026_HOLIDAYS.map(h => ({ ...h, startDate: h.startDate.replace("2026", year.toString()), endDate: h.endDate.replace("2026", year.toString()) })));
    }
  };

  const handleEdit = (h: Holiday) => {
    setEditingId(h.id);
    setEditData({ ...h });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleUpdate = () => {
    if (!editData) return;
    const newHolidays = holidays.map(h => h.id === editData.id ? editData : h);
    setHolidays(newHolidays);
    setEditingId(null);
    setEditData(null);
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleAdd = () => {
    const newId = `new-${Date.now()}`;
    const newHoliday: Holiday = {
      id: newId,
      name: "Kỳ nghỉ mới",
      type: "Ngày lễ",
      startDate: `${year}-01-01`,
      endDate: `${year}-01-01`,
      days: 1
    };
    setHolidays([...holidays, newHoliday]);
    setEditingId(newId);
    setEditData(newHoliday);
  };

  const saveChanges = (data: Holiday[]) => {
    onSave(JSON.stringify({ ...JSON.parse(policy?.content || "{}"), [year]: data }));
  };

  const handleDelete = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <span className="fw-bold text-muted small text-uppercase">Năm:</span>
          <div className="btn-group bg-white rounded-3 shadow-sm p-1 border">
            {[2025, 2026, 2027, 2028, 2029].map(y => (
              <button key={y} onClick={() => setYear(y)} className={`btn btn-sm px-3 border-0 rounded-2 transition-all ${year === y ? "btn-primary shadow-sm" : "btn-light text-muted"}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="d-flex gap-2">
          <BrandButton variant="outline" onClick={handleInitDefault} icon="bi-magic">Khởi tạo mặc định</BrandButton>
          <BrandButton onClick={handleAdd} icon="bi-plus-lg">Thêm kỳ nghỉ</BrandButton>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-4">
        <button className="btn btn-primary-subtle text-primary btn-sm rounded-pill px-3 py-1 fw-bold" style={{ fontSize: '12px' }}>Ngày lễ</button>
        <button className="btn btn-danger-subtle text-danger btn-sm rounded-pill px-3 py-1 fw-bold" style={{ fontSize: '12px' }}>Tết</button>
        <button className="btn btn-warning-subtle text-warning btn-sm rounded-pill px-3 py-1 fw-bold" style={{ fontSize: '12px' }}>Nghỉ bù</button>
        <span className="text-muted small ms-2" style={{ fontSize: '11px' }}>· Cột <b>Thực tế DN</b> có thể điều chỉnh (không được ít hơn pháp định)</span>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <table className="table table-hover align-middle mb-0">
          <thead className="bg-light">
            <tr>
              <th className="ps-4 py-2 border-0 text-muted small text-uppercase fw-bold" style={{ width: '30%', fontSize: '11px' }}>Kỳ nghỉ</th>
              <th className="py-2 border-0 text-muted small text-uppercase fw-bold text-center" style={{ fontSize: '11px' }}>Loại</th>
              <th className="py-2 border-0 text-muted small text-uppercase fw-bold text-center" style={{ fontSize: '11px' }}>Áp dụng</th>
              <th className="py-2 border-0 text-muted small text-uppercase fw-bold text-center" style={{ fontSize: '11px' }}>Số ngày</th>
              <th className="pe-4 py-2 border-0 text-muted small text-uppercase fw-bold text-end" style={{ fontSize: '11px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {holidays.length > 0 ? (
                holidays.map((h) => {
                  const isEditing = editingId === h.id;
                  const item = isEditing ? editData! : h;

                  return (
                    <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td className="ps-4 py-2 border-bottom">
                        <div className="fw-bold text-dark small">{item.name}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>{formatDateVN(item.startDate)}{item.startDate !== item.endDate ? ` → ${formatDateVN(item.endDate)}` : ""}</div>
                      </td>
                      <td className="py-2 border-bottom text-center">
                        <Badge type={item.type} />
                      </td>
                      <td className="py-2 border-bottom text-center text-muted">
                        {isEditing ? (
                          <div className="d-flex align-items-center gap-2 justify-content-center">
                            <input 
                              type="date" 
                              className="form-control form-control-sm border rounded-3 px-2" 
                              style={{ width: '135px', fontSize: '12px' }}
                              value={item.startDate}
                              onChange={(e) => setEditData({ ...item, startDate: e.target.value, days: calculateDays(e.target.value, item.endDate) })}
                            />
                            <span className="text-muted">→</span>
                            <input 
                              type="date" 
                              className="form-control form-control-sm border rounded-3 px-2" 
                              style={{ width: '135px', fontSize: '12px' }}
                              value={item.endDate}
                              onChange={(e) => setEditData({ ...item, endDate: e.target.value, days: calculateDays(item.startDate, e.target.value) })}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-dark" style={{ fontSize: '12px' }}>{formatDateVN(item.startDate)}{item.startDate !== item.endDate ? ` → ${formatDateVN(item.endDate)}` : ""}</div>
                            <div className="fw-bold text-muted" style={{ fontSize: '9px' }}>{getDayName(item.startDate)}{item.startDate !== item.endDate ? ` — ${getDayName(item.endDate)}` : ""}</div>
                          </>
                        )}
                      </td>
                      <td className="py-2 border-bottom text-center fw-bold small">{item.days}</td>
                      <td className="pe-4 py-2 border-bottom text-end">
                        {isEditing ? (
                          <div className="d-flex gap-1 justify-content-end">
                            <button onClick={handleUpdate} className="btn btn-success btn-sm rounded-3 px-3 py-1 fw-bold" style={{ fontSize: '11px' }}>Lưu</button>
                            <button onClick={handleCancel} className="btn btn-light btn-sm rounded-3 px-3 py-1 border fw-bold" style={{ fontSize: '11px' }}>Huỷ</button>
                          </div>
                        ) : (
                          <div className="d-flex gap-1 justify-content-end">
                            <button onClick={() => handleEdit(h)} className="btn btn-light btn-sm rounded-3 px-2 py-1 border fw-bold" style={{ fontSize: '11px' }}>Sửa</button>
                            <button 
                              className="btn btn-light btn-sm rounded-3 px-2 py-1 border fw-bold text-danger" 
                              style={{ fontSize: '11px', opacity: (h.type === 'Nghỉ bù' || h.id.startsWith('new-')) ? 1 : 0.4, cursor: (h.type === 'Nghỉ bù' || h.id.startsWith('new-')) ? 'pointer' : 'not-allowed' }}
                              disabled={h.type !== 'Nghỉ bù' && !h.id.startsWith('new-')}
                              onClick={() => handleDelete(h.id)}
                              title={h.type !== 'Nghỉ bù' && !h.id.startsWith('new-') ? "Không thể xoá ngày lễ theo quy định" : ""}
                            >
                              Xoá
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-5 text-center text-muted">
                    <i className="bi bi-calendar-x fs-1 d-block mb-2 opacity-25"></i>
                    Chưa có cấu hình ngày nghỉ cho năm {year}
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-end p-4 border-top bg-white position-fixed bottom-0 end-0 w-100 shadow-lg" style={{ zIndex: 10 }}>
        <BrandButton onClick={() => saveChanges(holidays)} icon="bi-save-fill">Lưu quy định nghỉ lễ {year}</BrandButton>
      </div>
    </div>
  );
}
