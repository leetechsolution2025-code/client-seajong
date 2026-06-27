import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, attachmentUrl, attachmentName } = await req.json();
    if (!content && !attachmentUrl) {
      return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 });
    }

    // Since TaskComment doesn't support attachmentUrl directly in prisma schema,
    // if attachmentUrl is provided, we append it to the content text as a markdown link
    let finalContent = content || "";
    if (attachmentUrl) {
      if (finalContent) finalContent += "\n\n";
      finalContent += `[Đính kèm: ${attachmentName || "Tệp tin"}](${attachmentUrl})`;
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId: session.user.id,
        content: finalContent
      }
    });

    return NextResponse.json({ success: true, id: comment.id });
  } catch (error: any) {
    console.error("[Board Comment API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await props.params;
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" }
    });

    const userIds = Array.from(new Set(comments.map(c => c.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });

    const userMap = new Map(users.map(u => [u.id, u.name]));

    const mappedComments = comments.map(c => ({
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      userName: userMap.get(c.userId) || "Nhân viên",
      content: c.content,
      createdAt: c.createdAt
    }));

    return NextResponse.json(mappedComments);
  } catch (error: any) {
    console.error("[Board Comment API GET] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
