import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // TODO: Điều hướng theo phòng ban của user
  // Hiện tại placeholder — sẽ build đầy đủ khi có modules
  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-background">
      <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-4" style={{ width: 64, height: 64, background: "rgba(99,102,241,0.1)", fontSize: "1.875rem" }}>
          👋
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--foreground)" }}>Xin chào, {session.user.name}!</h1>
        <p className="text-muted-foreground">Dashboard đang được xây dựng theo modules của bạn.</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Role: <span style={{ fontWeight: 700, color: "var(--primary)" }}>{session.user.role}</span>
          {session.user.clientName && (
            <> · Công ty: <span style={{ fontWeight: 700, color: "var(--primary)" }}>{session.user.clientName}</span></>
          )}
        </p>
        <div className="d-flex gap-3 justify-content-center pt-2">
          <a href="/login" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Đăng xuất
          </a>
        </div>
      </div>
    </div>
  );
}
