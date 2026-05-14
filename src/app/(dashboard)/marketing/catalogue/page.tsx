import type { Metadata } from "next";
import MediaLibrary from "@/components/marketing/MediaLibrary";

export const metadata: Metadata = {
  title: "Thư viện tài nguyên | Marketing",
  description: "Quản lý catalogue, banner, video và tài liệu marketing tập trung.",
};

export default function CataloguePage() {
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="bi bi-collection" style={{ fontSize: 16, color: "white" }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--foreground)" }}>
            Thư viện tài nguyên
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
            Quản lý catalogue, banner, video và tài liệu marketing
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
