import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/hr/employees/crm
 *
 * Trả về danh sách nhân viên có quyền CRM.
 * Query từ phía User (permissions LIKE '%"crm"%') → không bỏ sót trường hợp
 * Employee.userId chưa được gán.
 *
 * Response bổ sung:
 *   currentUserEmployeeId — Employee.id của người đang đăng nhập (để auto-select)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = session.user.id;
  const sessionUserEmail = session.user.email;

  // ── 1. Tìm tất cả User có quyền CRM ────────────────────────────────────────
  const usersWithCrm = await prisma.user.findMany({
    where: {
      permissions: { contains: '"crm"' },
    },
    select: {
      id: true,
      name: true,
      email: true,
      employee: {
        select: {
          id: true,
          fullName: true,
          status: true,
          workEmail: true,
        },
      },
    },
  });

  // ── 2. Xây dựng danh sách + tự fix liên kết userId nếu thiếu ──────────────
  const result: { id: string; fullName: string }[] = [];
  const seen = new Set<string>(); // tránh duplicate

  for (const u of usersWithCrm) {
    let empId: string | null = null;
    let empName: string | null = null;

    if (u.employee && u.employee.status === "active") {
      // Có Employee liên kết trực tiếp và đang active
      empId = u.employee.id;
      empName = u.employee.fullName;
    } else if (!u.employee) {
      // Chưa có Employee liên kết → thử tìm qua workEmail (không yêu cầu userId: null)
      const empByEmail = await prisma.employee.findFirst({
        where: {
          workEmail: u.email,
          status: "active",
        },
        select: { id: true, fullName: true, userId: true },
      });

      if (empByEmail) {
        empId = empByEmail.id;
        empName = empByEmail.fullName;

        // Tự động gán userId nếu chưa được set
        if (!empByEmail.userId) {
          await prisma.employee.update({
            where: { id: empByEmail.id },
            data: { userId: u.id },
          }).catch(() => { /* bỏ qua nếu conflict */ });
        }
      } else {
        console.warn(`[/api/hr/employees/crm] User có CRM nhưng không có Employee: ${u.email}`);
      }
    }

    if (empId && empName && !seen.has(empId)) {
      seen.add(empId);
      result.push({ id: empId, fullName: empName });
    }
  }

  // Sắp xếp A→Z theo tên
  result.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  // ── 3. Xác định Employee.id của người đang đăng nhập ──────────────────────
  // Ưu tiên: employeeId trong session (nếu đã được gán lúc đăng nhập)
  // Fallback: tìm Employee có workEmail = session.user.email
  let currentUserEmployeeId: string | null = session.user.employeeId ?? null;

  if (!currentUserEmployeeId && sessionUserEmail) {
    const myEmp = await prisma.employee.findFirst({
      where: { workEmail: sessionUserEmail, status: "active" },
      select: { id: true },
    });
    currentUserEmployeeId = myEmp?.id ?? null;

    // Nếu tìm được → gán userId để lần sau có ngay trong session (sau khi re-login)
    if (myEmp) {
      await prisma.employee.update({
        where: { id: myEmp.id },
        data: { userId: sessionUserId },
      }).catch(() => { });
    }
  }

  return NextResponse.json({
    employees: result,
    total: result.length,
    currentUserEmployeeId,
  });
}
