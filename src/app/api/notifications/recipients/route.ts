import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: trả về danh sách phòng ban + users để dùng trong UI tạo thông báo
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Lấy các phòng ban có nhân viên
  const employees = await prisma.employee.findMany({
    select: { departmentCode: true, departmentName: true },
    distinct: ["departmentCode"],
    orderBy: { departmentName: "asc" },
  });

  // Lấy danh sách users (kèm tên nhân viên nếu có)
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true,
      employee: { select: { fullName: true, position: true, departmentName: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    departments: employees.map(e => ({ code: e.departmentCode, name: e.departmentName })),
    users: users.map(u => ({
      id:         u.id,
      name:       u.employee?.fullName || u.name || u.email,
      email:      u.email,
      position:   u.employee?.position   || null,
      department: u.employee?.departmentName || null,
    })),
  });
}
