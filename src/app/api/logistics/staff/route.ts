import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const staff = await prisma.employee.findMany({
      where: {
        OR: [
          { departmentCode: { contains: "logistics" } },
          { departmentCode: { contains: "kho" } },
          { departmentName: { contains: "kho" } }
        ],
        status: "active"
      },
      select: {
        id: true,
        fullName: true,
        position: true
      },
      orderBy: { fullName: "asc" }
    });

    return NextResponse.json(staff);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
