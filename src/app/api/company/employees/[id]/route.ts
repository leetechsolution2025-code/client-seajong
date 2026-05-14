import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── PUT /api/company/employees/[id] — Cập nhật nhân viên ─────────────────────
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const body = await req.json();
    const { fullName, phone, departmentCode, position, gender, employeeType, level, status } = body;

    if (!fullName?.trim()) return NextResponse.json({ error: "Họ tên không được để trống" }, { status: 400 });
    if (!departmentCode?.trim()) return NextResponse.json({ error: "Phòng ban không được để trống" }, { status: 400 });
    if (!position?.trim()) return NextResponse.json({ error: "Chức vụ không được để trống" }, { status: 400 });

    // Lấy tên phòng ban
    let departmentName = "";
    const dept = await prisma.departmentCategory.findUnique({
      where: { code: departmentCode },
      select: { nameVi: true },
    });
    departmentName = dept?.nameVi ?? departmentCode;

    // Cập nhật Employee
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        departmentCode: departmentCode.trim(),
        departmentName,
        position: position.trim(),
        gender: gender || "male",
        employeeType: employeeType || "official",
        level: level || "staff",
        status: status || "active",
      },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    // Đồng bộ name trên User account
    if (employee.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { name: fullName.trim() },
      }).catch(() => { });
    }

    return NextResponse.json(employee);
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
    console.error("[PUT /api/company/employees/[id]]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── DELETE /api/company/employees/[id] — Xóa nhân viên ───────────────────────
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    // Tìm employee để biết userId
    const emp = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, userId: true, fullName: true },
    });
    if (!emp) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

    // Không cho phép tự xóa chính mình
    const myEmp = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (myEmp?.id === id)
      return NextResponse.json({ error: "Không thể xóa tài khoản của chính mình" }, { status: 400 });

    // Xóa Employee (userId sẽ được set null trước để tránh FK constraint)
    await prisma.$transaction(async (tx) => {
      // Gỡ liên kết userId trước
      await tx.employee.update({ where: { id }, data: { userId: null } });
      // Xóa User nếu có
      if (emp.userId) {
        await tx.user.delete({ where: { id: emp.userId } }).catch(() => { });
      }
      // Xóa Employee
      await tx.employee.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
    console.error("[DELETE /api/company/employees/[id]]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
