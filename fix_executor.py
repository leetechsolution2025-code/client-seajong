import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add currentUserEmployeeId state
content = content.replace(
    "  const [crmEmployees, setCrmEmployees] = useState<{ id: string; fullName: string; phone?: string | null; userId?: string }[]>([]);",
    "  const [crmEmployees, setCrmEmployees] = useState<{ id: string; fullName: string; phone?: string | null; userId?: string }[]>([]);\n  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);"
)

# 2. Update fetch block
fetch_old = """    fetch("/api/hr/employees/crm")
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          setCrmEmployees(data.employees);
        }
      })"""

fetch_new = """    fetch("/api/hr/employees/crm?department=sales")
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          setCrmEmployees(data.employees);
        }
        if (data.currentUserEmployeeId) {
          setCurrentUserEmployeeId(data.currentUserEmployeeId);
        }
      })"""
content = content.replace(fetch_old, fetch_new)

# 3. Add helper function
helper_func = """
  const getDefaultExecutor = (partnerStaff?: string | null) => {
    if (partnerStaff) return partnerStaff;
    if (currentUserEmployeeId) {
      const me = crmEmployees.find(e => e.id === currentUserEmployeeId);
      if (me) return me.fullName;
    }
    const hasCrm = crmEmployees.some(emp => emp.fullName === currentUserName);
    if (hasCrm) return currentUserName;
    return crmEmployees[0]?.fullName || "Vũ Hoàng Long";
  };
"""
content = content.replace(
    "  const handleAddNewCare = (partnerInput?: PartnerProcessItem) => {",
    helper_func + "\n  const handleAddNewCare = (partnerInput?: PartnerProcessItem) => {"
)

# 4. Replace usages
content = content.replace(
    "setCareExecutor(selectedPartner.careStaff || currentUserName || crmEmployees[0]?.fullName || \"\");",
    "setCareExecutor(getDefaultExecutor(selectedPartner.careStaff));"
)
content = content.replace(
    "setNegExecutor(partner?.careStaff || currentUserName || crmEmployees[0]?.fullName || \"\");",
    "setNegExecutor(getDefaultExecutor(partner?.careStaff));"
)
content = content.replace(
    "setCareExecutor(partner.careStaff || currentUserName || crmEmployees[0]?.fullName || \"\");",
    "setCareExecutor(getDefaultExecutor(partner.careStaff));"
)
content = content.replace(
    "updated.careStaff = updated.careStaff || (hasCrm ? currentUserName : (crmEmployees[0]?.fullName || \"Vũ Hoàng Long\"));",
    "updated.careStaff = updated.careStaff || getDefaultExecutor();"
)
content = content.replace(
    "setNewCareStaff(currentUserName || crmEmployees[0]?.fullName || \"Vũ Hoàng Long\");",
    "setNewCareStaff(getDefaultExecutor());"
)

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated default executor logic")
