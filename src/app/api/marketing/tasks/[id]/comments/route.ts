import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id: taskId } = await (params as any);
  console.log("[Comment API] POST hit for task:", taskId);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("[Comment API] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, attachmentUrl, attachmentName } = await req.json();
    console.log("[Comment API] Content received:", content);
    if (!content && !attachmentUrl) {
      return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 });
    }

    // Auto-migrate columns for SQLite (one-time safety check)
    try {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE MarketingTaskComment ADD COLUMN attachmentUrl TEXT`);
    } catch(e) {}
    try {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE MarketingTaskComment ADD COLUMN attachmentName TEXT`);
    } catch(e) {}

    const userId = session.user.id;
    const userName = session.user.name || "Unknown";
    const id = Date.now().toString();

    // Use raw SQL with tagged template for better parameter handling
    await (prisma as any).$executeRaw`
      INSERT INTO MarketingTaskComment (id, taskId, userId, userName, content, attachmentUrl, attachmentName, createdAt)
      VALUES (${id}, ${taskId}, ${userId}, ${userName}, ${content || ""}, ${attachmentUrl || null}, ${attachmentName || null}, CURRENT_TIMESTAMP)
    `;

    console.log("[Comment API] Comment created via $executeRaw with attachments");
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("[Comment API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id: taskId } = await (params as any);
    // Use tagged template for GET as well
    const comments = await (prisma as any).$queryRaw`
      SELECT * FROM MarketingTaskComment WHERE taskId = ${taskId} ORDER BY createdAt ASC
    `;
    console.log(`[Comment API GET] Returning ${comments.length} comments for task ${taskId}`);
    if (comments.length > 0) console.log("[Comment API GET] Sample comment:", comments[0]);
    return NextResponse.json(comments);
  } catch (error: any) {
    console.error("[Comment API GET] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
