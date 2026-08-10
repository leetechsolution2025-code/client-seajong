"use client";

import React from "react";

export interface ModernStepItem {
  num: number;
  id: string;
  title: string;
  desc: string;
  icon: string;
  locked?: boolean;
  hasNewData?: boolean;
}

interface ModernStepperProps {
  steps: ModernStepItem[];
  currentStep: number;
  onStepChange: (num: number) => void;
  /** Optional horizontal padding, defaults to 24px */
  paddingX?: string | number;
  /** Optional vertical padding, defaults to 16px */
  paddingY?: string | number;
}

export const ModernStepper: React.FC<ModernStepperProps> = ({ 
  steps, 
  currentStep, 
  onStepChange,
  paddingX = 24,
  paddingY = 16
}) => {
  const renderStepIcon = (num: number, icon: string, hasNewData?: boolean) => {
    const isActive = currentStep === num;
    let bg = "var(--muted)";
    let color = "var(--muted-foreground)";

    if (isActive) {
      bg = "#003087";
      color = "#fff";
    }

    return (
      <div className="modern-step-icon position-relative" style={{ 
        width: 34, height: 34, borderRadius: 8, background: bg, color, 
        display: "flex", alignItems: "center", justifyContent: "center", 
        fontSize: 15, transition: "all 0.3s", flexShrink: 0 
      }}>
        <i className={`bi ${icon}`} />
        {hasNewData && (
          <span 
            className="position-absolute translate-middle bg-danger rounded-circle" 
            style={{ 
              top: '4px', right: '-4px', width: '10px', height: '10px', 
              animation: "pulse-red 1.5s infinite",
              border: "2px solid #fff"
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="modern-stepper-container" style={{ padding: `${typeof paddingY === 'number' ? paddingY + 'px' : paddingY} ${typeof paddingX === 'number' ? paddingX + 'px' : paddingX}` }}>
      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .modern-step-item {
          gap: 6px;
        }
        .modern-step-text {
          text-align: center;
        }
        .modern-step-title {
          font-size: 11px;
        }
        @media (max-width: 767.98px) {
          .modern-stepper-container {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .modern-step-item {
            gap: 3px !important;
          }
          .modern-step-icon {
            width: 28px !important;
            height: 28px !important;
            font-size: 13px !important;
            border-radius: 6px !important;
          }
          .modern-step-title {
            font-size: 10px !important;
          }
        }
        @media (min-width: 768px) and (max-width: 991.98px) {
          .modern-stepper-container {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          .modern-step-item {
            gap: 8px !important;
          }
          .modern-step-icon {
            width: 30px !important;
            height: 30px !important;
            font-size: 14px !important;
          }
          .modern-step-title {
            font-size: 11px !important;
          }
          .modern-step-text {
            text-align: left !important;
          }
          .modern-stepper-divider {
            margin: 0 8px !important;
          }
        }
        @media (min-width: 992px) {
          .modern-step-item {
            gap: 12px !important;
          }
          .modern-step-text {
            text-align: left !important;
          }
          .modern-step-title {
            font-size: 13px !important;
          }
        }
      `}</style>
      <div className="modern-stepper-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isPast = currentStep > s.num;

          return (
            <React.Fragment key={s.num}>
              <div 
                className="modern-step-item d-flex flex-column flex-md-row align-items-center"
                style={{ 
                  cursor: s.locked ? "not-allowed" : "pointer", 
                  opacity: isActive || isPast ? 1 : (s.locked ? 0.4 : 0.7), transition: "all 0.3s" 
                }}
                onClick={() => {
                  if (!s.locked) onStepChange(s.num);
                }}
              >
                {renderStepIcon(s.num, s.locked ? "bi-lock-fill" : s.icon, s.hasNewData)}
                <div className="modern-step-text d-flex flex-column align-items-center align-items-md-start">
                  <div className="d-flex align-items-center gap-1">
                    <h3 className="modern-step-title" style={{ margin: "0 0 1px", fontWeight: 700, color: isActive ? "#003087" : "var(--muted-foreground, #64748b)" }}>{s.title}</h3>
                  </div>
                  <p className="d-none d-lg-block" style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground, #64748b)", opacity: 0.8 }}>{s.desc}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="modern-stepper-divider d-none d-sm-flex" style={{ flex: 1, margin: "0 15px", justifyContent: "center" }}>
                  <div style={{ width: "40%", height: 1, background: "var(--border)", opacity: 0.6 }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      <div className="modern-stepper-spacer d-none d-sm-block" style={{ flex: 0.5 }} />
      </div>
    </div>
  );
};
