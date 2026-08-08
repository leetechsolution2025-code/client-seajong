import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add careStatusFilter state
state_target = 'const [quoteStatusFilter, setQuoteStatusFilter] = useState("");'
state_replacement = 'const [quoteStatusFilter, setQuoteStatusFilter] = useState("");\n  const [careStatusFilter, setCareStatusFilter] = useState("");'
content = content.replace(state_target, state_replacement)

# 2. Update filteredPartners logic
filtered_partners_target = """      } else if (cStep === 3) {"""

filtered_partners_replacement = """      } else if (cStep === 2) {
        if (careStatusFilter === "Đang thực hiện" && pStep !== 2) return false;
        if (careStatusFilter === "Đã thực hiện" && (pStep < 3 || pStep === 6)) return false;
        if (careStatusFilter === "Đã huỷ bỏ" && (pStep !== 6 || !p.careStaff)) return false;
        if (careStatusFilter === "") {
          if (pStep < 2 && pStep !== 6) return false;
          if (pStep === 6 && !p.careStaff) return false;
        }
      } else if (cStep === 3) {"""
content = content.replace(filtered_partners_target, filtered_partners_replacement)

# Update dependencies of filteredPartners
deps_target = "}, [partners, currentStep, searchTerm, areaFilter, quoteStatusFilter]);"
deps_replacement = "}, [partners, currentStep, searchTerm, areaFilter, quoteStatusFilter, careStatusFilter]);"
content = content.replace(deps_target, deps_replacement)

# 3. Add FilterSelect to toolbar for step 2
toolbar_target = """                  {Number(currentStep) === 3 && (
                    <FilterSelect
                      options={[
                        { label: "Đang thực hiện", value: "Đang thực hiện" },
                        { label: "Đã thực hiện", value: "Đã thực hiện" },
                        { label: "Đã huỷ bỏ", value: "Đã huỷ bỏ" }
                      ]}
                      value={quoteStatusFilter}
                      onChange={setQuoteStatusFilter}
                      placeholder="Tất cả trạng thái"
                      width={180}
                    />
                  )}"""

toolbar_replacement = """                  {Number(currentStep) === 2 && (
                    <FilterSelect
                      options={[
                        { label: "Đang thực hiện", value: "Đang thực hiện" },
                        { label: "Đã thực hiện", value: "Đã thực hiện" },
                        { label: "Đã huỷ bỏ", value: "Đã huỷ bỏ" }
                      ]}
                      value={careStatusFilter}
                      onChange={setCareStatusFilter}
                      placeholder="Tất cả trạng thái"
                      width={180}
                    />
                  )}

                  {Number(currentStep) === 3 && (
                    <FilterSelect
                      options={[
                        { label: "Đang thực hiện", value: "Đang thực hiện" },
                        { label: "Đã thực hiện", value: "Đã thực hiện" },
                        { label: "Đã huỷ bỏ", value: "Đã huỷ bỏ" }
                      ]}
                      value={quoteStatusFilter}
                      onChange={setQuoteStatusFilter}
                      placeholder="Tất cả trạng thái"
                      width={180}
                    />
                  )}"""
content = content.replace(toolbar_target, toolbar_replacement)

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated page.tsx")
