import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [employees, branches, departments, users] = await Promise.all([
      prisma.employee.count(),
      prisma.branch.count(),
      prisma.departmentCategory.count(),
      prisma.user.count({ where: { role: { not: "SUPERADMIN" } } }),
    ]);
    return NextResponse.json({ employees, branches, departments, users });
  } catch {
    return NextResponse.json({ employees: 0, branches: 0, departments: 0, users: 0 });
  }
}
