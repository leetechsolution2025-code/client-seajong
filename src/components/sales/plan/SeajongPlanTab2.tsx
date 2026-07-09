"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Tab } from "@/components/ui/Tab";
import { SeajongPlanTab } from "@/components/sales/plan/SeajongPlanTab";
import { OemPlanTab } from "@/components/sales/plan/OemPlanTab";

export default function SalesPlanPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("seajong");

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: "yearly",
      title: "Kế hoạch năm",
      desc: "Kế hoạch năm",
      icon: "bi-calendar-range"
    },
    {
      num: 2,
      id: "monthly",
      title: "Kế hoạch tháng",
      desc: "Kế hoạch tháng",
      icon: "bi-calendar3"
    },
    {
      num: 3,
      id: "data",
      title: "Dữ liệu",
      desc: "Dữ liệu",
      icon: "bi-database-fill-check"
    }
  ];

  return (
    <StandardPage
      title="Lập kế hoạch"
      description="Quản lý và thiết lập các chỉ tiêu kinh doanh"
      color="emerald"
      icon="bi-calendar-check"
      useCard={false}
    >
      <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
        <WorkflowCard
          stepper={
            <ModernStepper
              steps={steps}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
          toolbar={
            <div className="px-4 pt-2">
              <Tab
                tabs={[
                  { key: "seajong", label: "SEAJONG" },
                  { key: "oem", label: "OEM" }
                ]}
                active={activeTab}
                onChange={(key) => setActiveTab(key)}
              />
            </div>
          }
          contentPadding="p-0"
        >
          {activeTab === "seajong" && (
            <SeajongPlanTab currentStep={currentStep} />
          )}

          {activeTab === "oem" && (
            <OemPlanTab currentStep={currentStep} />
          )}
        </WorkflowCard>
      </div>

      <style jsx global>{`
        @keyframes pulse-danger {
          0% {
            transform: scale(0.85);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(0.85);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        .pulse-danger-dot {
          animation: pulse-danger 1.5s infinite;
        }

        .plan-left-panel {
          border-right: 1px solid var(--border);
          background-color: #fafafa;
        }
        .plan-right-panel {
          background-color: #ffffff;
        }

        @media (max-width: 1200px) {
          .plan-left-panel {
            border-right: none;
            border-bottom: 1px solid var(--border);
            height: auto !important;
          }
          .plan-right-panel {
            height: auto !important;
          }
          .plan-row {
            flex-direction: column;
          }
        }
      `}</style>
    </StandardPage>
  );
}
