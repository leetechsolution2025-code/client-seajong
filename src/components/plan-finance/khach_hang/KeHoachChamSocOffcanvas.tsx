"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
type CustomerBrief = {
  id: string;
  name: string;
  nhom: string | null;
  dienThoai: string | null;
  nguoiChamSoc?: { fullName: string } | null;
  lastCareDate?: string | null;   // ISO string
  daysSinceLastCare?: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectCustomer?: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const nhomColor: Record<string, string> = {
  "ca-nhan": "#6366f1", "doanh-nghiep": "#10b981",
  "doi-tac": "#f59e0b", "khach-le": "#06b6d4",
};

const NHOM_LABEL: Record<string, string> = {
  "ca-nhan": "Cá nhân", "doanh-nghiep": "Doanh nghiệp",
  "doi-tac": "Đối tác", "khach-le": "Khách lẻ",
};

function Avatar({ name, nhom }: { name: string; nhom: string | null }) {
  const color = nhomColor[nhom ?? ""] ?? "#6366f1";
  const letter = name.trim().split(" ").pop()?.[0]?.toUpperCase() ?? "?";
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      background: `color-mix(in srgb, ${color} 15%, var(--background))`,
      border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 800, color,
    }}>{letter}</div>
  );
}

function CustomerCard({ c, onSelect }: { c: CustomerBrief; onSelect?: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 12px", borderRadius: 10, marginBottom: 2,
        background: "transparent", cursor: onSelect ? "pointer" : "default",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (onSelect) e.currentTarget.style.background = "var(--muted)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <Avatar name={c.name} nhom={c.nhom} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: "normal", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          {c.nhom && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: `color-mix(in srgb, ${nhomColor[c.nhom] ?? "#94a3b8"} 12%, transparent)`, color: nhomColor[c.nhom] ?? "#94a3b8" }}>
              {NHOM_LABEL[c.nhom] ?? c.nhom}
            </span>
          )}
          {c.nguoiChamSoc && (
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.nguoiChamSoc.fullName}</span>
          )}
        </div>
      </div>
      {c.daysSinceLastCare !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
          background: c.daysSinceLastCare > 30 ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.12)",
          color: c.daysSinceLastCare > 30 ? "#f43f5e" : "#f59e0b",
        }}>
          {c.daysSinceLastCare}d
        </span>
      )}
    </div>
  );
}

// ── Accordion Item ────────────────────────────────────────────────────────────
function AccordionItem({
  id, icon, label, color, badge, children, isOpen, onToggle,
}: {
  id: string; icon: string; label: string; color: string;
  badge?: number; children: React.ReactNode; 
  isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: "13px 20px", border: "none", background: "transparent",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--muted)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`bi ${icon}`} style={{ fontSize: 14, color }} />
        </div>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 800, minWidth: 20, textAlign: "center",
            padding: "1px 7px", borderRadius: 20,
            background: `color-mix(in srgb, ${color} 15%, transparent)`, color,
            flexShrink: 0
          }}>{badge}</span>
        )}
        <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ fontSize: 11, color: "var(--muted-foreground)", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "4px 12px 12px" }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function KeHoachChamSocOffcanvas({ open, onClose, onSelectCustomer }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [homNay, setHomNay] = React.useState<CustomerBrief[]>([]);
  const [boQuen, setBoQuen] = React.useState<CustomerBrief[]>([]);
  const [chuaChamSoc, setChuaChamSoc] = React.useState<CustomerBrief[]>([]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/plan-finance/customers/care-plan")
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        homNay?: CustomerBrief[];
        boQuen?: CustomerBrief[];
        chuaChamSoc?: CustomerBrief[];
      } | null) => {
        if (!data) return;
        setHomNay(data.homNay ?? []);
        setBoQuen(data.boQuen ?? []);
        setChuaChamSoc(data.chuaChamSoc ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  const EmptyState = ({ text }: { text: string }) => (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: 12 }}>
      <i className="bi bi-check-circle" style={{ fontSize: 20, display: "block", marginBottom: 6, opacity: 0.3 }} />
      {text}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1040 }}
          />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 1050,
              minWidth: 400, maxWidth: 400,
              background: "var(--card)", boxShadow: "4px 0 32px rgba(0,0,0,0.18)",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "color-mix(in srgb, #6366f1 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-calendar-check" style={{ fontSize: 16, color: "#6366f1" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>Kế hoạch chăm sóc</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Danh sách cần ưu tiên hôm nay</p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  <i className="bi bi-arrow-repeat" style={{ fontSize: 22, display: "block", marginBottom: 8, animation: "spin 1s linear infinite" }} />
                  Đang tải...
                </div>
              ) : (
                <>
                  <AccordionItem
                    id="hom-nay" icon="bi-alarm" label="Chăm sóc hôm nay"
                    color="#10b981" badge={homNay.length} 
                    isOpen={expandedId === "hom-nay"} onToggle={() => toggle("hom-nay")}
                  >
                    {homNay.length === 0
                      ? <EmptyState text="Không có khách hàng cần chăm sóc hôm nay" />
                      : homNay.map(c => (
                        <CustomerCard key={c.id} c={c} onSelect={() => { onSelectCustomer?.(c.id); onClose(); }} />
                      ))}
                  </AccordionItem>

                  <AccordionItem
                    id="bo-quen" icon="bi-hourglass-split" label="Khách hàng bị bỏ quên"
                    color="#f43f5e" badge={boQuen.length}
                    isOpen={expandedId === "bo-quen"} onToggle={() => toggle("bo-quen")}
                  >
                    {boQuen.length === 0
                      ? <EmptyState text="Không có khách hàng bị bỏ quên" />
                      : boQuen.map(c => (
                        <CustomerCard key={c.id} c={c} onSelect={() => { onSelectCustomer?.(c.id); onClose(); }} />
                      ))}
                  </AccordionItem>

                  <AccordionItem
                    id="chua-cham-soc" icon="bi-person-dash" label="Khách hàng chưa chăm sóc"
                    color="#f59e0b" badge={chuaChamSoc.length}
                    isOpen={expandedId === "chua-cham-soc"} onToggle={() => toggle("chua-cham-soc")}
                  >
                    {chuaChamSoc.length === 0
                      ? <EmptyState text="Tất cả khách hàng đã được chăm sóc" />
                      : chuaChamSoc.map(c => (
                        <CustomerCard key={c.id} c={c} onSelect={() => { onSelectCustomer?.(c.id); onClose(); }} />
                      ))}
                  </AccordionItem>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
