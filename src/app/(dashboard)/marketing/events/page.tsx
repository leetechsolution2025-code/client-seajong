"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CreateEventModal } from "@/components/marketing/CreateEventModal";

// --- MOCK DATA ---
const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: 'bi-grid-fill' },
  { id: 'list', label: 'Lịch sự kiện', icon: 'bi-calendar-event-fill' },
  { id: 'attendees', label: 'Khách mời', icon: 'bi-people-fill' },
  { id: 'logistics', label: 'Kế hoạch thực hiện', icon: 'bi-box-seam-fill' },
];

// --- UTILS ---
const formatCurrency = (val: number) => {
  if (val >= 1000000000) return (val / 1000000000).toFixed(1) + "B";
  if (val >= 1000000) return (val / 1000000).toFixed(0) + "M";
  return val.toLocaleString() + "đ";
};

interface Attendee {
  id: string;
  name: string;
  phone: string;
  event: string;
  type: string;
  status: string;
  checkin: boolean;
}

const ATTENDEES: Attendee[] = [
  { id: "AT-100", name: "Nguyễn Văn Hùng", phone: "0901234567", event: "Hội thảo: Xu hướng...", type: "Khách mời VIP", status: "Confirmed", checkin: true },
  { id: "AT-101", name: "Trần Thị Mai", phone: "0912345678", event: "Triển lãm Vietbuild", type: "Khách tham quan", status: "Registered", checkin: false },
  { id: "AT-102", name: "Lê Minh Tuấn", phone: "0987654321", event: "Hội thảo: Xu hướng...", type: "Đại lý", status: "Confirmed", checkin: true },
];

interface LogisticItem {
  id: string;
  item: string;
  qty: number;
  event: string;
  status: string;
  provider: string;
}

const LOGISTICS: LogisticItem[] = [
  { id: "L-01", item: "Standee chữ X", qty: 50, event: "Vietbuild 2026", status: "Ready", provider: "In ấn Đại Nam" },
  { id: "L-02", item: "Brochure sản phẩm", qty: 2000, event: "Vietbuild 2026", status: "Printing", provider: "In ấn Đại Nam" },
  { id: "L-03", item: "Màn hình LED", qty: 2, event: "Hội thảo: Xu hướng...", status: "Booked", provider: "EventTech" },
  { id: "L-04", item: "Quà tặng check-in", qty: 300, event: "Activation Mùa hè", status: "Pending", provider: "Gifthaus" },
];

const formatDateRange = (start: string, end: string) => {
  if (!start) return "---";
  const dStart = new Date(start);
  const dEnd = new Date(end);
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (start === end) return `${pad(dStart.getDate())}/${pad(dStart.getMonth() + 1)}/${dStart.getFullYear()}`;
  return `${pad(dStart.getDate())}-${pad(dEnd.getDate())}/${pad(dEnd.getMonth() + 1)}/${dEnd.getFullYear()}`;
};

// --- COMPONENTS ---
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

