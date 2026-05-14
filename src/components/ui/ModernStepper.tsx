"use client";

import React from "react";

export interface ModernStepItem {
  num: number;
  id: string;
  title: string;
  desc: string;
  icon: string;
}

interface ModernStepperProps {
  steps: ModernStepItem[];
  currentStep: number;
  onStepChange: (num: number) => void;
  /** Optional horizontal padding, defaults to 24px */
  paddingX?: string | number;
}

export const ModernStepper: React.FC<ModernStepperProps> = ({ 
  steps, 
  currentStep, 
  onStepChange,
  paddingX = 24
}) => {
  const renderStepIcon = (num: number, icon: string) => {
    const isActive = currentStep === num;
    let bg = "var(--muted)";
    let color = "var(--muted-foreground)";

    if (isActive) {
      bg = "#003087";
      color = "#fff";
    }

    return (
      <div style={{ 
        width: 34, height: 34, borderRadius: 8, background: bg, color, 
        display: "flex", alignItems: "center", justifyContent: "center", 
        fontSize: 15, transition: "all 0.3s", flexShrink: 0 
      }}>
        <i className={`bi ${icon}`} />
      </div>
    );
  };

  return (
    <div style={{ padding: `16px ${typeof paddingX === 'number' ? paddingX + 'px' : paddingX}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isPast = currentStep > s.num;

          return (
            <React.Fragment key={s.num}>
              <div 
                style={{ 
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer", 
                  opacity: isActive || isPast ? 1 : 0.7, transition: "all 0.3s" 
                }}
                onClick={() => onStepChange(s.num)}
              >
                {renderStepIcon(s.num, s.icon)}
                <div className="d-none d-lg-block">
                  <h3 style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: isActive ? "#003087" : "var(--muted-foreground)" }}>{s.title}</h3>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", opacity: 0.8 }}>{s.desc}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div style={{ flex: 1, margin: "0 15px", display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "40%", height: 1, background: "var(--border)", opacity: 0.6 }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      <div style={{ flex: 0.5 }} />
      </div>
    </div>
  );
};
