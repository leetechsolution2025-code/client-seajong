import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/approvals/[id]/comments ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const comments = await prisma.approvalComment.findMany({
      where: { requestId: id, parentId: null },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST /api/approvals/[id]/comments ─────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { content, parentId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
    }

    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

    const userId   = session.user.id as string;
    const userName = session.user.name || session.user.email || "Người dùng";

    // Xác định role
    let authorRole = "observer";
    if (request.requestedById === userId) authorRole = "requester";
    if (request.approverId === userId || request.approvedById === userId) authorRole = "approver";

    const comment = await prisma.approvalComment.create({
      data: {
        requestId:  id,
        authorId:   userId,
        authorName: userName as string,
        authorRole,
        content:    content.trim(),
        parentId:   parentId || null,
        isSystem:   false,
      },
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
