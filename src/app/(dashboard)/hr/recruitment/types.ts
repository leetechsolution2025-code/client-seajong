export type ViewType = "kanban" | "list" | "calendar" | "analytics" | "activity";

export interface Candidate {
  id: string;
  name: string;
  position: string;
  source: string;
  matchScore: number;
  status: string;
  avatar?: string;
  urgent?: boolean;
  dateAdded: string;
  email: string;
}

export interface RecruitmentColumn {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const COLUMNS: RecruitmentColumn[] = [
  { id: "requests", label: "Yêu cầu & Phê duyệt", icon: "bi-clipboard-check", color: "#64748b" },
  { id: "sourcing", label: "Sourcing",          icon: "bi-search",           color: "#3b82f6" },
  { id: "interview", label: "Phỏng vấn",         icon: "bi-camera-video",      color: "#8b5cf6" },
  { id: "offer",     label: "Offer",            icon: "bi-send-check",        color: "#10b981" },
  { id: "onboarding", label: "Onboarding",       icon: "bi-person-check",      color: "#f59e0b" },
];
