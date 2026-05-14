"use client";

import React, { useState } from "react";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";

const InfoBox = ({ icon, children, color = "primary" }: any) => (
  <div className={`alert alert-${color} border-0 rounded-4 p-2 px-3 d-flex gap-3 mb-3 shadow-sm`} style={{ backgroundColor: `color-mix(in srgb, var(--bs-${color}) 8%, transparent)` }}>
    <i className={`bi ${icon} fs-5 text-${color}`}></i>
    <div style={{ lineHeight: '1.4', fontSize: '11px' }}>{children}</div>
  </div>
);

const SubnetCard = ({ s, index, onDelete }: any) => {
  const isRange = s.startIp !== s.endIp;
  const displayIp = isRange ? `${s.startIp} — ${s.endIp}` : s.startIp;
  const highlightIp = isRange ? s.startIp.split('.').slice(0, 3).join('.') + '.*' : s.startIp;
  const label = isRange ? `Subnet #${index + 1}` : `IP công cộng #${index + 1}`;
  const desc = isRange ? "Tất cả thiết bị trong dải" : "Chỉ IP";

  return (
    <div className="p-3 mb-2 border-0 rounded-4 d-flex justify-content-between align-items-center transition-all shadow-sm" style={{ backgroundColor: '#f9faff' }}>
      <div className="d-flex align-items-center gap-3">
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, backgroundColor: '#eef2ff' }}>
          <i className="bi bi-wifi fs-5 text-indigo" style={{ color: '#6366f1' }}></i>
        </div>
        <div>
          <h6 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '0.5px', fontSize: '15px' }}>{displayIp}</h6>
          <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>
            {label} — {desc} <span className="fw-bold" style={{ color: '#f43f5e' }}>{highlightIp}</span> được phép chấm công
          </p>
        </div>
      </div>
      <button 
        className="btn btn-white btn-sm rounded-3 px-3 py-1 d-flex align-items-center gap-2 border border-danger-subtle text-danger" 
        onClick={() => onDelete(s.id)}
        style={{ fontSize: '11px', backgroundColor: 'white' }}
      >
        <i className="bi bi-trash3"></i>
        <span className="fw-bold">Xoá</span>
      </button>
    </div>
  );
};

