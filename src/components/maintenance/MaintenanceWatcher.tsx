"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface MaintenanceState {
  maintenanceActive: boolean;
  maintenanceAt: string | null;
  maintenanceUntil: string | null;
  maintenanceReason: string;
  serverTime?: string;
}

// Hàm format thời gian theo: [ngày], giờ, phút, giây
function formatDaysHoursMinutesSeconds(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} ngày`);
  }
  parts.push(`${String(hours).padStart(2, "0")} giờ`);
  parts.push(`${String(minutes).padStart(2, "0")} phút`);
  parts.push(`${String(seconds).padStart(2, "0")} giây`);

  return parts.join(" ");
}

interface CountdownSegmentedProps {
  totalSeconds: number;
  theme?: "amber" | "red" | "emerald";
  isDark?: boolean;
}

function CountdownSegmented({
  totalSeconds,
  theme = "amber",
  isDark = false,
}: CountdownSegmentedProps) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const units = [
    { label: "Ngày", value: String(days).padStart(2, "0") },
    { label: "Giờ", value: String(hours).padStart(2, "0") },
    { label: "Phút", value: String(minutes).padStart(2, "0") },
    { label: "Giây", value: String(seconds).padStart(2, "0") },
  ];

  const styles = useMemo(() => {
    if (isDark) {
      const isRed = theme === "red";
      const isEmerald = theme === "emerald";
      return {
        cardBg: "linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
        border: isRed
          ? "1px solid rgba(239, 68, 68, 0.4)"
          : isEmerald
          ? "1px solid rgba(52, 211, 153, 0.4)"
          : "1px solid rgba(245, 158, 11, 0.4)",
        numberColor: isRed ? "#fca5a5" : isEmerald ? "#6ee7b7" : "#fde047",
        labelColor: "#94a3b8",
        shadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      };
    }

    if (theme === "red") {
      return {
        cardBg: "linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)",
        border: "1.5px solid #fecaca",
        numberColor: "#dc2626",
        labelColor: "#991b1b",
        shadow: "0 2px 8px rgba(220, 38, 38, 0.1), inset 0 1px 0 #ffffff",
      };
    }

    if (theme === "emerald") {
      return {
        cardBg: "linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)",
        border: "1.5px solid #a7f3d0",
        numberColor: "#059669",
        labelColor: "#065f46",
        shadow: "0 2px 8px rgba(5, 150, 105, 0.1), inset 0 1px 0 #ffffff",
      };
    }

    // Mặc định: amber
    return {
      cardBg: "linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)",
      border: "1.5px solid #fde68a",
      numberColor: "#b45309",
      labelColor: "#78350f",
      shadow: "0 2px 8px rgba(217, 119, 6, 0.1), inset 0 1px 0 #ffffff",
    };
  }, [theme, isDark]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 6,
        width: "100%",
      }}
    >
      {units.map((u) => (
        <div
          key={u.label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "7px 2px",
            borderRadius: 10,
            background: styles.cardBg,
            border: styles.border,
            boxShadow: styles.shadow,
            minWidth: 0,
            textAlign: "center",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "var(--font-roboto-condensed), -apple-system, monospace",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.15,
              color: styles.numberColor,
              letterSpacing: "-0.02em",
            }}
          >
            {u.value}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginTop: 3,
              color: styles.labelColor,
              opacity: 0.9,
            }}
          >
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MaintenanceWatcher() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [state, setState] = useState<MaintenanceState>({
    maintenanceActive: false,
    maintenanceAt: null,
    maintenanceUntil: null,
    maintenanceReason: "",
  });
  const [now, setNow] = useState<number>(Date.now());
  const [minimized, setMinimized] = useState<boolean>(false);

  // Fetch trạng thái từ API định kỳ mỗi 10 giây
  useEffect(() => {
    let isMounted = true;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/company/maintenance", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setState({
            maintenanceActive: Boolean(data.maintenanceActive),
            maintenanceAt: data.maintenanceAt || null,
            maintenanceUntil: data.maintenanceUntil || null,
            maintenanceReason: data.maintenanceReason || "",
            serverTime: data.serverTime,
          });
        }
      } catch (err) {
        console.error("[MaintenanceWatcher] fetch error:", err);
      }
    }

    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Timer 1 giây để cập nhật đồng hồ đếm ngược
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startTime = useMemo(() => {
    if (!state.maintenanceAt) return null;
    const t = new Date(state.maintenanceAt).getTime();
    return isNaN(t) ? null : t;
  }, [state.maintenanceAt]);

  const untilTime = useMemo(() => {
    if (!state.maintenanceUntil) return null;
    const t = new Date(state.maintenanceUntil).getTime();
    return isNaN(t) ? null : t;
  }, [state.maintenanceUntil]);

  const isStarted = startTime !== null && now >= startTime;
  const isEnded = untilTime !== null && now >= untilTime;
  const isMaintenanceActive = state.maintenanceActive && startTime !== null && !isEnded;

  // 1. Tính thời gian đếm ngược tới thời điểm bắt đầu (khi chưa tới giờ bắt đầu)
  const startDiffSeconds = useMemo(() => {
    if (!startTime || isStarted) return 0;
    return Math.max(0, Math.floor((startTime - now) / 1000));
  }, [startTime, isStarted, now]);

  // 2. Tính thời gian đếm ngược tới thời điểm kết thúc (khi đã bắt đầu và có thời điểm kết thúc)
  const untilDiffSeconds = useMemo(() => {
    if (!untilTime || !isStarted) return 0;
    return Math.max(0, Math.floor((untilTime - now) / 1000));
  }, [untilTime, isStarted, now]);

  // 3. Tính thời gian đã trôi qua tính từ thời điểm bắt đầu (khi đã bắt đầu và thời điểm kết thúc chưa xác định)
  const elapsedFromStartSeconds = useMemo(() => {
    if (!startTime || !isStarted) return 0;
    return Math.max(0, Math.floor((now - startTime) / 1000));
  }, [startTime, isStarted, now]);

  // Chuỗi hiển thị theo ngày, giờ, phút, giây
  const countdownToStartText = useMemo(() => formatDaysHoursMinutesSeconds(startDiffSeconds), [startDiffSeconds]);
  const countdownToEndText = useMemo(() => formatDaysHoursMinutesSeconds(untilDiffSeconds), [untilDiffSeconds]);
  const elapsedFromStartText = useMemo(() => formatDaysHoursMinutesSeconds(elapsedFromStartSeconds), [elapsedFromStartSeconds]);

  // Kiểm tra tài khoản admin@seajong.com
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdminExempt = userEmail === "admin@seajong.com";

  const formattedStart = startTime
    ? new Date(startTime).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const formattedEnd = untilTime
    ? new Date(untilTime).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa xác định";

  const isLoginPage = pathname === "/login";

  // Không hiển thị nếu chưa kích hoạt bảo trì hoặc đã qua thời điểm kết thúc
  if (!isMaintenanceActive) return null;

  return (
    <>
      {/* ── 1. MÀN HÌNH KHÓA TOÀN HỆ THỐNG KHI ĐÃ ĐẾN GIỜ (Ngoại trừ admin@seajong.com và trang /login) ── */}
      {isStarted && !isAdminExempt && !isLoginPage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.98) 100%)",
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: "var(--font-roboto-condensed), system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 500,
              width: "100%",
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 24,
              padding: "36px 28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.2)",
              textAlign: "center",
              color: "#f8fafc",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(245, 158, 11, 0.25))",
                border: "2px solid #ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
              }}
            >
              <i className="bi bi-shield-lock-fill" style={{ fontSize: 34, color: "#f87171" }} />
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 999,
                background: "rgba(239, 68, 68, 0.2)",
                color: "#fca5a5",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 12,
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              Hệ thống tạm dừng hoạt động
            </span>

            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 10px", color: "#ffffff", letterSpacing: "-0.01em" }}>
              Màn hình đã được khoá
            </h2>

            {/* Khoảng thời gian bảo trì */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 13,
                color: "#e2e8f0",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i className="bi bi-tools" style={{ fontSize: 20, color: "#f87171" }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Từ thời điểm:</span>
                    <strong style={{ color: "#f87171" }}>{formattedStart}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8" }}>Đến thời điểm:</span>
                    <strong style={{ color: untilTime ? "#34d399" : "#fbbf24" }}>{formattedEnd}</strong>
                  </div>
                </div>
              </div>
              {state.maintenanceReason && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, paddingTop: 4, marginTop: 2, borderTop: "1px dashed rgba(255, 255, 255, 0.15)" }}>
                  <span style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>Lý do:</span>
                  <strong style={{ color: "#f8fafc", textAlign: "right", fontWeight: 600 }}>{state.maintenanceReason}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {untilTime ? "Kết thúc sau:" : "Thời gian đã dừng:"}
                  </span>
                  <span style={{ color: untilTime ? "#34d399" : "#f87171", fontSize: 11, fontWeight: 700 }}>
                    {untilTime ? "Dự kiến mở lại" : "Chưa xác định"}
                  </span>
                </div>
                <CountdownSegmented
                  totalSeconds={untilTime ? untilDiffSeconds : elapsedFromStartSeconds}
                  theme={untilTime ? "emerald" : "red"}
                  isDark={true}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <i className="bi bi-box-arrow-right" />
                Đăng xuất / Quay lại màn hình đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. THÔNG BÁO Ở GÓC DƯỚI BÊN PHẢI MÀN HÌNH ── */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9998,
          maxWidth: minimized ? 280 : 380,
          width: "calc(100vw - 32px)",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "var(--font-roboto-condensed), system-ui, sans-serif",
        }}
      >
        {minimized ? (
          /* Trạng thái thu gọn */
          <div
            onClick={() => setMinimized(false)}
            style={{
              background: isStarted
                ? "linear-gradient(135deg, #7f1d1d, #991b1b)"
                : "linear-gradient(135deg, #78350f, #92400e)",
              color: "#ffffff",
              padding: "10px 14px",
              borderRadius: 14,
              boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              border: `1px solid ${isStarted ? "rgba(248, 113, 113, 0.4)" : "rgba(251, 191, 36, 0.4)"}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isStarted ? "#f87171" : "#fde047",
                  boxShadow: `0 0 8px ${isStarted ? "#f87171" : "#fde047"}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isStarted
                  ? untilTime
                    ? `Kết thúc sau: ${countdownToEndText}`
                    : `Đã dừng: ${elapsedFromStartText}`
                  : `Dừng sau: ${countdownToStartText}`}
              </span>
            </div>
            <i className="bi bi-chevron-up" style={{ fontSize: 12, opacity: 0.8 }} />
          </div>
        ) : (
          /* Trạng thái mở rộng đầy đủ */
          <div
            style={{
              background: "var(--card, #ffffff)",
              border: isStarted ? "1.5px solid #ef4444" : "1.5px solid #f59e0b",
              borderRadius: 18,
              boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.25), 0 0 25px rgba(245, 158, 11, 0.15)",
              overflow: "hidden",
              color: "var(--foreground, #1e293b)",
            }}
          >
            {/* Header thông báo */}
            <div
              style={{
                padding: "12px 16px",
                background: isStarted
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.25)",
                  }}
                >
                  <i
                    className={`bi ${isStarted ? "bi-shield-lock-fill" : "bi-exclamation-triangle-fill"}`}
                    style={{ fontSize: 12, color: "#ffffff" }}
                  />
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  {isStarted ? "Hệ thống đang dừng hoạt động" : "Thông báo tạm dừng hoạt động"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                title="Thu nhỏ thông báo"
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "#ffffff",
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  padding: 0,
                }}
              >
                <i className="bi bi-dash" />
              </button>
            </div>

            {/* Nội dung thông báo */}
            <div style={{ padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Khoảng thời gian: Từ ... Đến ... với 1 icon lớn duy nhất */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Icon lớn duy nhất đại diện cho khoảng thời gian */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isStarted ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                      border: isStarted ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(245, 158, 11, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i
                      className="bi bi-tools"
                      style={{
                        fontSize: 20,
                        color: isStarted ? "#dc2626" : "#d97706",
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>Từ thời điểm:</span>
                      <strong style={{ fontSize: 12.5, color: isStarted ? "#dc2626" : "#b45309" }}>{formattedStart}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>Đến thời điểm:</span>
                      <strong style={{ fontSize: 12.5, color: untilTime ? "#10b981" : "#64748b" }}>{formattedEnd}</strong>
                    </div>
                  </div>
                </div>

                {state.maintenanceReason && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                      paddingTop: 4,
                      borderTop: "1px dashed var(--border, #e2e8f0)",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)", whiteSpace: "nowrap" }}>Lý do:</span>
                    <strong style={{ fontSize: 12, color: "var(--foreground, #1e293b)", fontWeight: 700, textAlign: "right" }}>
                      {state.maintenanceReason}
                    </strong>
                  </div>
                )}
              </div>

              {/* Đường phân cách mảnh giữa thông tin và đồng hồ */}
              <div style={{ height: 1, background: "var(--border, #e2e8f0)" }} />

              {/* Đồng hồ hiển thị trực tiếp trên card chính */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: isStarted ? (untilTime ? "#065f46" : "#991b1b") : "#92400e",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i
                      className={`bi ${isStarted ? (untilTime ? "bi-hourglass-split" : "bi-stopwatch-fill") : "bi-clock-history"}`}
                      style={{ fontSize: 13, color: isStarted ? (untilTime ? "#059669" : "#dc2626") : "#d97706" }}
                    />
                    {isStarted ? (untilTime ? "Kết thúc sau:" : "Thời gian đã dừng:") : "Bắt đầu sau:"}
                  </span>
                </div>

                <CountdownSegmented
                  totalSeconds={isStarted ? (untilTime ? untilDiffSeconds : elapsedFromStartSeconds) : startDiffSeconds}
                  theme={isStarted ? (untilTime ? "emerald" : "red") : "amber"}
                />
              </div>

              {/* Lời nhắc khi chưa đến thời điểm dừng */}
              {!isStarted && (
                <div
                  style={{
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: "#b45309",
                    paddingTop: 2,
                  }}
                >
                  Vui lòng lưu lại toàn bộ dữ liệu trước thời điểm hệ thống tạm dừng. Đến thời gian quy định, hệ thống sẽ tự động khóa quyền đăng nhập cho đến khi hoạt động trở lại.
                </div>
              )}

              {/* Quick links cho Quản trị viên */}
              {isAdminExempt && (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <Link
                    href="/company"
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "var(--primary, #6366f1)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>Cấu hình tại Quản lý công ty</span>
                    <i className="bi bi-arrow-right" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
