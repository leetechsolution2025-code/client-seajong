"use client";
import React from "react";
import { motion } from "framer-motion";

const campaigns = [
  { name: "Doanh thu B2B", target: "1,590,000,000", actual: "969,408,000", rate: "60.97%", budget: "-", utilization: "-" },
  { name: "Doanh thu B2C", target: "1,220,000,000", actual: "1,039,714,000", rate: "85.22%", budget: "-", utilization: "-" },
  { name: "Doanh thu Ecom", target: "100,000,000", actual: "53,271,479", rate: "53.27%", budget: "1,200,000", utilization: "-" },
  { name: "Tìm kiếm đại lý", target: "-", actual: "-", rate: "-", budget: "26,455,019", utilization: "82.68%" },
  { name: "Branding - Educate khách hàng", target: "-", actual: "-", rate: "-", budget: "33,792,979", utilization: "82.42%" },
  { name: "Hỗ trợ đại lý", target: "-", actual: "-", rate: "-", budget: "19,104,242", utilization: "106.13%" },
];

export function CampaignTable() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="px-4 pb-5"
    >
      <div className="app-card border-0 shadow-lg" style={{ background: "var(--card)", borderRadius: 16 }}>
        <div className="p-4 d-flex justify-content-between align-items-center">
          <h6 className="fw-black mb-0 text-uppercase text-foreground" style={{ fontSize: 15, letterSpacing: "0.02em" }}>Chi tiết hiệu suất chiến dịch</h6>
          <button className="btn btn-sm btn-primary px-3 fw-bold" style={{ borderRadius: 8, fontSize: 12 }}>
            <i className="bi bi-file-earmark-excel me-1" /> Xuất Excel
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 text-foreground" style={{ fontSize: 13, fontFamily: "var(--font-roboto-condensed)" }}>
            <thead>
              <tr style={{ background: "rgba(128, 128, 128, 0.08)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <th className="ps-4 py-3 border-0 text-uppercase text-foreground" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>Tên chiến dịch</th>
                <th className="text-end py-3 border-0 text-uppercase text-foreground" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>Doanh số kỳ vọng</th>
                <th className="text-end py-3 border-0 text-uppercase text-foreground" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>Doanh số thực tế</th>
                <th className="text-center py-3 border-0 text-uppercase text-foreground" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>Tỷ lệ đạt mục tiêu</th>
                <th className="text-end py-3 border-0 text-uppercase text-foreground" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>Ngân sách thực tế</th>
                <th className="text-center pe-4 py-3 border-0 text-uppercase text-foreground" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>Tỷ lệ chi tiêu</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const rateNum = parseFloat(c.rate);
                const color = isNaN(rateNum) ? "var(--muted-foreground)" : rateNum > 80 ? "#10b981" : rateNum > 50 ? "#f59e0b" : "#f43f5e";
                
                return (
                  <tr key={i} className="border-border">
                    <td className="ps-4 py-3 fw-bold text-foreground">{c.name}</td>
                    <td className="text-end py-3 text-foreground">{c.target}</td>
                    <td className="text-end py-3 text-foreground">{c.actual}</td>
                    <td className="text-center py-3">
                      <span className="badge rounded-pill" style={{ background: `${color}15`, color: color, border: `1px solid ${color}30`, padding: "4px 10px", fontSize: 10, fontWeight: 800 }}>
                        {c.rate}
                      </span>
                    </td>
                    <td className="text-end py-3 text-foreground">{c.budget}</td>
                    <td className="text-center pe-4 py-3 fw-bold text-foreground">{c.utilization}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="fw-black text-foreground" style={{ background: "rgba(128, 128, 128, 0.12)" }}>
              <tr>
                <td className="ps-4 py-3 text-foreground">TỔNG CỘNG (GRAND TOTAL)</td>
                <td className="text-end py-3 text-foreground">2,910,000,000</td>
                <td className="text-end py-3 text-foreground">2,062,393,479</td>
                <td className="text-center py-3">
                  <span className="badge bg-primary text-white rounded-pill px-3 py-1" style={{ fontSize: 11 }}>70.87%</span>
                </td>
                <td className="text-end py-3 text-foreground">112,348,659</td>
                <td className="text-center pe-4 py-3 fw-black text-foreground">81.41%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