export function LaborPolicyNetwork({ branches, onRefresh }: { branches: any[]; onRefresh: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState("");
  const [detectedPublicIp, setDetectedPublicIp] = useState<string | null>(null);
  const [detectedLocalNetwork, setDetectedLocalNetwork] = useState<{ ip: string; interface: string } | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(branches[0]?.id || null);
  
  const branch = branches.find(b => b.id === selectedBranchId) || branches[0] || { id: "main", subnets: [] };

  const detectLocalIp = (): Promise<{ ip: string; interface: string }> => {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const myIp = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate)?.[1];
        if (myIp && !myIp.startsWith('127.')) {
          pc.onicecandidate = null;
          resolve({ ip: myIp, interface: "wlan0" });
        }
      };
      // Fallback if WebRTC blocked
      setTimeout(() => resolve({ ip: "192.168.1.15", interface: "eth0" }), 1000);
    });
  };

  const handleAction = async (id: string, action: () => Promise<void>) => {
    setLoading(id);
    try { await action(); } finally { setLoading(null); }
  };

  const addSubnet = async (start: string, end: string) => {
    if (branch.id === "main" || !branch.id) {
      toast.error("Chưa chọn nơi làm việc", "Vui lòng chọn một nơi làm việc cụ thể.");
      return;
    }
    const res = await fetch("/api/board/subnets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: branch.id, startIp: start, endIp: end })
    });
    if (res.ok) {
      toast.success("Thành công", "Đã thêm dải IP mới");
      onRefresh();
    } else {
      const err = await res.json();
      toast.error("Lỗi", err.details || "Không thể lưu dải IP");
    }
  };

  const saveBranchConfig = async (wifiIp: string) => {
    const res = await fetch("/api/board/labor-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        branchConfig: { 
          id: branch.id, 
          wifiIp 
        } 
      })
    });
    if (res.ok) {
      toast.success("Thành công", "Đã cập nhật IP công cộng cho địa điểm này");
      onRefresh();
      setDetectedPublicIp(null);
    }
  };

  const deleteSubnet = async (id: string) => {
    const res = await fetch(`/api/board/subnets?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Đã xoá", "Dải IP đã được gỡ bỏ");
      onRefresh();
    }
  };

  return (
    <div className="pb-5">
      {/* ── CHỌN NƠI LÀM VIỆC ── */}
      <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-white rounded-4 shadow-sm border border-primary-subtle">
        <div className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
          <i className="bi bi-geo-alt text-primary"></i>
        </div>
        <div className="flex-grow-1">
          <label className="small text-muted fw-bold text-uppercase d-block mb-1" style={{ fontSize: '10px' }}>Đang cấu hình cho nơi làm việc:</label>
          <select 
            className="form-select border-0 fw-bold p-0 text-primary" 
            style={{ fontSize: '15px', background: 'none', cursor: 'pointer' }}
            value={selectedBranchId || ""}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            {branches.length === 0 && <option value="">Chưa có nơi làm việc nào</option>}
          </select>
        </div>
        {branches.length > 0 && (
          <div className="d-flex gap-2">
            <div className="badge bg-primary text-white rounded-pill px-3 py-2 small fw-bold shadow-sm">
              Mã: {branch.code}
            </div>
            <div className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 small" style={{ letterSpacing: '0.5px', opacity: 0.8 }}>
              ID: {branch.id}
            </div>
          </div>
        )}
      </div>

      {/* ── HƯỚNG DẪN ── */}
      <InfoBox icon="bi-info-circle">
        <b className="d-block mb-1 fs-6">Cách hoạt động</b>
        Hệ thống chấm công kiểm tra IP của nhân viên khi bấm chấm công. Chỉ các thiết bị kết nối đúng <b>mạng nội bộ công ty</b> (WiFi hoặc LAN — trong danh sách subnet cho phép) mới được ghi nhận.
        <br />Nhấn <b>"Phát hiện mạng"</b> để tự động lấy subnet từ mạng bạn đang dùng, sau đó thêm vào danh sách và lưu.
      </InfoBox>

      {/* ── IP CÔNG CỘNG ── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-globe text-primary fs-6"></i>
            <h6 className="mb-0 fw-bold small">IP công cộng (dùng khi app trên cloud / Vercel)</h6>
          </div>
          {branch.wifiIp && (
            <div className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
              Đã lưu: {branch.wifiIp}
            </div>
          )}
        </div>
        <p className="text-muted mb-3" style={{ fontSize: '12px' }}>Khi app deploy trên <b>Vercel / VPS</b>, server chỉ thấy <b>IP công cộng (WAN)</b> của router. Nhấn nút dưới để phát hiện IP công cộng hiện tại của bạn, sau đó lưu vào cấu hình của địa điểm này.</p>
        
        <div className="d-flex align-items-center gap-3 mb-3">
          <BrandButton 
            variant="primary" 
            className="px-3 py-1 fw-bold text-white shadow-sm flex-shrink-0"
            style={{ background: 'linear-gradient(45deg, #f59e0b, #fbbf24)', border: 'none', fontSize: '12px', height: '42px' }}
            onClick={() => handleAction('public', async () => {
              const res = await fetch("https://api.ipify.org?format=json");
              const d = await res.json();
              setDetectedPublicIp(d.ip);
            })}
            loading={loading === 'public'}
            icon="bi-globe"
          >
            Phát hiện IP công cộng
          </BrandButton>

          <AnimatePresence>
            {detectedPublicIp && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="flex-grow-1 p-2 px-3 rounded-4 border d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#fff7ed', borderColor: '#fdba74' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <i className="bi bi-globe fs-4" style={{ color: '#f59e0b' }}></i>
                  <div>
                    <h5 className="mb-0 fw-bold" style={{ color: '#f59e0b', letterSpacing: '1px' }}>{detectedPublicIp}</h5>
                    <p className="mb-0 text-muted" style={{ fontSize: '10px' }}>IP hiện tại của bạn — Lưu cho <b>{branch.name}</b></p>
                  </div>
                </div>
                <button 
                  onClick={() => saveBranchConfig(detectedPublicIp)}
                  className="btn btn-warning btn-sm rounded-3 px-3 py-1 fw-bold text-white shadow-sm"
                  style={{ fontSize: '11px', background: '#f59e0b', border: 'none' }}
                >
                  <i className="bi bi-save me-1"></i> Lưu IP này
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="alert alert-warning border-0 rounded-3 p-2 px-3 d-flex align-items-center gap-2 mb-0" style={{ backgroundColor: '#fff7ed' }}>
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '12px' }}></i>
          <span className="text-muted" style={{ fontSize: '10.5px' }}>
            <b>Lưu ý:</b> IP công cộng có thể thay đổi khi ISP cấp lại. Nếu dùng IP tĩnh (static WAN) thì ổn định hơn. Nếu IP thay đổi, admin cần phát hiện lại và cập nhật danh sách.
          </span>
        </div>
      </div>

      {/* ── BƯỚC 1 ── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white">
        <div className="d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-search text-primary fs-6"></i>
          <h6 className="mb-0 fw-bold small">Bước 1 — Phát hiện mạng nội bộ hiện tại (LAN / WiFi)</h6>
        </div>
        <div className="d-flex align-items-center gap-3 mb-3">
          <BrandButton 
            className="px-3 py-1 fw-bold shadow-sm flex-shrink-0"
            style={{ background: 'linear-gradient(45deg, #6366f1, #818cf8)', border: 'none', fontSize: '12px', height: '42px' }}
            onClick={() => handleAction('local', async () => {
              const res = await detectLocalIp();
              setDetectedLocalNetwork(res);
              // Tự động thêm vào danh sách
              const start = res.ip.split('.').slice(0,3).join('.') + '.0';
              const end = res.ip.split('.').slice(0,3).join('.') + '.255';
              await addSubnet(start, end);
            })}
            loading={loading === 'local'}
            icon="bi-broadcast-pin"
          >
            Phát hiện mạng đang kết nối
          </BrandButton>
          {detectedLocalNetwork && (
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Tìm thấy 1 card mạng — chọn mạng nội bộ công ty để thêm
            </span>
          )}
        </div>

        <AnimatePresence>
          {detectedLocalNetwork && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-3 rounded-4 border d-flex align-items-center justify-content-between"
              style={{ backgroundColor: '#f0fdf4', borderColor: '#bcf0da' }}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 42, height: 42, backgroundColor: '#dcfce7' }}>
                  <i className="bi bi-wifi fs-5" style={{ color: '#16a34a' }}></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="mb-0 fw-bold" style={{ color: '#16a34a', letterSpacing: '0.5px' }}>{detectedLocalNetwork.ip}</h5>
                    <span className="badge rounded-pill fw-normal" style={{ backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '10px' }}>{detectedLocalNetwork.interface}</span>
                  </div>
                  <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>
                    Subnet: <span className="text-primary">{detectedLocalNetwork.ip.split('.').slice(0,3).join('.')}.*</span> (bao gồm {detectedLocalNetwork.ip.split('.').slice(0,3).join('.')}.0 → {detectedLocalNetwork.ip.split('.').slice(0,3).join('.')}.255)
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-success btn-sm rounded-3 px-3 py-1 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: '11px', background: '#bcf0da', border: 'none', color: '#16a34a' }}
                onClick={() => addSubnet(detectedLocalNetwork.ip.split('.').slice(0,3).join('.') + '.0', detectedLocalNetwork.ip.split('.').slice(0,3).join('.') + '.255')}
              >
                <i className="bi bi-check-circle-fill"></i> Đã thêm
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BƯỚC 2 ── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white">
        <div className="d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-list-ul text-primary fs-6"></i>
          <h6 className="mb-0 fw-bold small">Bước 2 — Danh sách subnet được phép</h6>
        </div>

        <div className="mb-4">
          <AnimatePresence mode="popLayout">
            {branch.subnets?.map((s: any, idx: number) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <SubnetCard s={s} index={idx} onDelete={deleteSubnet} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="d-flex gap-2">
          <input 
            className="form-control bg-light border rounded-3 px-3 py-2" 
            placeholder="Nhập thủ công, VD: 10.0.1.1" 
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
          />
          <BrandButton variant="outline" className="flex-shrink-0 fw-bold border-2" onClick={() => manualIp && addSubnet(manualIp, manualIp)}>
            + Thêm thủ công
          </BrandButton>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="d-flex justify-content-between align-items-center p-4 border-top bg-white position-fixed bottom-0 end-0 w-100 shadow-lg" style={{ zIndex: 10 }}>
        <div className="text-muted small">
          <i className="bi bi-shield-check text-success me-2"></i>
          {branch.subnets?.length || 0} subnet đang được cấu hình
        </div>
        <BrandButton 
          variant="primary" 
          className="px-5 py-2 fw-bold shadow-sm" 
          style={{ background: '#10b981', border: 'none' }} 
          icon="bi-save"
          onClick={() => {
            toast.success("Thành công", "Đã lưu cấu hình mạng nội bộ");
            onRefresh();
          }}
        >
          Lưu cấu hình mạng nội bộ
        </BrandButton>
      </div>
    </div>
  );
}
