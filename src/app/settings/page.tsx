import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) redirect("/dashboard");

  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-background">
      <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-4" style={{ width: 64, height: 64, background: "rgba(139,92,246,0.1)", fontSize: "1.875rem" }}>
          ⚙️
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--foreground)" }}>Cài đặt doanh nghiệp</h1>
        <p className="text-muted-foreground">Trang quản trị hệ thống đang được xây dựng.</p>
        <p className="text-muted-foreground" style={{ fontSize: 13 }}>
          Đăng nhập với: <span style={{ fontWeight: 700, color: "var(--primary)" }}>{session.user.email}</span>
          {session.user.clientName && (
            <> · <span style={{ fontWeight: 700, color: "var(--primary)" }}>{session.user.clientName}</span></>
          )}
        </p>
        <div className="d-flex gap-3 justify-content-center pt-2">
          <a href="/dashboard" style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
            → Dashboard
          </a>
          <a href="/login" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Đăng xuất
          </a>
        </div>
      </div>
    </div>
  );
}
