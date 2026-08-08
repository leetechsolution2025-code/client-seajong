import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add quoteStatusFilter state
state_code = """  const [newNeeds, setNewNeeds] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("Đang thực hiện");"""
content = content.replace('  const [newNeeds, setNewNeeds] = useState("");', state_code)

# 2. Update filteredPartners logic
filtered_partners_target = """  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const pStep = Number(p.step);
      const cStep = Number(currentStep);
      if (cStep === 1) {
        // Show all in step 1
      } else if (cStep === 4) {
        if (pStep < 4) return false;
      } else {
        if (pStep !== cStep) return false;
      }"""

filtered_partners_replacement = """  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const pStep = Number(p.step);
      const cStep = Number(currentStep);
      if (cStep === 1) {
        // Show all in step 1
      } else if (cStep === 3) {
        if (quoteStatusFilter === "Đang thực hiện" && pStep !== 3) return false;
        if (quoteStatusFilter === "Đã thực hiện" && (pStep < 4 || pStep === 6)) return false;
        if (quoteStatusFilter === "Đã huỷ bỏ" && (pStep !== 6 || !p.quoteId)) return false;
        if (quoteStatusFilter === "Tất cả trạng thái") {
          if (pStep < 3 && pStep !== 6) return false;
          if (pStep === 6 && !p.quoteId) return false;
        }
      } else if (cStep === 4) {
        if (pStep < 4) return false;
      } else {
        if (pStep !== cStep) return false;
      }"""
content = content.replace(filtered_partners_target, filtered_partners_replacement)

# Update dependencies of filteredPartners
deps_target = "}, [partners, currentStep, searchTerm, areaFilter]);"
deps_replacement = "}, [partners, currentStep, searchTerm, areaFilter, quoteStatusFilter]);"
content = content.replace(deps_target, deps_replacement)

# 3. Add FilterSelect to toolbar
toolbar_target = """                  {/* Area Filter */}
                  <FilterSelect
                    options={[
                      { label: "Tất cả khu vực", value: "" },
                      ...areas.map(a => ({ label: a, value: a }))
                    ]}
                    value={areaFilter}
                    onChange={setAreaFilter}
                    placeholder="Tất cả khu vực"
                    width={180}
                  />"""

toolbar_replacement = """                  {/* Area Filter */}
                  <FilterSelect
                    options={[
                      { label: "Tất cả khu vực", value: "" },
                      ...areas.map(a => ({ label: a, value: a }))
                    ]}
                    value={areaFilter}
                    onChange={setAreaFilter}
                    placeholder="Tất cả khu vực"
                    width={180}
                  />

                  {Number(currentStep) === 3 && (
                    <FilterSelect
                      options={[
                        { label: "Tất cả trạng thái", value: "Tất cả trạng thái" },
                        { label: "Đang thực hiện", value: "Đang thực hiện" },
                        { label: "Đã thực hiện", value: "Đã thực hiện" },
                        { label: "Đã huỷ bỏ", value: "Đã huỷ bỏ" }
                      ]}
                      value={quoteStatusFilter}
                      onChange={setQuoteStatusFilter}
                      placeholder="Trạng thái"
                      width={180}
                    />
                  )}"""
content = content.replace(toolbar_target, toolbar_replacement)

# 4. Update table column in step 3
column_target = """            header: "Trạng thái",
            render: (row) => {
              if (!row.quoteId || !row.quoteStatus) return "";
              const statusColors = { Draft: "bg-secondary text-white", Sent: "bg-warning text-dark", Approved: "bg-success text-white" };
              const statusLabels = { Draft: "Bản nháp", Sent: "Đã gửi khách", Approved: "Đã duyệt" };
              return <span className={`badge ${statusColors[row.quoteStatus] || "bg-secondary text-white"}`}>{statusLabels[row.quoteStatus] || row.quoteStatus}</span>;
            },
            width: "20%","""

column_replacement = """            header: "Trạng thái",
            render: (row) => {
              if (!row.quoteId || !row.quoteStatus) return "";
              const statusColors = { Draft: "bg-secondary text-white", Sent: "bg-warning text-dark", Approved: "bg-success text-white" };
              const statusLabels = { Draft: "Bản nháp", Sent: "Đã gửi khách", Approved: "Đã duyệt" };
              
              let processLabel = "";
              let processClass = "";
              if (Number(row.step) === 3) {
                 processLabel = "Đang thực hiện";
                 processClass = "text-primary";
              } else if (Number(row.step) >= 4 && Number(row.step) !== 6) {
                 processLabel = "Đã thực hiện";
                 processClass = "text-success";
              } else if (Number(row.step) === 6) {
                 processLabel = "Đã huỷ bỏ";
                 processClass = "text-danger";
              }
              
              return (
                <div className="d-flex flex-column gap-1">
                  <div><span className={`badge ${statusColors[row.quoteStatus] || "bg-secondary text-white"}`}>{statusLabels[row.quoteStatus] || row.quoteStatus}</span></div>
                  {processLabel && <div className={`fw-semibold ${processClass}`} style={{ fontSize: "11px" }}>{processLabel}</div>}
                </div>
              );
            },
            width: "20%","""
content = content.replace(column_target, column_replacement)

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated page.tsx")
