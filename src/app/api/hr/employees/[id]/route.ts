import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const toDate  = (v: unknown) => { if (!v) return null; const d = new Date(v as string); return isNaN(d.getTime()) ? null : d; };
const toFloat = (v: unknown) => { const n = parseFloat(v as string); return isNaN(n) ? null : n; };
const toInt   = (v: unknown, def = 0) => { const n = parseInt(v as string); return isNaN(n) ? def : n; };
const toStr   = (v: unknown) => (v ? String(v).trim() : null);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  console.log("[PATCH /api/hr/employees/:id] id =", id);
  if (!id) return NextResponse.json({ error: "Missing employee id" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  console.log("[PATCH] body keys:", Object.keys(body));

  const existing = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  console.log("[PATCH] existing:", existing);
  if (!existing) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        // Định danh (cho phép đổi tên, giữ nguyên code/email)
        branchCode:           toStr(body.branchCode),
        fullName:             toStr(body.fullName) ?? undefined,
        gender:               toStr(body.gender) || "male",
        birthDate:            toDate(body.birthDate),
        nationalId:           toStr(body.nationalId),
        nationalIdDate:       toDate(body.nationalIdDate),
        nationalIdPlace:      toStr(body.nationalIdPlace),
        permanentAddress:     toStr(body.permanentAddress),
        currentAddress:       toStr(body.currentAddress),
        phone:                toStr(body.phone),
        personalEmail:        toStr(body.personalEmail),
        emergencyName:        toStr(body.emergencyName),
        emergencyRelation:    toStr(body.emergencyRelation),
        emergencyPhone:       toStr(body.emergencyPhone),
        // Công việc
        departmentCode:       toStr(body.departmentCode) ?? "",
        departmentName:       toStr(body.departmentName) ?? "",
        position:             toStr(body.position) ?? "",
        level:                toStr(body.level) || "staff",
        manager:              toStr(body.manager),
        employeeType:         toStr(body.employeeType) || "official",
        startDate:            toDate(body.startDate),
        workLocation:         toStr(body.workLocation) || "main",
        // Hợp đồng & Pháp lý
        contractType:         toStr(body.contractType) || "unsigned",
        contractNumber:       toStr(body.contractNumber),
        contractSignDate:     toDate(body.contractSignDate),
        contractEndDate:      toDate(body.contractEndDate),
        profileStatus:        String(body.profileStatus ?? "pending"),
        socialInsuranceNumber: toStr(body.socialInsuranceNumber),
        taxCode:              toStr(body.taxCode),
        // Lương & Phúc lợi
        baseSalary:           toFloat(body.baseSalary),
        mealAllowance:        toFloat(body.mealAllowance),
        fuelAllowance:        toFloat(body.fuelAllowance),
        phoneAllowance:       toFloat(body.phoneAllowance),
        seniorityAllowance:   toFloat(body.seniorityAllowance),
        bankAccount:          toStr(body.bankAccount),
        bankName:             toStr(body.bankName),
        bankBranch:           toStr(body.bankBranch),
        dependents:           toInt(body.dependents, 0),
        // Kỹ năng
        skills:               toStr(body.skills),
        softSkills:           toStr(body.softSkills),
        education:            toStr(body.education),
        certifications:       toStr(body.certifications),
        // Chuyên cần
        annualLeave:          toInt(body.annualLeave, 12),
        workShift:            toStr(body.workShift) || "standard",
        notes:                toStr(body.notes),
      },
    });

    console.log("[PATCH] updated:", { id: employee.id, fullName: (employee as Record<string, unknown>).fullName });
    return NextResponse.json({ employee });
  } catch (err) {
    console.error("[PATCH /api/hr/employees/:id]", err);
    return NextResponse.json({ error: "Lỗi máy chủ, vui lòng thử lại." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing employee id" }, { status: 400 });

  try {
    const existing = await prisma.employee.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

    // Also delete the linked User account if exists, but for now we only delete employee
    // If the schema requires deleting employee before user or vice versa:
    // User relation is Employee -> User (1:1), User handles login.
    // We will just delete the Employee row.
    await prisma.employee.delete({ where: { id } });
    
    // Optionally delete the user. If we want to clean up entirely:
    if (existing.userId) {
      await prisma.user.delete({ where: { id: existing.userId } }).catch(e => console.error("Could not delete associated user:", e));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/hr/employees/:id]", err);
    return NextResponse.json({ error: "Không thể xoá nhân viên. Vui lòng thử lại sau." }, { status: 500 });
  }
}
