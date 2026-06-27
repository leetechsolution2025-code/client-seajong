import type { Metadata } from "next";
import MediaLibrary from "@/components/marketing/MediaLibrary";

export const metadata: Metadata = {
  title: "Thư viện tài liệu | Hệ điều hành",
  description: "Thư viện quản lý tài liệu cá nhân và tài liệu dùng chung của doanh nghiệp.",
};

export default function MyDocumentsPage() {
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: "calc(100vh - 62px)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="bi bi-folder2-open" style={{ fontSize: 16, color: "white" }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--foreground)" }}>
            Thư viện tài liệu
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
            Quản lý tài liệu dùng chung và thư mục lưu trữ cá nhân
          </p>
        </div>
      </div>
      {/* Library — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MediaLibrary mode="full" />
      </div>
    </div>
  );
}
