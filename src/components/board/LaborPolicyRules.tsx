"use client";

import React, { useState, useEffect } from "react";
import { BrandButton } from "@/components/ui/BrandButton";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LaborRulesData {
  summer: { inMorning: string; outLunch: string; inAfternoon: string; outAfternoon: string; hours: number; days: number };
  winter: { enabled: boolean; inMorning: string; outLunch: string; inAfternoon: string; outAfternoon: string; hours?: number; days?: number };
  lunch: { enabled: boolean; threshold: number };
  late: { allowance: number; t75: number; t50: number };
  ot: { weekday: number; sat: number; sun: number; hol: number; min: number };
}

const DEFAULT_DATA: LaborRulesData = {
  summer: { inMorning: "08:00", outLunch: "12:00", inAfternoon: "13:30", outAfternoon: "17:30", hours: 8, days: 22 },
  winter: { enabled: false, inMorning: "08:30", outLunch: "12:00", inAfternoon: "13:00", outAfternoon: "17:00" },
  lunch: { enabled: false, threshold: 30 },
  late: { allowance: 30, t75: 30, t50: 60 },
  ot: { weekday: 1.5, sat: 2, sun: 2, hol: 3, min: 30 }
};

// ── Shared UI Components ──────────────────────────────────────────────────────
const Section = ({ icon, title, subtitle, color = "primary", children }: any) => (
  <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white">
    <div className="d-flex align-items-center gap-2 mb-3">
      <i className={`bi ${icon} text-${color} fs-5`}></i>
      <h6 className="mb-0 fw-bold">{title} {subtitle && <span className="text-muted fw-normal small">({subtitle})</span>}</h6>
    </div>
    {children}
  </div>
);

const InputGroup = ({ label, value, onChange, type = "text", icon, sub }: any) => (
  <div className="flex-fill">
    {label && <label className="form-label fw-bold small text-uppercase text-muted mb-1" style={{ fontSize: '10px' }}>{label}</label>}
    <div className="input-group bg-light rounded-3 overflow-hidden border">
      <input type={type} className="form-control border-0 bg-transparent py-1 px-3" value={value || ""} onChange={e => onChange(e.target.value)} style={{ fontSize: '14px' }} />
      {icon && <span className="input-group-text border-0 bg-transparent text-muted py-1 px-2"><i className={`bi ${icon}`} style={{ fontSize: '12px' }}></i></span>}
    </div>
    {sub && <p className="mt-1 mb-0 small" style={{ fontSize: '10px', color: sub.color || 'inherit' }}>{sub.text}</p>}
  </div>
);

