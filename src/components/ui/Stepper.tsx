import React from 'react';

export interface StepItem {
  key: string;
  label: string;
  subText: string;
  icon: string;
  color: string;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: string;
  onStepChange: (key: string) => void;
  children: React.ReactNode;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepChange, children }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "12px 16px 24px" }}>
      <div style={{
        background: "white",
        borderRadius: 20,
        border: "1px solid #eef2f6",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
      }}>
        {/* ── STEPPER HEADER (FIXED) ── */}
        <div style={{
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: "1px solid #f1f5f9"
        }}>
          {steps.map((s, idx) => {
            const active = currentStep === s.key;
            return (
              <React.Fragment key={s.key}>
                <button
                  onClick={() => onStepChange(s.key)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Icon Box */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: active 
                      ? `linear-gradient(135deg, ${s.color}, color-mix(in srgb, ${s.color} 80%, black))` 
                      : "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: active 
                      ? `0 6px 12px color-mix(in srgb, ${s.color} 30%, transparent)` 
                      : "none",
                    transition: "all 0.3s",
                    flexShrink: 0
                  }}>
                    <i className={s.icon} style={{ fontSize: 18, color: active ? "white" : "#64748b" }} />
                  </div>

                  {/* Text */}
                  <div style={{ whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#1e293b" : "#64748b" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginTop: 1 }}>
                      {s.subText}
                    </div>
                  </div>
                </button>

                {/* Connector Line */}
                {idx < steps.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0", margin: "0 40px" }} />
                )}
              </React.Fragment>
            );
          })}
          {/* Spacer to simulate the empty space in the 4-item design */}
          <div style={{ flex: 1.5 }} />
        </div>

        {/* ── STEP CONTENT ── */}
        <div style={{ padding: "24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
