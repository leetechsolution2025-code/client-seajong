import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasks = await prisma.task.findMany({
      where: {
        deptCode: "logistics",
        status: "pending",
        OR: [
          { title: { contains: "Nhập kho thành phẩm" } },
          { title: { contains: "nhập kho vật tư" } }
        ]
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, actualResult: true, createdAt: true
      }
    });

    return NextResponse.json({ items: tasks });
  } catch (err) {
    return NextResponse.json({ items: [] });
  }
}
