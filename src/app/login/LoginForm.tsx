"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeImgSrc } from "@/lib/utils/image";

interface CompanyInfo {
  name?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
}


export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<CompanyInfo>({});

  // Fetch thông tin công ty để hiển thị logo & tên động (không hardcode)
  useEffect(() => {
    fetch("/api/company")
      .then(r => r.ok ? r.json() : {})
      .then(d => setCompany(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized") {
      setError("Bạn không có quyền truy cập vào khu vực này.");
    } else if (err === "CredentialsSignin") {
      setError("Email hoặc mật khẩu không đúng.");
    }
  }, [searchParams]);

  // Lấy callbackUrl từ URL params (do middleware tạo ra khi chặn /admin, /dashboard...)
  const callbackUrl = searchParams.get("callbackUrl");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
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
          <div className="login-brand-badge">
            {company.logoUrl && (
              <img src={normalizeImgSrc(company.logoUrl) || ""} alt={company.name ?? "Logo"} className="login-brand-logo" />
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
              <i className="bi bi-exclamation-circle-fill" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="login-form">

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
              <button type="button" className="login-forgot">Quên mật khẩu?</button>
            </div>

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="login-btn"
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
