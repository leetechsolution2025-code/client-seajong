"use client";

import React from "react";
import { Candidate } from "../types";

interface Props {
  data: Record<string, Candidate[]>;
}

export function ListView({ data }: Props) {
  const allCandidates = Object.values(data).flat();

  return (
    <div className="bg-card border rounded-4 overflow-hidden shadow-sm h-100 d-flex flex-column">
      <div className="overflow-auto custom-scrollbar">
        <table className="table table-hover mb-0" style={{ fontSize: "14px" }}>
          <thead className="bg-light sticky-top" style={{ zIndex: 1 }}>
            <tr>
              <th className="px-4 py-3 border-0">Tên ứng viên</th>
              <th className="py-3 border-0">Vị trí</th>
              <th className="py-3 border-0">Nguồn</th>
              <th className="py-3 border-0">Trạng thái</th>
              <th className="py-3 border-0">Điểm phù hợp</th>
              <th className="py-3 border-0">Ngày ứng tuyển</th>
              <th className="px-4 py-3 border-0 text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {allCandidates.map((can) => (
              <tr key={can.id} className="align-middle">
                <td className="px-4 py-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle" style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                      {can.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{can.name}</div>
                      <div className="text-muted" style={{ fontSize: "12px" }}>{can.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">{can.position}</td>
                <td className="py-3">
                  <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: "11px" }}>{can.source}</span>
                </td>
                <td className="py-3">
                   <div className="d-flex align-items-center gap-2">
                     <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                     <span>Đang xử lý</span>
                   </div>
                </td>
                <td className="py-3">
                  <div className="d-flex align-items-center gap-2" style={{ width: "100px" }}>
                    <div className="flex-grow-1" style={{ height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${can.matchScore}%`, height: "100%", background: can.matchScore > 85 ? "#10b981" : "#3b82f6" }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "12px" }}>{can.matchScore}%</span>
                  </div>
                </td>
                <td className="py-3 text-muted">{can.dateAdded}</td>
                <td className="px-4 py-3 text-end">
                  <button className="btn btn-icon-only btn-light rounded-circle me-1"><i className="bi bi-eye" /></button>
                  <button className="btn btn-icon-only btn-light rounded-circle"><i className="bi bi-pencil" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
