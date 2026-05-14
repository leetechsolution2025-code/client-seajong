"use client";

import React, { useState } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";

// --- MOCK DATA ---
const REVENUE_SERIES = [
  {
    name: 'Doanh thu Đại lý',
    data: [4500000000, 5200000000, 4800000000, 6100000000, 5900000000, 7200000000, null, null, null, null, null, null],
    color: '#003087' // Trùng màu chủ đạo của app (từ plan/monthly)
  }
];

const DEALERS = [
  { id: 'DL-001', name: 'Hệ thống Điện máy Xanh', region: 'Toàn quốc', tier: 'Platinum', revenue: 15200000000, target: 15000000000, status: 'Active', phone: '1800.1061', email: 'cskh@dienmayxanh.com' },
  { id: 'DL-002', name: 'Đại lý An Phát', region: 'Miền Bắc', tier: 'Gold', revenue: 8500000000, target: 10000000000, status: 'Active', phone: '0901.234.567', email: 'contact@anphat.vn' },
  { id: 'DL-003', name: 'Thành Công Tech', region: 'Miền Nam', tier: 'Silver', revenue: 4200000000, target: 5000000000, status: 'Active', phone: '0912.345.678', email: 'sales@thanhcong.com' },
  { id: 'DL-004', name: 'Hoàng Hải Mobile', region: 'Miền Nam', tier: 'Gold', revenue: 9200000000, target: 8000000000, status: 'Active', phone: '0988.777.666', email: 'info@hoanghai.vn' },
  { id: 'DL-005', name: 'Đại lý Hùng Phong', region: 'Miền Trung', tier: 'Bronze', revenue: 1500000000, target: 2000000000, status: 'Warning', phone: '0933.222.111', email: 'hp@gmail.com' },
  { id: 'DL-006', name: 'Bình Minh Store', region: 'Miền Bắc', tier: 'Silver', revenue: 5100000000, target: 5000000000, status: 'Active', phone: '0977.888.999', email: 'bm@store.vn' },
];

const TICKETS = [
  { id: 'TK-1029', dealer: 'Đại lý An Phát', type: 'Yêu cầu POSM', title: 'Xin cấp phát 5 Standee', status: 'Pending', date: '15/04/2026' },
  { id: 'TK-1030', dealer: 'Hệ thống Điện máy Xanh', type: 'Hỗ trợ kỹ thuật', title: 'Lỗi đồng bộ sản phẩm', status: 'In Progress', date: '16/04/2026' },
  { id: 'TK-1031', dealer: 'Hoàng Hải Mobile', type: 'Tài nguyên', title: 'Yêu cầu thiết kế banner', status: 'Resolved', date: '12/04/2026' },
];

