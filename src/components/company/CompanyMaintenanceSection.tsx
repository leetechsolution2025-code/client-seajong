"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface MaintenanceData {
  maintenanceActive: boolean;
  maintenanceAt: string | null;
  maintenanceUntil: string | null;
  maintenanceReason: string;
}

// Chuyển Date sang định dạng YYYY-MM-DDTHH:mm cho datetime-local
function toDatetimeLocalString(date: Date): string {
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const D = String(date.getDate()).padStart(2, "0");
  const H = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D}T${H}:${m}`;
}

export function CompanyMaintenanceSection() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [active, setActive] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverData, setServerData] = useState<MaintenanceData>({
    maintenanceActive: false,
    maintenanceAt: null,
    maintenanceUntil: null,
    maintenanceReason: "",
  });

  // Từ thời điểm (bắt buộc, mặc định 15 phút sau)
  const [fromTime, setFromTime] = useState<string>(() => {
    return toDatetimeLocalString(new Date(Date.now() + 15 * 60 * 1000));
  });

  // Đến thời điểm (không bắt buộc, để trống = Chưa xác định)
  const [untilTime, setUntilTime] = useState<string>("");

  const [reason, setReason] = useState<string>("");

  // Tải trạng thái hiện tại từ server
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/company/maintenance", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        setServerData({
          maintenanceActive: Boolean(data.maintenanceActive),
          maintenanceAt: data.maintenanceAt || null,
          maintenanceUntil: data.maintenanceUntil || null,
          maintenanceReason: data.maintenanceReason || "",
        });
        setActive(Boolean(data.maintenanceActive));

        if (data.maintenanceAt) {
          const d = new Date(data.maintenanceAt);
          if (!isNaN(d.getTime())) {
            setFromTime(toDatetimeLocalString(d));
          }
        }
        if (data.maintenanceUntil) {
          const d = new Date(data.maintenanceUntil);
          if (!isNaN(d.getTime())) {
            setUntilTime(toDatetimeLocalString(d));
          }
        } else {
          setUntilTime("");
        }
        if (data.maintenanceReason) {
          setReason(data.maintenanceReason);
        }
      } catch (err) {
        console.error("Fetch maintenance error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  // Format hiển thị tiếng Việt
  const formattedFrom = useMemo(() => {
    if (!fromTime) return "";
    const d = new Date(fromTime);
    return isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [fromTime]);

  const formattedUntil = useMemo(() => {
    if (!untilTime) return "Chưa xác định";
    const d = new Date(untilTime);
    return isNaN(d.getTime()) ? "Chưa xác định" : d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [untilTime]);

  // Xử lý bật/tắt công tắc
  const handleToggleSwitch = () => {
    if (active) {
      if (serverData.maintenanceActive) {
        setConfirmOpen(true);
      } else {
        setActive(false);
      }
    } else {
      setActive(true);
    }
  };

  const handleConfirmDeactivate = async () => {
    setConfirmOpen(false);
    await handleDeactivate();
  };

  // Kích hoạt dừng hoạt động
  const handleActivate = async () => {
    if (!fromTime) {
      toast.error("Vui lòng chọn thời điểm bắt đầu (Từ thời điểm)");
      return;
    }

    const startDate = new Date(fromTime);
    if (isNaN(startDate.getTime())) {
      toast.error("Thời điểm bắt đầu không hợp lệ");
      return;
    }

    let untilDate: Date | null = null;
    if (untilTime) {
      untilDate = new Date(untilTime);
      if (isNaN(untilDate.getTime())) {
        toast.error("Thời điểm kết thúc không hợp lệ");
        return;
      }
      if (untilDate.getTime() <= startDate.getTime()) {
        toast.error("Thời điểm kết thúc phải sau thời điểm bắt đầu");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/company/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: true,
          maintenanceAt: startDate.toISOString(),
          maintenanceUntil: untilDate ? untilDate.toISOString() : null,
          maintenanceReason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể kích hoạt dừng hoạt động");
        return;
      }

      setServerData({
        maintenanceActive: true,
        maintenanceAt: data.maintenanceAt,
        maintenanceUntil: data.maintenanceUntil || null,
        maintenanceReason: data.maintenanceReason || "",
      });
      setActive(true);
      toast.success("Đã kích hoạt dừng hoạt động! Hệ thống đang phát cảnh báo cho toàn bộ người dùng.");
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  // Tắt dừng hoạt động
  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/company/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể tắt dừng hoạt động");
        return;
      }

      setServerData({
        maintenanceActive: false,
        maintenanceAt: null,
        maintenanceUntil: null,
        maintenanceReason: "",
      });
      setActive(false);
      toast.success("Đã tắt dừng hoạt động. Hệ thống đã mở lại bình thường!");
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const isServerActive = serverData.maintenanceActive && serverData.maintenanceAt !== null;

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
      {/* ── Hàng công tắc Dừng hoạt động ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: active ? "rgba(239, 68, 68, 0.12)" : "rgba(100, 116, 139, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: active ? "#ef4444" : "var(--muted-foreground)",
              transition: "all 0.2s ease",
            }}
          >
            <i className={`bi ${active ? "bi-power" : "bi-pause-circle"}`} style={{ fontSize: 16 }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                Dừng hoạt động
              </p>
              {isServerActive ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "rgba(239, 68, 68, 0.12)",
                    color: "#dc2626",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: "0 0 6px #ef4444",
                    }}
                  />
                  Đang kích hoạt
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Đang tắt
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--muted-foreground)" }}>
              {isServerActive
                ? `Từ: ${new Date(serverData.maintenanceAt!).toLocaleString("vi-VN")} → Đến: ${serverData.maintenanceUntil ? new Date(serverData.maintenanceUntil).toLocaleString("vi-VN") : "Chưa xác định"}`
                : "Thiết lập lịch dừng hệ thống & phát cảnh báo"}
            </p>
          </div>
        </div>

        {/* Nút công tắc Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={handleToggleSwitch}
          disabled={loading || submitting}
          style={{
            position: "relative",
            width: 44,
            height: 24,
            borderRadius: 999,
            background: active ? "#ef4444" : "var(--muted-foreground, #94a3b8)",
            opacity: loading ? 0.6 : 1,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            padding: 2,
            outline: "none",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "block",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              transform: active ? "translateX(20px)" : "translateX(0px)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </div>

      {/* ── Khối cấu hình bên dưới (khi công tắc Bật) ── */}
      {active && (
        <div
          style={{
            marginTop: 14,
            padding: "16px",
            background: "var(--background, #f8fafc)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Cảnh báo trạng thái đang chạy */}
          {isServerActive && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                fontSize: 12,
                color: "#b91c1c",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <i className="bi bi-broadcast" style={{ fontSize: 14, marginTop: 1 }} />
              <div>
                <strong>Hệ thống đang phát cảnh báo bảo trì.</strong>
                <br />
                Đến thời điểm trên, màn hình đăng nhập sẽ bị khóa.
              </div>
            </div>
          )}

          {/* 1. THỜI GIAN: TỪ THỜI ĐIỂM ... ĐẾN THỜI ĐIỂM */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Từ thời điểm (bắt buộc) */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--foreground)", marginBottom: 6 }}>
                Từ thời điểm: <span style={{ color: "#ef4444" }}>* (Bắt buộc)</span>
              </label>
              <input
                type="datetime-local"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                Bắt đầu dừng: <strong style={{ color: "#b45309" }}>{formattedFrom || "Chưa chọn"}</strong>
              </p>
            </div>

            {/* Đến thời điểm (không bắt buộc) */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--foreground)" }}>
                  Đến thời điểm:
                </label>
                {untilTime && (
                  <button
                    type="button"
                    onClick={() => setUntilTime("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Xóa (Chưa xác định)
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={untilTime}
                onChange={(e) => setUntilTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                Kết thúc: <strong style={{ color: untilTime ? "#10b981" : "#64748b" }}>{formattedUntil}</strong>
              </p>
            </div>
          </div>

          {/* Dòng xem trước khoảng thời gian */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              fontSize: 12,
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="bi bi-clock-history" />
            <span>
              Lịch dừng hoạt động: <strong>Từ {formattedFrom || "..."}</strong> đến <strong>{formattedUntil}</strong>
            </span>
          </div>

          {/* 2. LÝ DO (KHÔNG BẮT BUỘC) */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--foreground)", marginBottom: 6 }}>
              Lý do: <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(Không bắt buộc)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Bảo trì định kỳ máy chủ, nâng cấp tính năng, kiểm kê..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 3. NÚT KÍCH HOẠT */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleActivate}
              disabled={submitting || !fromTime}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "#ffffff",
                fontSize: 13.5,
                fontWeight: 800,
                cursor: submitting || !fromTime ? "not-allowed" : "pointer",
                opacity: submitting || !fromTime ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              <i className={`bi ${isServerActive ? "bi-check2-circle" : "bi-lightning-charge-fill"}`} />
              <span>{submitting ? "Đang xử lý..." : isServerActive ? "Cập nhật kích hoạt" : "Nút kích hoạt"}</span>
            </button>

            {isServerActive && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                Tắt dừng hoạt động
              </button>
            )}
          </div>
        </div>
      )}

      {/* ConfirmDialog thay thế confirm() native của trình duyệt */}
      <ConfirmDialog
        open={confirmOpen}
        title="Tắt Dừng hoạt động"
        message="Bạn có chắc chắn muốn tắt Dừng hoạt động và mở lại hệ thống cho toàn bộ nhân viên?"
        confirmLabel="Đồng ý tắt"
        cancelLabel="Huỷ"
        variant="warning"
        loading={submitting}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
