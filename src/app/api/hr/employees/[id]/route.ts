import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma"; // IMPORT VỚI TÊN MỚI `db`

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing employee id" }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, role: true, permissions: true } },
      },
    });

    if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

    // Sử dụng $queryRaw để bypass hoàn toàn bộ đệm (cache) của Turbopack đối với node_modules/@prisma/client
    // Việc này gọi trực tiếp xuống database SQLite, bỏ qua các model Javascript đang bị kẹt ở phiên bản cũ.
    const [contracts, history] = await Promise.all([
      db.$queryRaw`SELECT * FROM LaborContract WHERE employeeId = ${id} ORDER BY startDate DESC`,
      db.$queryRaw`SELECT * FROM EmploymentHistory WHERE employeeId = ${id} ORDER BY effectiveDate DESC`,
    ]);

    return NextResponse.json({ 
      employee: {
        ...employee,
        laborContracts: contracts,
        employmentHistory: history
      } 
    });
  } catch (err: any) {
    console.error("[GET /api/hr/employees/[id]]", err);
    return NextResponse.json({ error: "Lỗi db mới: " + (err.message || "Unknown error") }, { status: 500 });
  }
}

const toDate  = (v: unknown) => { if (!v) return null; const d = new Date(v as string); return isNaN(d.getTime()) ? null : d; };
const toDateStr = (v: unknown) => { const d = toDate(v); return d ? d.toISOString() : null; };
const toFloat = (v: unknown) => { const n = parseFloat(v as string); return isNaN(n) ? null : n; };
const toInt   = (v: unknown, def = 0) => { const n = parseInt(v as string); return isNaN(n) ? def : n; };
const toStr   = (v: unknown) => (v ? String(v).trim() : null);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    // Use $executeRaw to bypass TurboPack's stale Prisma client cache
    // which does not yet recognize the 'avatarUrl' field added after initial bundling.
    await db.$executeRaw`
      UPDATE "Employee" SET
        branchCode            = ${toStr(body.branchCode)},
        fullName              = ${toStr(body.fullName) ?? body.fullName},
        avatarUrl             = ${toStr(body.avatarUrl)},
        gender                = ${toStr(body.gender) || "male"},
        birthDate             = ${toDateStr(body.birthDate)},
        nationalId            = ${toStr(body.nationalId)},
        nationalIdDate        = ${toDateStr(body.nationalIdDate)},
        nationalIdPlace       = ${toStr(body.nationalIdPlace)},
        permanentAddress      = ${toStr(body.permanentAddress)},
        currentAddress        = ${toStr(body.currentAddress)},
        phone                 = ${toStr(body.phone)},
        personalEmail         = ${toStr(body.personalEmail)},
        emergencyName         = ${toStr(body.emergencyName)},
        emergencyRelation     = ${toStr(body.emergencyRelation)},
        emergencyPhone        = ${toStr(body.emergencyPhone)},
        departmentCode        = ${toStr(body.departmentCode) ?? ""},
        departmentName        = ${toStr(body.departmentName) ?? ""},
        position              = ${toStr(body.position) ?? ""},
        level                 = ${toStr(body.level) || "staff"},
        manager               = ${toStr(body.manager)},
        employeeType          = ${toStr(body.employeeType) || "official"},
        startDate             = ${toDateStr(body.startDate)},
        workLocation          = ${toStr(body.workLocation) || "main"},
        contractType          = ${toStr(body.contractType) || "unsigned"},
        contractNumber        = ${toStr(body.contractNumber)},
        contractSignDate      = ${toDateStr(body.contractSignDate)},
        contractEndDate       = ${toDateStr(body.contractEndDate)},
        profileStatus         = ${String(body.profileStatus ?? "pending")},
        socialInsuranceNumber = ${toStr(body.socialInsuranceNumber)},
        taxCode               = ${toStr(body.taxCode)},
        isInsuranceEnrolled   = ${body.isInsuranceEnrolled ? 1 : 0},
        baseSalary            = ${toFloat(body.baseSalary)},
        mealAllowance         = ${toFloat(body.mealAllowance)},
        fuelAllowance         = ${toFloat(body.fuelAllowance)},
        phoneAllowance        = ${toFloat(body.phoneAllowance)},
        seniorityAllowance    = ${toFloat(body.seniorityAllowance)},
        bankAccount           = ${toStr(body.bankAccount)},
        bankName              = ${toStr(body.bankName)},
        bankBranch            = ${toStr(body.bankBranch)},
        dependents            = ${toInt(body.dependents, 0)},
        skills                = ${toStr(body.skills)},
        softSkills            = ${toStr(body.softSkills)},
        education             = ${toStr(body.education)},
        certifications        = ${toStr(body.certifications)},
        annualLeave           = ${toInt(body.annualLeave, 12)},
        workShift             = ${toStr(body.workShift) || "standard"},
        notes                 = ${toStr(body.notes)},
        updatedAt             = ${new Date().toISOString()}
      WHERE id = ${id}
    `;

    // Fetch and return the updated record
    const [employee] = await db.$queryRaw<any[]>`SELECT * FROM "Employee" WHERE id = ${id}`;
    return NextResponse.json({ employee });
  } catch (err: any) {
    console.error("[PATCH /api/hr/employees/[id]]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await db.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
