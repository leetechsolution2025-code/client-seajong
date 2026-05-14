import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/tasks
export async function GET() {
  try {
    const tasks = await prisma.marketingTask.findMany({
      include: { 
        monthlyPlan: { select: { id: true, employeeName: true, month: true, year: true } },
        content: { include: { theme: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    // Tính toán deadline dựa trên tuần nếu deadline trong DB trống
    const computedTasks = tasks.map(t => {
      if (!t.monthlyPlan) return t;
      const { month, year } = t.monthlyPlan;
      
      // Xác định tuần lớn nhất được chọn
      let maxWeek = 0;
      if (t.week4) maxWeek = 4;
      else if (t.week3) maxWeek = 3;
      else if (t.week2) maxWeek = 2;
      else if (t.week1) maxWeek = 1;

      // Xác định tuần nhỏ nhất được chọn (Start Date)
      let minWeek = 0;
      if (t.week1) minWeek = 1;
      else if (t.week2) minWeek = 2;
      else if (t.week3) minWeek = 3;
      else if (t.week4) minWeek = 4;

      const lastDayOfMonth = new Date(year, month || 0, 0).getDate();
      
      const getDay = (w: number, type: 'start' | 'end') => {
        if (w === 1) return type === 'start' ? 1 : 7;
        if (w === 2) return type === 'start' ? 8 : 14;
        if (w === 3) return type === 'start' ? 15 : 21;
        if (w === 4) return type === 'start' ? 22 : lastDayOfMonth;
        return null;
      };

      const startDay = minWeek ? getDay(minWeek, 'start') : 1;
      const endDay = maxWeek ? getDay(maxWeek, 'end') : lastDayOfMonth;

      return {
        ...t,
        startDate: new Date(year, (month || 1) - 1, startDay || 1),
        deadline: t.deadline || (endDay ? new Date(year, (month || 1) - 1, endDay) : null)
      };
    });

    return NextResponse.json(computedTasks);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = await prisma.marketingTask.create({
      data: {
        monthlyPlanId: body.monthlyPlanId,
        contentId: body.contentId || null,
        title: body.title,
        description: body.description || null,
        taskType: body.taskType || null,
        category: body.category || null,
        taskGroup: body.taskGroup || null,
        taskSubGroup: body.taskSubGroup || null,
        week1: body.week1 ?? false,
        week2: body.week2 ?? false,
        week3: body.week3 ?? false,
        week4: body.week4 ?? false,
        week1Content: body.week1Content || null,
        week2Content: body.week2Content || null,
        week3Content: body.week3Content || null,
        week4Content: body.week4Content || null,
        assigneeName: body.assigneeName || null,
        channel: body.channel || null,
        format: body.format || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        status: body.status || "pending",
        sortOrder: body.sortOrder || 0,
        budget: typeof body.budget === 'number' ? body.budget : (parseFloat(body.budget) || 0),
      },
      include: { 
        monthlyPlan: { select: { id: true, employeeName: true, month: true, year: true } },
        content: { include: { theme: true } } 
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi tạo task: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
