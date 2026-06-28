import { Suspense } from "react";
import DepartmentsClient from "./DepartmentsClient";

export const metadata = { title: "Danh mục phòng ban — EOS Master" };

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Đang tải...</div>}>
      <DepartmentsClient />
    </Suspense>
  );
}
