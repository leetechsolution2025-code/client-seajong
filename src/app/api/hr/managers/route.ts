import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Map: cấp hiện tại → cấp cần tìm làm quản lý

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const forLevel = searchParams.get("forLevel") ?? "";

  if (!forLevel) {
    return NextResponse.json({ managers: [] });
  }

  // Fallback for old hardcoded levels
  const MANAGER_LEVEL_LEGACY: Record<string, string> = {
    staff: "mid_manager",
    mid_manager: "senior_manager",
  };
  
  let targetLevel = MANAGER_LEVEL_LEGACY[forLevel] || "";

  // Dynamic check for Category (cap_bac)
  if (!targetLevel && forLevel !== "senior_manager") {
    // Determine targetLevel by finding the category with sortOrder === currentSortOrder - 1
    const levels = await prisma.category.findMany({
      where: { type: "cap_bac" },
      orderBy: { sortOrder: "asc" }
    });

    const currentIdx = levels.findIndex(l => l.code === forLevel);
    if (currentIdx > 0) {
      targetLevel = levels[currentIdx - 1].code;
    }
  }

  if (!targetLevel) {
    return NextResponse.json({ managers: [] });
  }

  const managers = await prisma.employee.findMany({
    where: {
      level: targetLevel,
      status: "active",
    },
    select: {
      id: true,
      code: true,
      fullName: true,
      position: true,
      departmentName: true,
      level: true,
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ managers });
}