const Toggle = ({ checked, onChange, label, description, icon }: any) => (
  <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-4 border">
    <div className="d-flex align-items-center gap-3">
      {icon && <div className="rounded-circle bg-white shadow-sm d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}><i className={`bi ${icon} text-primary`}></i></div>}
      <div>
        <h6 className="mb-1 fw-bold small">{label}</h6>
        <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>{description}</p>
      </div>
    </div>
    <div className="form-check form-switch fs-4">
      <input className="form-check-input" type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} style={{ cursor: 'pointer' }} />
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
export function LaborPolicyRules({ policy, onSave }: { policy: any; onSave: (c: string) => void }) {
  // Initialize with DEFAULT_DATA directly to avoid undefined state on first render
  const [data, setData] = useState<LaborRulesData>(DEFAULT_DATA);

  useEffect(() => {
    if (policy?.content) {
      try { 
        const parsed = JSON.parse(policy.content);
        // Deep merge with DEFAULT_DATA to ensure all nested properties exist
        setData({
          summer: { ...DEFAULT_DATA.summer, ...parsed.summer },
          winter: { ...DEFAULT_DATA.winter, ...parsed.winter },
          lunch: { ...DEFAULT_DATA.lunch, ...parsed.lunch },
          late: { ...DEFAULT_DATA.late, ...parsed.late },
          ot: { ...DEFAULT_DATA.ot, ...parsed.ot },
        });
      } catch (e) { 
        setData(DEFAULT_DATA); 
      }
    } else {
      setData(DEFAULT_DATA);
    }
  }, [policy]);

  const set = (sec: keyof LaborRulesData, key: string, val: any) => {
    setData((p: any) => ({ 
      ...p, 
      [sec]: { ...p[sec], [key]: val } 
    }));
  };

  // Safe access with fallback values
  const summer = data.summer || DEFAULT_DATA.summer;
  const winter = data.winter || DEFAULT_DATA.winter;
  const lunch = data.lunch || DEFAULT_DATA.lunch;
  const late = data.late || DEFAULT_DATA.late;
  const ot = data.ot || DEFAULT_DATA.ot;

  return (
    <div className="pb-5">
      <Section icon="bi-clock" title="Thời gian làm việc">
        <div className="mb-2">
          <Toggle 
            label="Kích hoạt chế độ làm việc theo mùa" 
            description="Khi bật: hệ thống tự động chuyển đổi giữa giờ mùa hè/mùa đông. Khi tắt: mặc định dùng giờ mùa hè." 
            checked={data.winter?.enabled} 
            onChange={(v:any) => set("winter", "enabled", v)} 
          />
        </div>

        {/* Header Labels */}
        <div className="d-flex gap-2 mb-1 px-2" style={{ paddingLeft: '110px' }}>
          {["Vào sáng", "Ra trưa", "Vào chiều", "Ra chiều", "Giờ/Ngày", "Công/Tháng"].map(h => (
            <div key={h} className="flex-fill text-muted fw-bold small text-uppercase" style={{ fontSize: '10px' }}>{h}</div>
          ))}
        </div>

        {/* Summer Row */}
        <div className="d-flex align-items-center gap-2 mb-1">
          <div className="fw-bold text-primary small" style={{ width: '100px', flexShrink: 0 }}>Mùa hè <span className="fw-normal text-muted d-block" style={{fontSize: '9px'}}>(Mặc định)</span></div>
          <div className="d-flex gap-2 flex-grow-1">
            <InputGroup label="" value={data.summer?.inMorning} onChange={(v:any) => set("summer", "inMorning", v)} icon="bi-clock" />
            <InputGroup label="" value={data.summer?.outLunch} onChange={(v:any) => set("summer", "outLunch", v)} icon="bi-clock" />
            <InputGroup label="" value={data.summer?.inAfternoon} onChange={(v:any) => set("summer", "inAfternoon", v)} icon="bi-clock" />
            <InputGroup label="" value={data.summer?.outAfternoon} onChange={(v:any) => set("summer", "outAfternoon", v)} icon="bi-clock" />
            <InputGroup label="" value={data.summer?.hours} onChange={(v:any) => set("summer", "hours", v)} type="number" />
            <InputGroup label="" value={data.summer?.days} onChange={(v:any) => set("summer", "days", v)} type="number" />
          </div>
        </div>

        {/* Winter Row */}
        <AnimatePresence>
          {data.winter?.enabled && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="d-flex align-items-center gap-2 mb-1">
              <div className="fw-bold text-info small" style={{ width: '100px', flexShrink: 0 }}>Mùa đông</div>
              <div className="d-flex gap-2 flex-grow-1">
                <InputGroup label="" value={data.winter?.inMorning} onChange={(v:any) => set("winter", "inMorning", v)} icon="bi-clock" />
                <InputGroup label="" value={data.winter?.outLunch} onChange={(v:any) => set("winter", "outLunch", v)} icon="bi-clock" />
                <InputGroup label="" value={data.winter?.inAfternoon} onChange={(v:any) => set("winter", "inAfternoon", v)} icon="bi-clock" />
                <InputGroup label="" value={data.winter?.outAfternoon} onChange={(v:any) => set("winter", "outAfternoon", v)} icon="bi-clock" />
                <InputGroup label="" value={data.winter?.hours || 8} onChange={(v:any) => set("winter", "hours", v)} type="number" />
                <InputGroup label="" value={data.winter?.days || 22} onChange={(v:any) => set("winter", "days", v)} type="number" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-2 px-3 rounded-3 bg-light border d-inline-flex align-items-center gap-2 mt-2">
           <i className="bi bi-info-circle text-primary"></i>
           <span className="text-muted" style={{ fontSize: '11px' }}>
             Đang áp dụng: <b>Mùa hè</b> ({data.summer?.inMorning} - {data.summer?.outAfternoon})
           </span>
        </div>
      </Section>

      <Section icon="bi-cup-hot" title="Quy chế ra trưa" color="warning">
        <Toggle 
          icon="bi-cup-hot"
          label="Kiểm tra giờ ra trưa" 
          description={`Nếu bật: nhân viên ra trưa sớm hơn giờ chuẩn (${summer.outLunch}) quá 30 phút sẽ tính vi phạm`} 
          checked={lunch.enabled} 
          onChange={(v:any) => set("lunch", "enabled", v)} 
        />
      </Section>

      <Section icon="bi-exclamation-triangle" title="Quy chế xử lý đi muộn, về sớm" color="danger">
        <div className="p-3 bg-light rounded-4 mb-3 border" style={{ borderStyle: 'dashed' }}>
           <p className="mb-1 small text-muted"><b>Có phép</b> (xin phép + được đồng ý): tính công 100% bình thường</p>
           <p className="mb-0 small text-muted"><b>Không phép:</b> áp dụng quy tắc bên dưới</p>
        </div>
        <div className="d-flex gap-3 mb-3">
          <InputGroup label="≤ PHÚT (BỎ QUA)" value={late.allowance} onChange={(v:any) => set("late", "allowance", v)} type="number" />
          <InputGroup label="NGƯỠNG 75% (PHÚT)" value={late.t75} onChange={(v:any) => set("late", "t75", v)} type="number" />
          <InputGroup label="NGƯỠNG 50% (PHÚT)" value={late.t50} onChange={(v:any) => set("late", "t50", v)} type="number" />
        </div>
        <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>
          Vi phạm ≤ {late.allowance} phút: <b>100%</b> · Vi phạm {late.allowance}-{late.t50} phút: <b className="text-warning">75%</b> · Vi phạm {">"} {late.t50} phút: <b className="text-danger">50%</b>
        </p>
      </Section>

      <Section icon="bi-lightning-charge" title="Hệ số lương làm thêm giờ (OT)" color="warning">
        <div className="d-flex gap-2 mb-3">
          <InputGroup label="Ngày thường (T2-T6)" value={ot.weekday} onChange={(v:any) => set("ot", "weekday", v)} type="number" sub={{ text: '150% lương giờ thường', color: '#10b981' }} />
          <InputGroup label="Thứ 7" value={ot.sat} onChange={(v:any) => set("ot", "sat", v)} type="number" sub={{ text: '200%' }} />
          <InputGroup label="Chủ nhật" value={ot.sun} onChange={(v:any) => set("ot", "sun", v)} type="number" sub={{ text: '200%' }} />
          <InputGroup label="Ngày lễ / Tết" value={ot.hol} onChange={(v:any) => set("ot", "hol", v)} type="number" sub={{ text: '300%', color: '#ef4444' }} />
          <InputGroup label="OT tối thiểu (Phút)" value={ot.min} onChange={(v:any) => set("ot", "min", v)} type="number" />
        </div>
      </Section>

      <div className="d-flex justify-content-end p-4 border-top bg-white position-fixed bottom-0 end-0 w-100 shadow-lg" style={{ zIndex: 10 }}>
        <BrandButton onClick={() => onSave(JSON.stringify(data))} icon="bi-save-fill">Lưu quy chế</BrandButton>
      </div>
    </div>
  );
}
