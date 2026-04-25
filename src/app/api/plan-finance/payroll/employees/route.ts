import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lightweight endpoint: trả về danh sách nhân viên active với salary fields để auto-fill payroll form
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      orderBy: [{ departmentName: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        code: true,
        fullName: true,
        departmentCode: true,
        departmentName: true,
        position: true,
        baseSalary: true,
        mealAllowance: true,
        fuelAllowance: true,
        phoneAllowance: true,
      },
    });

    return NextResponse.json(employees);
  } catch (e) {
    console.error("[GET /payroll/employees]", e);
    return NextResponse.json([]);
  }
}
