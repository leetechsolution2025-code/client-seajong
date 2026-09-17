"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeImgSrc } from "@/lib/utils/image";

interface CompanyInfo {
  name?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
}

function getMaintenanceErrorMessage(until: string | null): string {
  if (!until) {
    return "Hệ thống đang trong thời gian dừng hoạt động. Vui lòng quay lại sau.";
  }
  const d = new Date(until);
  if (isNaN(d.getTime())) {
    return "Hệ thống đang trong thời gian dừng hoạt động. Vui lòng quay lại sau.";
  }
  const formattedUntil = d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `Hệ thống đang trong thời gian dừng hoạt động. Vui lòng quay lại sau ${formattedUntil}`;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Pass@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<CompanyInfo>({});
  const [industries, setIndustries] = useState<any[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState("");

  // Lấy callbackUrl từ URL params (do middleware tạo ra khi chặn /admin, /dashboard...)
  const callbackUrl = searchParams.get("callbackUrl");

  const [maintenance, setMaintenance] = useState<{ active: boolean; at: string | null; until: string | null; reason: string }>({
    active: false,
    at: null,
    until: null,
    reason: "",
  });
  const [now, setNow] = useState<number>(Date.now());

  // Timer 1 giây để cập nhật trạng thái theo thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isMaintenanceLocked = React.useMemo(() => {
    if (!maintenance.active || !maintenance.at) return false;
    const startTime = new Date(maintenance.at).getTime();
    if (isNaN(startTime) || now < startTime) return false;
    if (maintenance.until) {
      const untilTime = new Date(maintenance.until).getTime();
      if (!isNaN(untilTime) && now >= untilTime) return false;
    }
    return true;
  }, [maintenance, now]);

  const isEmailAdmin = email.trim().toLowerCase() === "admin@seajong.com";
  const isGrayed = isMaintenanceLocked && !isEmailAdmin;

  // Fetch thông tin công ty để hiển thị logo & tên động (không hardcode)
  useEffect(() => {
    fetch("/api/company")
      .then(r => r.ok ? r.json() : {})
      .then(d => setCompany(d))
      .catch(() => {});

    let isMounted = true;
    const fetchMaintenance = () => {
      fetch("/api/company/maintenance", { cache: "no-store" })
        .then(r => r.ok ? r.json() : {})
        .then((d: any) => {
          if (isMounted) {
            setMaintenance({
              active: Boolean(d?.maintenanceActive),
              at: d?.maintenanceAt || null,
              until: d?.maintenanceUntil || null,
              reason: d?.maintenanceReason || "",
            });
          }
        })
        .catch(() => {});
    };

    fetchMaintenance();
    const pollInterval = setInterval(fetchMaintenance, 10000);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Fetch danh sách ngành nghề phục vụ dev/test
  useEffect(() => {
    fetch("/api/industries")
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (Array.isArray(d)) {
          setIndustries(d);
          // Đọc cookie cũ hoặc mặc định là sản xuất đồ gỗ
          const cookies = document.cookie.split("; ");
          const activeIndCookie = cookies.find(c => c.startsWith("active_industry_code="))?.split("=")[1];
          if (activeIndCookie && d.some(i => i.code === activeIndCookie)) {
            setSelectedIndustry(activeIndCookie);
          } else {
            const defaultInd = d.find(ind => ind.code === "sanitary") || d[0];
            if (defaultInd) setSelectedIndustry(defaultInd.code);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized") {
      setError("Bạn không có quyền truy cập vào khu vực này.");
    } else if (err === "CredentialsSignin") {
      // Kiểm tra trạng thái dừng hoạt động khi đăng nhập thất bại
      fetch("/api/company/maintenance", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.maintenanceActive) {
            const mNow = new Date();
            const mStarted = d.maintenanceAt ? mNow >= new Date(d.maintenanceAt) : false;
            const mEnded = d.maintenanceUntil ? mNow >= new Date(d.maintenanceUntil) : false;
            if (mStarted && !mEnded) {
              setError(getMaintenanceErrorMessage(d.maintenanceUntil || null));
              return;
            }
          }
          setError("Email hoặc mật khẩu không đúng.");
        })
        .catch(() => {
          setError("Email hoặc mật khẩu không đúng.");
        });
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    if (selectedIndustry) {
      document.cookie = `active_industry_code=${selectedIndustry}; path=/; max-age=31536000`;
    }

    // Luôn fetch trạng thái mới nhất từ server trước khi xử lý
    let curMaintenance = maintenance;
    try {
      const checkRes = await fetch("/api/company/maintenance", { cache: "no-store" });
      if (checkRes.ok) {
        const d = await checkRes.json();
        curMaintenance = {
          active: Boolean(d?.maintenanceActive),
          at: d?.maintenanceAt || null,
          until: d?.maintenanceUntil || null,
          reason: d?.maintenanceReason || "",
        };
        setMaintenance(curMaintenance);
      }
    } catch {}

    const now = new Date();
    const isStarted = curMaintenance.at ? now >= new Date(curMaintenance.at) : false;
    const isEnded = curMaintenance.until ? now >= new Date(curMaintenance.until) : false;
    const isMaintenanceLocked = curMaintenance.active && isStarted && !isEnded;

    if (isMaintenanceLocked && email.trim().toLowerCase() !== "admin@seajong.com") {
      setError(getMaintenanceErrorMessage(curMaintenance.until));
      return;
    }

    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (isMaintenanceLocked && email.trim().toLowerCase() !== "admin@seajong.com") {
        setError(getMaintenanceErrorMessage(curMaintenance.until));
        return;
      }
      setError("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;
    const departmentCode = session?.user?.departmentCode;

    // Ưu tiên callbackUrl (vd: /admin khi bấm "Bắt đầu ngay" từ landing page)
    if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      router.push(callbackUrl);
    } else if (role === "SUPERADMIN") {
      // Chỉ SUPERADMIN mới vào được /admin
      router.push("/admin");
    } else if (departmentCode) {
      // USER có phòng ban → trang phòng ban của họ (vd: /plan_finance, /hr, /sales...)
      router.push(`/${departmentCode}`);
    } else if (role === "ADMIN") {
      // ADMIN client con → vào /company (admin panel riêng của doanh nghiệp)
      router.push("/company");
    } else {
      router.push("/");
    }
  }


  return (
    <div className="login-root">

      {/* ── LEFT: Ảnh nền + Overlay ── */}
      <div className="login-left">
        <div className="login-overlay" />
        <div className="login-left-content">
          <div className="login-brand-badge" style={{ position: "relative" }}>
            {company.logoUrl && (
              <>
                {/* Lớp đổ bóng (Shadow layer) */}
                <img src={normalizeImgSrc(company.logoUrl) || ""} alt="Logo Shadow" className="login-brand-logo-shadow" />
                {/* Lớp hiển thị chính màu trắng */}
                <img src={normalizeImgSrc(company.logoUrl) || ""} alt={company.name ?? "Logo"} className="login-brand-logo" />
              </>
            )}
          </div>
          <h2 className="login-tagline">Hệ điều hành<br />Doanh nghiệp số</h2>
          <p className="login-tagline-sub">Quản trị toàn diện · Vận hành thông minh</p>
        </div>
      </div>

      {/* ── RIGHT: Form đăng nhập ── */}
      <div className="login-right">
        <div className="login-form-wrap">

          {/* Error */}
          {error && (
            <div className="login-error">
              <i className={isMaintenanceLocked ? "bi bi-tools" : "bi bi-exclamation-circle-fill"} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="login-form">

            {/* Industry Switcher (Dev/Test) */}
            {company.shortName === "leetech" && industries.length > 0 && (
              <div className="login-field">
                <label htmlFor="login-industry" className="login-label">Ngành nghề hoạt động (Dev/Test)</label>
                <div className="login-input-wrap" style={{ position: "relative" }}>
                  <i className="bi bi-briefcase login-input-icon" />
                  <select
                    id="login-industry"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    disabled={loading}
                    className="login-input"
                    style={{ appearance: "none", cursor: "pointer", paddingRight: "30px" }}
                  >
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.code}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "11px", opacity: 0.5 }} />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">Tên đăng nhập</label>
              <div className="login-input-wrap">
                <i className="bi bi-person login-input-icon" />
                <input
                  type="email"
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com"
                  autoComplete="email"
                  disabled={loading}
                  className="login-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">Mật khẩu</label>
              <div className="login-input-wrap">
                <i className="bi bi-lock login-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="login-row">
              <label className="login-remember">
                <input type="checkbox" className="login-checkbox" />
                <span>Ghi nhớ thông tin đăng nhập</span>
              </label>
              <button
                type="button"
                className="login-forgot"
                style={isMaintenanceLocked ? { color: "#94a3b8", cursor: "default", textDecoration: "none" } : undefined}
                disabled={isMaintenanceLocked}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="login-btn"
              style={
                isGrayed
                  ? {
                      background: "#94a3b8",
                      backgroundImage: "none",
                      color: "#ffffff",
                      boxShadow: "none",
                    }
                  : undefined
              }
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat login-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="login-footer">
            © {new Date().getFullYear()} {company.name ?? "EOS — Hệ điều hành doanh nghiệp"}
          </p>
        </div>
      </div>

    </div>
  );
}
