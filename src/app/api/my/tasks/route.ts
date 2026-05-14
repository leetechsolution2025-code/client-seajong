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
        monthlyPlan: { select: { month: true, year: true, employeeName: true } }
      }
    });

    // 2. Fetch Generic Tasks (assigned by ID)
    const genericTasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      orderBy: { createdAt: "desc" }
    });

    // 3. Map Generic Tasks to match MarketingTask structure for MyTasks.tsx
    const mappedGenericTasks = genericTasks.map(t => {
      const date = t.dueDate ? new Date(t.dueDate) : new Date();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // Calculate week based on day of month
      // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22+
      let w1 = false, w2 = false, w3 = false, w4 = false;
      if (day <= 7) w1 = true;
      else if (day <= 14) w2 = true;
      else if (day <= 21) w3 = true;
      else w4 = true;

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
          month: month
        },
        isGeneric: true,
        createdAt: t.createdAt
      };
    });

    const allTasks = [...marketingTasks, ...mappedGenericTasks];

    return NextResponse.json(allTasks);

  } catch (error: any) {
    console.error("[MY_TASKS_GET]", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}
