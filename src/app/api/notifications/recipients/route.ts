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

  const departmentCats = await prisma.departmentCategory.findMany({
    select: { id: true, code: true }
  });
  const deptMap = new Map(departmentCats.map(d => [d.code ? d.code.toLowerCase() : "", d.id]));

  // Lấy danh sách users (kèm tên nhân viên nếu có) và lọc bỏ nhân viên đã nghỉ việc
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { employee: null },
        { employee: { status: { not: "resigned" } } }
      ]
    },
    select: {
      id: true, name: true, email: true,
      employee: {
        select: {
          fullName: true,
          position: true,
          departmentName: true,
          baseSalary: true,
          mealAllowance: true,
          fuelAllowance: true,
          phoneAllowance: true,
          seniorityAllowance: true,
        }
      },
    },
    orderBy: { name: "asc" },
  });

  // Lấy danh sách vị trí để giải mã mã vị trí thành tên đầy đủ
  const positions = await prisma.category.findMany({
    where: { type: "position" },
    select: { code: true, name: true }
  });
  const positionMap = new Map(positions.map(p => [p.code, p.name]));

  return NextResponse.json({
    departments: employees.map(e => ({
      id: e.departmentCode ? deptMap.get(e.departmentCode.toLowerCase()) : null,
      code: e.departmentCode,
      name: e.departmentName
    })),
    users: users.map(u => ({
      id:         u.id,
      name:       u.employee?.fullName || u.name || u.email,
      email:      u.email,
      position:   u.employee?.position ? (positionMap.get(u.employee.position) || u.employee.position) : null,
      department: u.employee?.departmentName || null,
      baseSalary: u.employee?.baseSalary || 0,
      mealAllowance: u.employee?.mealAllowance || 0,
      fuelAllowance: u.employee?.fuelAllowance || 0,
      phoneAllowance: u.employee?.phoneAllowance || 0,
      seniorityAllowance: u.employee?.seniorityAllowance || 0,
    })),
  });
}
