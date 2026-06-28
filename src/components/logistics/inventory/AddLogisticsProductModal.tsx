"use client";

import React, { useState, useEffect } from "react";
import { AddSanitaryProductModal } from "./AddSanitaryProductModal";
import { AddWoodDoorProductModal } from "./AddWoodDoorProductModal";

export function AddLogisticsProductModal({ open, onClose, onSaved, warehouseId, isMaterialWarehouse, editItem }: { 
  open: boolean, 
  onClose: () => void, 
  onSaved: () => void, 
  warehouseId?: string | null,
  isMaterialWarehouse?: boolean,
  editItem?: any
}) {
  const [activeIndustryCode, setActiveIndustryCode] = useState<string>("");

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const cookies = document.cookie.split("; ");
      const indCode = cookies.find(c => c.startsWith("active_industry_code="))?.split("=")[1];
      const isSeajongHost = window.location.hostname.includes("seajong") || window.location.port === "3000" || window.location.port === "3092";
      const defaultIndustry = isSeajongHost ? "sanitary" : "wood_door";
      setActiveIndustryCode(indCode || defaultIndustry);
    }
  }, [open]);

  if (!open) return null;

  if (activeIndustryCode === "wood_door") {
    return (
      <AddWoodDoorProductModal
        open={open}
        onClose={onClose}
        onSaved={onSaved}
        warehouseId={warehouseId}
        isMaterialWarehouse={isMaterialWarehouse}
        editItem={editItem}
      />
    );
  }

  // Mặc định là Sanitary (Thiết bị vệ sinh Seajong)
  return (
    <AddSanitaryProductModal
      open={open}
      onClose={onClose}
      onSaved={onSaved}
      warehouseId={warehouseId}
      isMaterialWarehouse={isMaterialWarehouse}
      editItem={editItem}
    />
  );
}
