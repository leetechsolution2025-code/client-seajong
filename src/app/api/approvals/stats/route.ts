import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/approvals/stats ───────────────────────────────────────────────────
// Trả về số lượng hồ sơ chờ duyệt → dùng cho badge Topbar
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ pendingCount: 0, urgentCount: 0 });

    const userId = session.user.id as string;

    const [pendingCount, urgentCount] = await Promise.all([
      prisma.approvalRequest.count({
        where: {
          status: "pending",
          OR: [{ approverId: userId }, { approverId: null }],
        },
      }),
      prisma.approvalRequest.count({
        where: {
          status: "pending",
          priority: "urgent",
          OR: [{ approverId: userId }, { approverId: null }],
        },
      }),
    ]);

    return NextResponse.json({ pendingCount, urgentCount });
  } catch (e) {
    console.error("[GET /api/approvals/stats]", e);
    return NextResponse.json({ pendingCount: 0, urgentCount: 0 });
  }
}