const RESOURCES = [
  { id: 1, title: 'Brand Guidelines 2026', type: 'PDF', size: '24 MB', icon: 'bi-file-earmark-pdf-fill', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 2, title: 'Bộ Banner Khuyến mãi Hè', type: 'ZIP', size: '156 MB', icon: 'bi-file-zip-fill', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  { id: 3, title: 'Catalogue Sản phẩm Q2', type: 'PDF', size: '45 MB', icon: 'bi-journal-text', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 4, title: 'Video TVC 30s', type: 'MP4', size: '320 MB', icon: 'bi-film', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
];

// --- HELPER COMPONENTS ---
const formatCurrency = (val: number) => {
  return val >= 1000000000 
    ? `${(val / 1000000000).toFixed(1)} Tỷ`
    : `${(val / 1000000).toFixed(0)} Triệu`;
};

const TierBadge = ({ tier }: { tier: string }) => {
  const styles: any = {
    Platinum: { bg: '#1e293b', color: '#f8fafc', border: '#475569' },
    Gold: { bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.2)' },
    Silver: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'rgba(100,116,139,0.2)' },
    Bronze: { bg: 'rgba(194,65,12,0.1)', color: '#c2410c', border: 'rgba(194,65,12,0.2)' }
  };
  const s = styles[tier] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderRadius: '6px',
      backgroundColor: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`
    }}>
      {tier}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: any = {
    'Active': { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'bi-check-circle-fill' },
    'Resolved': { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'bi-check-circle-fill' },
    'Warning': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'bi-exclamation-triangle-fill' },
    'Pending': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'bi-clock-fill' },
    'In Progress': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'bi-arrow-repeat' }
  };
  const c = cfg[status] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b', icon: 'bi-info-circle-fill' };
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px', fontSize: '12px', fontWeight: 600,
      borderRadius: '99px', backgroundColor: c.bg, color: c.color
    }}>
      <i className={`bi ${c.icon}`}></i> {status}
    </span>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, trend, progress }: {
  label: string; value: string; sub?: string; icon: string; color: string;
  trend?: { val: string; up: boolean }; progress?: { cur: number; max: number };
}) {
  const pct = progress ? Math.round((progress.cur / progress.max) * 100) : null;
  return (
    <div className="app-card" style={{ padding: "10px", borderRadius: 10, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color }} />
      <div style={{ paddingLeft: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>{label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1 }}>{value}</p>
              {trend && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: trend.up ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 2 }}>
                  <i className={`bi ${trend.up ? "bi-arrow-up" : "bi-arrow-down"}`} style={{ fontSize: 9 }} />
                  {trend.val}
                </span>
              )}
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: `color-mix(in srgb, ${color} 10%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 13, color }} />
          </div>
        </div>
        
        {sub && !progress && <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "var(--muted-foreground)" }}>{sub}</p>}
        {pct !== null && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{sub || "Mục tiêu"}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color }}>{pct}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function DealersPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const TABS = [
    { id: 'overview', label: 'Tổng quan', icon: 'bi-grid-fill' },
    { id: 'list', label: 'Danh sách Đại lý', icon: 'bi-people-fill' },
    { id: 'resources', label: 'Tài nguyên Hỗ trợ', icon: 'bi-box-seam-fill' },
    { id: 'helpdesk', label: 'Helpdesk Tickets', icon: 'bi-chat-left-text-fill' },
  ];

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Quản lý và hỗ trợ đại lý"
        description="Mạng lưới đối tác, theo dõi hiệu suất và trung tâm phân phối tài nguyên"
        color="indigo"
        icon="bi-building-fill"
      />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          {/* TAB NAVIGATION */}
          <div className="px-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom: isActive ? '3px solid #003087' : '3px solid transparent',
                      color: isActive ? '#003087' : 'var(--muted-foreground)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <i className={`bi ${tab.icon}`}></i> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'list' && <DealerListTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
            {activeTab === 'resources' && <ResourcesTab />}
            {activeTab === 'helpdesk' && <HelpdeskTab />}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dealer-table-row:hover { background-color: rgba(0,0,0,0.02); }
        .dealer-card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
      `}} />
    </div>
  );
}

// --- SUB TABS ---
function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <KpiCard
          label="Tổng số Đại lý" value="145" sub="+12 so với tháng trước"
          icon="bi-buildings-fill" color="#003087"
          trend={{ val: "+8%", up: true }}
        />
        <KpiCard
          label="Doanh thu qua Đại lý (T6)" value="7.2 Tỷ" sub="+15.2% so với tháng trước"
          icon="bi-graph-up-arrow" color="#10b981"
          trend={{ val: "+15.2%", up: true }}
        />
        <KpiCard
          label="Tỷ lệ đạt Target" value="78%" sub="Trung bình toàn hệ thống"
          icon="bi-bullseye" color="#f59e0b"
          progress={{ cur: 78, max: 100 }}
        />
        <KpiCard
          label="Tickets Yêu cầu mới" value="24" sub="18 đang xử lý"
          icon="bi-chat-left-dots-fill" color="#f43f5e"
        />
      </div>

      {/* Main Charts & Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Chart */}
        <div className="app-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <i className="bi bi-bar-chart-fill" style={{ color: '#003087' }}></i> Doanh thu Đại lý (2026)
            </h3>
            <select style={{ 
              padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', 
              background: 'transparent', color: 'var(--foreground)', fontWeight: 600, fontSize: '13px', outline: 'none'
            }}>
              <option>Năm 2026</option>
              <option>Năm 2025</option>
            </select>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <YearAreaChart series={REVENUE_SERIES} height="100%" />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="app-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <i className="bi bi-award-fill" style={{ color: '#f59e0b' }}></i> Bảng xếp hạng T6
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {DEALERS.sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((dealer, idx) => (
              <div key={dealer.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', fontWeight: 700, fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: idx === 0 ? 'rgba(245,158,11,0.2)' : idx === 1 ? 'rgba(100,116,139,0.2)' : idx === 2 ? 'rgba(194,65,12,0.2)' : 'rgba(0,0,0,0.05)',
                  color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#c2410c' : 'var(--muted-foreground)'
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dealer.name}</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>{dealer.region}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#003087' }}>{formatCurrency(dealer.revenue)}</div>
                </div>
              </div>
            ))}
          </div>

          <button style={{ 
            width: '100%', padding: '10px', marginTop: '20px', borderRadius: '10px', border: 'none',
            background: 'var(--muted)', color: 'var(--foreground)', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
          }}>
            Xem tất cả
          </button>
        </div>

      </div>
    </div>
  );
}

function DealerListTab({ searchQuery, setSearchQuery }: { searchQuery: string, setSearchQuery: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
      
      {/* Filters and Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}></i>
            <input 
              type="text" 
              placeholder="Tìm đại lý, mã, số điện thoại..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px 10px 42px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--foreground)', outline: 'none', fontSize: '14px'
              }}
            />
          </div>
          <button style={{ 
            padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', 
            color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600
          }}>
            <i className="bi bi-funnel"></i> Lọc
          </button>
        </div>
        <button style={{ 
          padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #003087, #001f5c)', 
          color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
          boxShadow: '0 4px 14px rgba(0,48,135,0.3)'
        }}>
          <i className="bi bi-plus-lg"></i> Thêm Đại lý mới
        </button>
      </div>

      {/* Table */}
      <div className="app-card" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, letterSpacing: '0.5px' }}>Thông tin Đại lý</th>
                <th style={{ padding: '16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, letterSpacing: '0.5px' }}>Cấp bậc</th>
                <th style={{ padding: '16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, letterSpacing: '0.5px' }}>Tiến độ Target</th>
                <th style={{ padding: '16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, letterSpacing: '0.5px' }}>Trạng thái</th>
                <th style={{ padding: '16px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {DEALERS.map((dealer, i) => {
                const percent = Math.min(100, Math.round((dealer.revenue / dealer.target) * 100));
                return (
                  <tr key={dealer.id} className="dealer-table-row" style={{ borderBottom: i === DEALERS.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #003087, #001f5c)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '16px'
                        }}>
                          {dealer.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--foreground)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {dealer.name}
                            <span style={{ fontSize: '10px', background: 'var(--muted)', padding: '2px 6px', borderRadius: '4px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{dealer.id}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', display: 'flex', gap: '16px' }}>
                            <span><i className="bi bi-geo-alt-fill"></i> {dealer.region}</span>
                            <span><i className="bi bi-telephone-fill"></i> {dealer.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}><TierBadge tier={dealer.tier} /></td>
                    <td style={{ padding: '16px', width: '250px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                        <span style={{ color: 'var(--foreground)' }}>{formatCurrency(dealer.revenue)}</span>
                        <span style={{ color: percent >= 100 ? '#10b981' : 'var(--muted-foreground)' }}>{percent}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', width: `${percent}%`, borderRadius: '99px',
                          background: percent >= 100 ? '#10b981' : percent >= 75 ? '#003087' : '#f59e0b',
                        }}></div>
                      </div>
                     </td>
                    <td style={{ padding: '16px' }}><StatusBadge status={dealer.status} /></td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button style={{ 
                        border: 'none', background: 'none', color: 'var(--muted-foreground)', 
                        cursor: 'pointer', fontSize: '16px', padding: '6px', borderRadius: '8px', transition: 'background 0.2s'
                      }}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResourcesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, minHeight: 0 }}>
      
      {/* Banner CTA */}
      <div style={{ 
        background: 'linear-gradient(135deg, #003087, #0056b3)', borderRadius: '24px', padding: '40px',
        color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,48,135,0.3)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 16px' }}>Cổng Tài nguyên & POSM</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 24px' }}>
            Mọi đại lý thuộc cấp Silver trở lên được hỗ trợ in ấn biển bảng và cấp phát standee, brochure theo quý. Đăng ký nhận hạng mục hỗ trợ cho quý này ngay trên hệ thống!
          </p>
          <button style={{ 
            padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'white', 
            color: '#003087', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
          }}>
            Đăng ký Hỗ trợ POSM <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', opacity: 0.2, fontSize: '160px' }}>
          <i className="bi bi-box-seam-fill"></i>
        </div>
        {/* Decorative Circle */}
        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
      </div>

      {/* Grid of Resources */}
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--foreground)', marginBottom: '20px' }}>Tài liệu Mới cập nhật</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {RESOURCES.map(res => (
            <div key={res.id} className="dealer-card-hover" style={{ 
              padding: '24px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                 <div style={{ 
                   width: '56px', height: '56px', borderRadius: '14px', background: res.bg, color: res.color,
                   display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                 }}>
                   <i className={res.icon}></i>
                 </div>
                 <span style={{ 
                   background: 'var(--muted)', color: 'var(--muted-foreground)', padding: '4px 8px', 
                   borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px'
                 }}>
                   {res.type}
                 </span>
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--foreground)' }}>{res.title}</h4>
              <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '24px' }}>{res.size} • Đăng ngày 10/04</div>
              
              <button style={{ 
                marginTop: 'auto', width: '100%', padding: '10px 0', border: 'none', borderRadius: '10px',
                background: 'rgba(0,48,135,0.06)', color: '#003087', fontWeight: 700, fontSize: '14px', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <i className="bi bi-cloud-download-fill"></i> Tải về ngay
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelpdeskTab() {
  return (
    <div className="app-card" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Danh sách Tickets Yêu cầu</h3>
        <button style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
          <i className="bi bi-funnel"></i> Bộ lọc
        </button>
      </div>
      
      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--muted)' }}>
            <tr>
              <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Mã TK</th>
              <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Đại lý</th>
              <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Loại Yêu cầu</th>
              <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Tiêu đề / Nội dung</th>
              <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Trạng thái</th>
              <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {TICKETS.map((tk, i) => (
               <tr key={tk.id} className="dealer-table-row" style={{ borderBottom: i === TICKETS.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}>
                 <td style={{ padding: '16px 24px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>{tk.id}</td>
                 <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>{tk.dealer}</td>
                 <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--muted-foreground)' }}>{tk.type}</td>
                 <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--foreground)' }}>{tk.title}</td>
                 <td style={{ padding: '16px 24px' }}><StatusBadge status={tk.status} /></td>
                 <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--muted-foreground)' }}>{tk.date}</td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