function StatusBadge({ status }: { status: string }) {
  let mapped = { color: '#64748b', bg: 'rgba(100,116,139,0.1)', text: status };
  
  if (status === 'Planning' || status === 'Registered' || status === 'Pending') {
    mapped = { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: status };
  } else if (status === 'Opening Soon' || status === 'Printing') {
    mapped = { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: status };
  } else if (status === 'Ongoing' || status === 'Confirmed' || status === 'Ready' || status === 'Booked') {
    mapped = { color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: status };
  } else if (status === 'Canceled') {
    mapped = { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', text: status };
  }

  return (
    <span style={{ 
      background: mapped.bg, color: mapped.color, padding: '4px 10px', 
      borderRadius: '6px', fontSize: '11px', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: '4px'
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: mapped.color }}></div>
      {mapped.text}
    </span>
  );
}

// --- MAIN PAGE ---
export default function EventsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Real-time Stats Calculation ---
  const { eventsSeries, totalBudget, onlineCount, offlineCount } = React.useMemo(() => {
    const offlineData = new Array(12).fill(0);
    const onlineData = new Array(12).fill(0);
    let totalB = 0;
    let onC = 0;
    let offC = 0;

    events.forEach(ev => {
      const date = new Date(ev.startDate);
      if (date.getFullYear() === 2026) {
        const month = date.getMonth();
        const isOnline = ev.isOnline === true;
        
        if (isOnline) {
          onlineData[month]++;
          onC++;
        } else {
          offlineData[month]++;
          offC++;
        }
      }
      totalB += (ev.budget || 0);
    });

    return {
      eventsSeries: [
        { name: "Sự kiện Offline", data: offlineData, color: "#ec4899" },
        { name: "Sự kiện Online", data: onlineData, color: "#3b82f6" },
      ],
      totalBudget: totalB,
      onlineCount: onC,
      offlineCount: offC
    };
  }, [events]);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/marketing/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events based on search
  const filteredEvents = events.filter(ev => 
    ev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ev.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
      <PageHeader
        title="Quản lý sự kiện và hội thảo"
        description="Theo dõi lịch trình trực tiếp, khách đăng ký, chi phí sự kiện"
        color="rose"
        icon="bi-mic-fill"
      />

      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px', border: 'none', background: 'transparent',
                  borderBottom: isActive ? '3px solid #ec4899' : '3px solid transparent',
                  color: isActive ? '#ec4899' : 'var(--muted-foreground)',
                  fontWeight: isActive ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', outline: 'none'
                }}
              >
                <i className={`bi ${tab.icon}`}></i> {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT */}
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 'overview' && (
            <OverviewTab 
              events={events} 
              loading={loading} 
              series={eventsSeries}
              totalBudget={totalBudget}
            />
          )}
          {activeTab === 'list' && (
            <EventListTab 
              events={filteredEvents}
              loading={loading}
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              onCreateEvent={() => {
                setSelectedEventId(null);
                setIsModalOpen(true);
              }}
              onEditEvent={(id) => {
                setSelectedEventId(id);
                setIsModalOpen(true);
              }}
            />
          )}
          {activeTab === 'attendees' && <AttendeesTab />}
          {activeTab === 'logistics' && <LogisticsTab />}
        </div>
      </div>

      <CreateEventModal 
        isOpen={isModalOpen} 
        eventId={selectedEventId}
        onRefresh={fetchEvents}
        onClose={(refresh) => {
          setIsModalOpen(false);
          setSelectedEventId(null);
          if (refresh === true) fetchEvents();
        }} 
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .event-row:hover { background-color: rgba(0,0,0,0.02); }
      `}} />
    </div>
  );
}

// --- SUB TABS ---
function OverviewTab({ events, loading, series, totalBudget }: { events: any[], loading: boolean, series: any[], totalBudget: number }) {
  const upcoming = [...events]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <KpiCard
          label="Tổng sự kiện 2026" value={events.length.toString()} sub="Dữ liệu từ hệ thống"
          icon="bi-calendar-event" color="#ec4899"
          trend={{ val: "Cập nhật", up: true }}
        />
        <KpiCard
          label="Khách Đăng ký" value="---" sub="Đang thống kê..."
          icon="bi-people" color="#3b82f6"
        />
        <KpiCard
          label="Ngân sách Giải ngân" value={formatCurrency(totalBudget)} sub="Tổng ngân sách thực tế"
          icon="bi-wallet2" color="#f59e0b"
          progress={{ cur: totalBudget, max: totalBudget * 1.2 || 1000000000 }}
        />
        <KpiCard
          label="CVR Từ Offline -> Lead" value="---" sub="Đang kết nối..."
          icon="bi-graph-up-arrow" color="#10b981"
        />
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Timeline / Chart */}
        <div className="app-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
          <SectionTitle title={`Tần suất sự kiện và hội thảo - ${new Date().getFullYear()}`} />
          <div style={{ flex: 1, minHeight: 0, marginTop: '-10px' }}>
            <YearAreaChart series={series} height="100%" hideYAxis={true} unit="" />
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="app-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
          <SectionTitle 
            title="Sự kiện sắp tới" 
            action={<button style={{ background: 'transparent', border: 'none', color: '#ec4899', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Xem lịch</button>} 
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {loading && <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Đang tải...</p>}
            {!loading && upcoming.length === 0 && <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Chưa có sự kiện nào.</p>}
            {upcoming.map((ev, idx) => (
              <div key={ev.id} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: idx === upcoming.length - 1 ? 0 : '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                   <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ec4899', zIndex: 1, border: '3px solid var(--card)' }}></div>
                   {idx !== upcoming.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border)', marginTop: '-2px', marginBottom: '-2px' }}></div>}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>{ev.name}</h4>
                    <StatusBadge status={ev.status} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                    <span><i className="bi bi-calendar-event"></i> {formatDateRange(ev.startDate, ev.endDate)}</span>
                  </div>
                  <div style={{ display: 'inline-block', gap: '16px', fontSize: '12px', color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '6px 12px', borderRadius: '8px' }}>
                    <i className="bi bi-geo-alt-fill"></i> {ev.location || "Đang cập nhật..."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function EventListTab({ events, loading, searchQuery, setSearchQuery, onCreateEvent, onEditEvent }: { 
  events: any[],
  loading: boolean,
  searchQuery: string, 
  setSearchQuery: (v: string) => void,
  onCreateEvent: () => void,
  onEditEvent: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}></i>
            <input 
              type="text" placeholder="Tìm tên sự kiện, ID..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 42px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', outline: 'none', fontSize: '14px' }}
            />
          </div>
          <button style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <i className="bi bi-funnel"></i> Lọc
          </button>
        </div>
        <button 
          onClick={onCreateEvent}
          style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ec4899, #be185d)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 14px rgba(236,72,153,0.3)' }}
        >
          <i className="bi bi-plus-lg"></i> Tạo Sự kiện
        </button>
      </div>

      {/* Table */}
      <div className="app-card" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Mã</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Sự kiện</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Loại hình</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Thời gian & Địa điểm</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Ngân sách</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    Đang tải danh sách sự kiện...
                  </td>
                </tr>
              )}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    Không tìm thấy sự kiện nào.
                  </td>
                </tr>
              )}
              {events.map((ev, i) => (
                <tr 
                  key={ev.id} 
                  className="event-row" 
                  onClick={() => onEditEvent(ev.id)}
                  style={{ borderBottom: i === events.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '16px 24px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>{ev.code}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>{ev.name}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '11px', background: 'var(--muted)', color: 'var(--muted-foreground)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>{ev.type}</span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>{formatDateRange(ev.startDate, ev.endDate)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{ev.location || "---"}</div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: '#ec4899' }}>{formatCurrency(ev.budget || 0)}</td>
                  <td style={{ padding: '16px 24px' }}><StatusBadge status={ev.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendeesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
      {/* Table */}
      <div className="app-card" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <SectionTitle 
            title="Danh sách Khách đăng ký (RSVP)" 
            className="mb-0"
            action={
              <button style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--foreground)' }}>
                <i className="bi bi-file-earmark-excel"></i> Export CSV
              </button>
            }
          />
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Khách mời</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Sự kiện tham gia</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Phân loại</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Trạng thái</th>
                <th style={{ padding: '14px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 700 }}>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {ATTENDEES.map((att: Attendee) => (
                 <tr key={att.id} className="event-row" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                   <td style={{ padding: '16px 24px' }}>
                     <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--foreground)' }}>{att.name}</div>
                     <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{att.phone}</div>
                   </td>
                   <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--foreground)' }}>{att.event}</td>
                   <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--muted-foreground)' }}>{att.type}</td>
                   <td style={{ padding: '16px 24px' }}><StatusBadge status={att.status} /></td>
                   <td style={{ padding: '16px 24px' }}>
                     {att.checkin ? 
                       <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}><i className="bi bi-check-circle-fill"></i> Đã đến</span> :
                       <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Chưa</span>
                     }
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LogisticsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
      <div className="app-card" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <SectionTitle 
            title="Kế hoạch thực hiện" 
            className="mb-0"
            action={
              <button style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ec4899', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                 <i className="bi bi-plus-lg"></i> Thêm Hạng mục
              </button>
            }
          />
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {LOGISTICS.map((item: LogisticItem) => (
              <div key={item.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{item.id}</span>
                  <StatusBadge status={item.status} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>{item.item}</h4>
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>Sự kiện: {item.event}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>SL: {item.qty}</span>
                  <span style={{ fontSize: '12px', color: '#003087', fontWeight: 600, background: 'rgba(0,48,135,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{item.provider}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
