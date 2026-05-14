import { Suspense } from "react";
import LoginPage from "./LoginForm";

export default function Login() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <i className="bi bi-arrow-repeat animate-spin text-2xl text-muted-foreground" />
      </div>
    }>
      <LoginPage />
    </Suspense>
  );
}
