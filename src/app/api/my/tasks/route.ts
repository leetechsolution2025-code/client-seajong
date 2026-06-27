import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name;

    // 1. Fetch Marketing Tasks (assigned by name)
    const marketingTasks = await prisma.marketingTask.findMany({
      where: {
        OR: [
          { assigneeName: userName },
          { monthlyPlan: { employeeName: userName } }
        ]
      },
      include: {
        monthlyPlan: { select: { month: true, year: true, employeeName: true } },
        comments: { select: { id: true } }
      }
    });

    // 2. Fetch Generic Tasks (assigned by ID)
    const genericTasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        comments: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Helper to parse weeks from description
    const parseWeeksFromDescription = (desc: string | null) => {
      if (!desc) return null;
      const regex = /Thời\s*gian\s*thực\s*hiện:\s*Tuần\s*([\d,\s–-]+)/i;
      const match = desc.match(regex);
      if (!match) return null;

      const weekStr = match[1];
      const w1 = weekStr.includes("1");
      const w2 = weekStr.includes("2");
      const w3 = weekStr.includes("3");
      const w4 = weekStr.includes("4");

      if (!w1 && !w2 && !w3 && !w4) return null;
      return { w1, w2, w3, w4 };
    };

    // 3. Map Generic Tasks to match MarketingTask structure for MyTasks.tsx
    const mappedGenericTasks = genericTasks.map(t => {
      const date = t.dueDate ? new Date(t.dueDate) : new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      let w1 = false, w2 = false, w3 = false, w4 = false;
      const parsedWeeks = parseWeeksFromDescription(t.description);

      if (parsedWeeks) {
        w1 = parsedWeeks.w1;
        w2 = parsedWeeks.w2;
        w3 = parsedWeeks.w3;
        w4 = parsedWeeks.w4;
      } else {
        // Fallback: Calculate week based on day of month
        // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22+
        if (day <= 7) w1 = true;
        else if (day <= 14) w2 = true;
        else if (day <= 21) w3 = true;
        else w4 = true;
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        deadline: t.dueDate,
        assigneeName: userName,
        week1: w1,
        week2: w2,
        week3: w3,
        week4: w4,
        monthlyPlan: {
          month: month,
          year: date.getFullYear()
        },
        isGeneric: true,
        actualResult: t.actualResult,
        createdAt: t.createdAt,
        commentsCount: (t as any).comments?.length || 0
      };
    });

    const mappedMarketingTasks = marketingTasks.map(t => ({
      ...t,
      commentsCount: (t as any).comments?.length || 0,
      comments: undefined
    }));

    const allTasks = [...mappedMarketingTasks, ...mappedGenericTasks];

    return NextResponse.json(allTasks);

  } catch (error: any) {
    console.error("[MY_TASKS_GET]", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}
