"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { LaborPolicyGeneral } from "@/components/board/LaborPolicyGeneral";
import { LaborPolicyRules } from "@/components/board/LaborPolicyRules";
import { LaborPolicyNetwork } from "@/components/board/LaborPolicyNetwork";
import { LaborPolicyHolidays } from "@/components/board/LaborPolicyHolidays";
import LaborPolicyConfig from "@/components/board/LaborPolicyConfig";
import { motion, AnimatePresence } from "framer-motion";
import { Stepper, StepItem } from "@/components/ui/Stepper";

const STEP_ITEMS: StepItem[] = [
  { key: "labor_regulation", label: "Quy chế lao động", subText: "Giờ làm, OT", icon: "bi bi-clock", color: "#3b82f6" },
  { key: "holiday_regulation", label: "Quy định nghỉ lễ, Tết", subText: "Lịch nghỉ, chế độ", icon: "bi bi-calendar-event", color: "#6366f1" },
  { key: "internal_network", label: "Thiết lập mạng nội bộ", subText: "IP, Wifi, LAN", icon: "bi bi-broadcast-pin", color: "#8b5cf6" },
  { key: "parameters", label: "Thiết lập thông số", subText: "Cấu hình chung", icon: "bi bi-gear", color: "#64748b" },
];

export default function LaborPolicyPage() {
  const [activeTab, setActiveTab] = useState("labor_regulation");
  const [data, setData] = useState<any>(null);
  const toast = useToast();

  const fetchData = async () => {
    try {
      const res = await fetch("/api/board/labor-policy");
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (type: string, content: string, title?: string) => {
    const res = await fetch("/api/board/labor-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, title }),
    });
    if (res.ok) {
      toast.success("Thành công", "Đã lưu thiết lập");
      fetchData();
    } else toast.error("Lỗi", "Không thể lưu");
  };

  return (
    <div className="container-fluid py-2 px-4">
      <PageHeader title="Nội quy lao động" description="Quản trị quy chế và mạng nội bộ" icon="bi-shield-lock" />

      <Stepper steps={STEP_ITEMS} currentStep={activeTab} onStepChange={setActiveTab}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === "internal_network" ? <LaborPolicyNetwork branches={data?.branches || []} onRefresh={fetchData} /> : 
             activeTab === "labor_regulation" ? <LaborPolicyRules policy={data?.policies?.find((p:any) => p.type === activeTab)} onSave={(c: string) => handleSave(activeTab, c)} /> : 
             activeTab === "holiday_regulation" ? <LaborPolicyHolidays policy={data?.policies?.find((p:any) => p.type === activeTab)} onSave={(c: string) => handleSave(activeTab, c)} /> : 
             activeTab === "parameters" ? <LaborPolicyConfig /> :
             <LaborPolicyGeneral type={activeTab} policy={data?.policies?.find((p:any) => p.type === activeTab)} onSave={(c: string, t?: string) => handleSave(activeTab, c, t)} />}
          </motion.div>
        </AnimatePresence>
      </Stepper>
    </div>
  );
}
