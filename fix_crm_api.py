import re

with open("src/app/api/hr/employees/crm/route.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Add request parameter
content = content.replace(
    "export async function GET() {",
    "export async function GET(req: Request) {\n  const { searchParams } = new URL(req.url);\n  const department = searchParams.get(\"department\");"
)

# Add departmentCode to select
content = content.replace(
    "          workEmail: true,\n          phone: true,",
    "          workEmail: true,\n          phone: true,\n          departmentCode: true,"
)

content = content.replace(
    "        select: { id: true, fullName: true, userId: true, phone: true },",
    "        select: { id: true, fullName: true, userId: true, phone: true, departmentCode: true },"
)

# Extract departmentCode
content = content.replace(
    "    let empPhone: string | null = null;",
    "    let empPhone: string | null = null;\n    let empDept: string | null = null;"
)

content = content.replace(
    "      empPhone = u.employee.phone;\n    }",
    "      empPhone = u.employee.phone;\n      empDept = u.employee.departmentCode;\n    }"
)

content = content.replace(
    "        empPhone = empByEmail.phone;\n\n        // Tự động gán",
    "        empPhone = empByEmail.phone;\n        empDept = empByEmail.departmentCode;\n\n        // Tự động gán"
)

# Filter by department
content = content.replace(
    "    if (empId && empName && !seen.has(empId)) {",
    "    if (empId && empName && !seen.has(empId)) {\n      if (department && empDept !== department) continue;"
)

with open("src/app/api/hr/employees/crm/route.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated /api/hr/employees/crm/route.ts")
