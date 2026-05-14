"use client";

import React from "react";

export function CalendarView() {
  const days = Array.from({ length: 35 }, (_, i) => i - 3); // Mock calendar grid
  const today = 15;

  return (
    <div className="bg-card border rounded-4 overflow-hidden shadow-sm h-100 d-flex flex-column">
      {/* Calendar Header */}
      <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
        <h5 className="mb-0" style={{ fontWeight: 800 }}>Tháng 04, 2026</h5>
        <div className="btn-group border rounded-pill p-1">
          <button className="btn btn-sm px-3 rounded-pill">Tuần</button>
          <button className="btn btn-sm px-3 rounded-pill bg-primary text-white shadow-sm">Tháng</button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-grow-1 overflow-auto custom-scrollbar">
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', height: '100%' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="text-center py-2 bg-light border-bottom border-end text-muted" style={{ fontSize: "11px", fontWeight: 800 }}>{d}</div>
          ))}
          {days.map((d, i) => (
            <div key={i} className="border-bottom border-end p-2 position-relative" style={{ minHeight: '120px', background: d === today ? 'rgba(59,130,246,0.02)' : 'transparent' }}>
              <span style={{ fontSize: "12px", fontWeight: d === today ? 800 : 500, color: d === today ? '#3b82f6' : 'inherit', opacity: d <= 0 ? 0.3 : 1 }}>
                {d <= 0 ? 30 + d : d > 30 ? d - 30 : d}
              </span>
              
              {/* Mock Events */}
              {d === 12 && (
                <div className="mt-1 p-1 rounded-2" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: '10px', fontWeight: 700, borderLeft: '3px solid #8b5cf6' }}>
                  PV: Nguyễn Văn A (IT)
                </div>
              )}
              {d === 15 && (
                <>
                  <div className="mt-1 p-1 rounded-2" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '10px', fontWeight: 700, borderLeft: '3px solid #10b981' }}>
                    Phê duyệt Offer: Trần B
                  </div>
                  <div className="mt-1 p-1 rounded-2" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '10px', fontWeight: 700, borderLeft: '3px solid #3b82f6' }}>
                    Họp HR Weekly
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
