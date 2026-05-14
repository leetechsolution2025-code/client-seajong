import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// Refreshing types for IDE

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "all";

  try {
    const changes = await (prisma as any).insuranceChange.findMany({
      where: {
        ...(type !== "all" ? { type } : {}),
        employee: {
          OR: [
            { fullName: { contains: search } },
            { code: { contains: search } },
          ],
          ...(department !== "all" ? { departmentCode: department } : {}),
        },
      },
      include: {
        employee: true,
      },
      orderBy: { effectiveDate: "desc" },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(changes)));
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch changes" }, { status: 500 });
  }
}
