import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const depts = await prisma.departmentCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(depts);
}
