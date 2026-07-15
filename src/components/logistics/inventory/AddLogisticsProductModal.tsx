"use client";

import React from "react";
import { AddSanitaryProductModal } from "./AddSanitaryProductModal";

export function AddLogisticsProductModal({ open, onClose, onSaved, warehouseId, warehouseType, isMaterialWarehouse, editItem }: { 
  open: boolean, 
  onClose: () => void, 
  onSaved: () => void, 
  warehouseId?: string | null,
  warehouseType?: string | null,
  isMaterialWarehouse?: boolean,
  editItem?: any
}) {
  if (!open) return null;

  return (
    <AddSanitaryProductModal
      open={open}
      onClose={onClose}
      onSaved={onSaved}
      warehouseId={warehouseId}
      warehouseType={warehouseType}
      isMaterialWarehouse={isMaterialWarehouse}
      editItem={editItem}
    />
  );
}

