import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
if "FullWidthTableLayout" not in content:
    content = content.replace(
        'import { SectionTitle } from "@/components/ui/SectionTitle";',
        'import { SectionTitle } from "@/components/ui/SectionTitle";\nimport { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";'
    )

# Replace StatusBadge
old_badge = """const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; color: string }> = {
    "Đang thực hiện": { bg: "#e0f2fe", color: "#0369a1" },
    "Đã thực hiện": { bg: "#dcfce7", color: "#166534" },
    "Tạm dừng": { bg: "#fef9c3", color: "#854d0e" },
    "Huỷ bỏ": { bg: "#fee2e2", color: "#991b1b" },
  };"""

new_badge = """const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; color: string }> = {
    "Chờ duyệt": { bg: "#fff3cd", color: "#856404" },
    "Đã duyệt": { bg: "#d4edda", color: "#155724" },
    "Từ chối": { bg: "#f8d7da", color: "#721c24" },
  };"""
content = content.replace(old_badge, new_badge)

# Replace options
old_options = """          <FilterSelect
            placeholder="Trạng thái"
            options={[
              { label: "Đang thực hiện", value: "Đang thực hiện" },
              { label: "Đã thực hiện", value: "Đã thực hiện" },
              { label: "Tạm dừng", value: "Tạm dừng" },
              { label: "Huỷ bỏ", value: "Huỷ bỏ" },
            ]}"""
            
new_options = """          <FilterSelect
            placeholder="Trạng thái"
            options={[
              { label: "Chờ duyệt", value: "Chờ duyệt" },
              { label: "Đã duyệt", value: "Đã duyệt" },
              { label: "Từ chối", value: "Từ chối" },
            ]}"""
content = content.replace(old_options, new_options)

# Rewrite the layout
old_layout_start = """  return (
    <div className="d-flex flex-column gap-2 h-100 overflow-hidden bg-white p-3 position-relative">"""

# Find where the List div starts
list_div = """      {/* List */}
      <div className="flex-grow-1 bg-white border rounded-3 mt-2" style={{ minHeight: 0, width: "100%", overflow: "hidden" }}>"""

# We'll construct a custom replacement with regex
import sys
import os

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Pre-processed")
