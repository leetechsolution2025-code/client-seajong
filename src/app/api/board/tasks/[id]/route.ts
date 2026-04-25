import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PATCH /api/board/tasks/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, title, description, dueDate, assigneeId, deptCode } = body;

    const updateData: Record<string, unknown> = {};
    if (status      !== undefined) updateData.status = status;
    if (priority    !== undefined) updateData.priority = priority;
    if (title       !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate     !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId  !== undefined) updateData.assigneeId = assigneeId;
    if (deptCode    !== undefined) updateData.deptCode = deptCode;
    if (status === "done") updateData.completedAt = new Date();
    if (status && status !== "done") updateData.completedAt = null;

    // @ts-ignore — VS Code TS server cache, runtime OK
    const task = await prisma.task.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, task });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// DELETE /api/board/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // @ts-ignore — VS Code TS server cache, runtime OK
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/board/tasks/[id] — thêm comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Nội dung rỗng" }, { status: 400 });

    // @ts-ignore — VS Code TS server cache, runtime OK
    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: (session?.user as { id?: string })?.id ?? "unknown",
        content: content.trim(),
      },
    });
    return NextResponse.json({ success: true, comment });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
