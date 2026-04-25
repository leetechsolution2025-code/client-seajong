import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/plan-finance/approvers
 * Trả về danh sách users có quyền approve_budget (người có thể phê duyệt báo giá)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { role: { not: "SUPERADMIN" } },
      select: {
        id:          true,
        name:        true,
        email:       true,
        permissions: true,
        employee: {
          select: {
            fullName:       true,
            position:       true,
            departmentName: true,
          },
        },
      },
    });

    // Lọc chỉ lấy user có quyền approve_budget
    const approvers = users
      .filter(u => {
        try {
          const perms: string[] = JSON.parse(u.permissions ?? "[]");
          return perms.includes("approve_budget");
        } catch {
          return false;
        }
      })
      .map(u => ({
        id:             u.id,
        name:           u.employee?.fullName ?? u.name ?? u.email,
        position:       u.employee?.position ?? "",
        departmentName: u.employee?.departmentName ?? "",
        email:          u.email,
      }));

    return NextResponse.json({ approvers });
  } catch (e: unknown) {
    console.error("[GET /api/plan-finance/approvers]", e);
    return NextResponse.json({ approvers: [] });
  }
}
