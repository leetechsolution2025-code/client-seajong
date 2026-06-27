import type { Metadata } from "next";
import MeetingsWorkspace from "@/components/meetings/MeetingsWorkspace";

export const metadata: Metadata = {
  title: "Nội dung cuộc họp | Hệ điều hành",
  description: "Quản lý và lưu trữ nội dung các cuộc họp cá nhân của bạn.",
};

export default function MyMeetingsPage() {
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: "calc(100vh - 62px)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "linear-gradient(135deg, #fbbf24, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="bi bi-calendar2-event" style={{ fontSize: 16, color: "white" }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--foreground)" }}>
            Nội dung cuộc họp
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
            Quản lý và lưu trữ biên bản cuộc họp cá nhân
          </p>
        </div>
      </div>
      {/* Workspace — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MeetingsWorkspace />
      </div>
    </div>
  );
}
