import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/marketing/tasks/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.taskType !== undefined) data.taskType = body.taskType;
    if (body.category !== undefined) data.category = body.category;
    if (body.taskGroup !== undefined) data.taskGroup = body.taskGroup;
    if (body.taskSubGroup !== undefined) data.taskSubGroup = body.taskSubGroup;
    if (body.week1 !== undefined) data.week1 = body.week1;
    if (body.week2 !== undefined) data.week2 = body.week2;
    if (body.week3 !== undefined) data.week3 = body.week3;
    if (body.week4 !== undefined) data.week4 = body.week4;
    if (body.week1Content !== undefined) data.week1Content = body.week1Content;
    if (body.week2Content !== undefined) data.week2Content = body.week2Content;
    if (body.week3Content !== undefined) data.week3Content = body.week3Content;
    if (body.week4Content !== undefined) data.week4Content = body.week4Content;
    if (body.assigneeName !== undefined) data.assigneeName = body.assigneeName;
    if (body.channel !== undefined) data.channel = body.channel;
    if (body.format !== undefined) data.format = body.format;
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.actualResult !== undefined) data.actualResult = body.actualResult;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.budget !== undefined) data.budget = typeof body.budget === 'number' ? body.budget : (parseFloat(body.budget) || 0);

    const task = await prisma.marketingTask.update({
      where: { id }, data,
      include: { 
        monthlyPlan: { select: { id: true, employeeName: true, month: true, year: true } },
        content: { include: { theme: true } } 
      },
    });
    return NextResponse.json(task);
  } catch (err) { return NextResponse.json({ error: "Lỗi cập nhật task" }, { status: 500 }); }
}

// DELETE /api/marketing/tasks/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Xoá tất cả các công việc con (nếu task bị xóa là Hạng mục lớn hoặc Hạng mục con)
    await prisma.marketingTask.deleteMany({
      where: {
        OR: [
          { taskGroup: id },
          { taskSubGroup: id }
        ]
      }
    });

    // Xoá chính nó (dùng deleteMany thay vì delete để không quăng lỗi nếu record đã bị xoá bởi vòng lặp cascade trước đó)
    await prisma.marketingTask.deleteMany({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ error: "Lỗi xoá task" }, { status: 500 }); }
}
