import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const department = searchParams.get("department") ?? "";
  const status = searchParams.get("status") ?? "";
  const level = searchParams.get("level") ?? "";
  const permission = searchParams.get("permission") ?? ""; // e.g. "crm"
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "12");
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    ...(search
      ? {
        OR: [
          { fullName: { contains: search } },
          { workEmail: { contains: search } },
          { code: { contains: search } },
          { position: { contains: search } },
          { departmentName: { contains: search } },
        ],
      }
      : {}),
    ...(department ? { departmentCode: department } : {}),
    ...(status ? { status } : {}),
    ...(level ? { level } : {}),
    // Filter by permission: chỉ giữ nhân viên có User account với quyền tương ứng
    // SQLite không hỗ trợ JSON query native → dùng string contains trên trường permissions
    ...(permission
      ? {
          user: {
            permissions: { contains: `"${permission}"` },
          },
        }
      : {}),
  };

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  // Lấy toàn bộ phòng ban từ DepartmentCategory
  const departments = await prisma.departmentCategory.findMany({
    where: { isActive: true },
    select: { code: true, nameVi: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    employees,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    departments: departments.map((d) => ({
      code: d.code,
      name: d.nameVi,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Required fields ────────────────────────────────────────────────────────
  const code = String(body.code ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();
  const workEmail = String(body.workEmail ?? "").trim();
  const departmentCode = String(body.departmentCode ?? "").trim();
  const departmentName = String(body.departmentName ?? "").trim();
  const position = String(body.position ?? "").trim();

  if (!code || !fullName || !workEmail || !departmentCode || !departmentName || !position) {
    return NextResponse.json(
      { error: "Thiếu trường bắt buộc: code, fullName, workEmail, departmentCode, departmentName, position" },
      { status: 422 }
    );
  }

  // ── Duplicate check ────────────────────────────────────────────────────────
  const existing = await prisma.employee.findFirst({
    where: { OR: [{ code }, { workEmail }] },
    select: { code: true, workEmail: true },
  });
  if (existing) {
    const dup = existing.code === code ? `mã nhân viên "${code}"` : `email công ty "${workEmail}"`;
    return NextResponse.json({ error: `Đã tồn tại nhân viên với ${dup}` }, { status: 409 });
  }

  // ── Check email trùng trong bảng User ─────────────────────────────────────
  const existingUser = await prisma.user.findUnique({ where: { email: workEmail }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ error: `Email công ty "${workEmail}" đã được dùng bởi tài khoản khác` }, { status: 409 });
  }

  const toDate = (v: unknown) => {
    if (!v) return null;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
  };
  const toFloat = (v: unknown) => {
    const n = parseFloat(v as string);
    return isNaN(n) ? null : n;
  };
  const toInt = (v: unknown, fallback = 0) => {
    const n = parseInt(v as string);
    return isNaN(n) ? fallback : n;
  };
  const toStr = (v: unknown) => (v ? String(v).trim() : null);

  // ── Mật khẩu tạm cố định cho tất cả nhân viên mới ─────────────────────────
  const tempPassword = "Pass@123";
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // ── Map level → User role ─────────────────────────────────────────────────
  const levelToRole: Record<string, string> = {
    senior_manager: "ADMIN",
    mid_manager: "USER",
    staff: "USER",
  };
  const userRole = levelToRole[String(body.level ?? "staff")] ?? "USER";

  try {
    // ── Tạo User + Employee trong 1 transaction ────────────────────────────
    const { employee } = await prisma.$transaction(async (tx) => {
      // 1. Tạo User account
      const user = await tx.user.create({
        data: {
          email: workEmail,
          password: hashedPassword,
          name: fullName,
          role: userRole,
        },
      });

      // 2. Tạo Employee và gắn userId
      const employee = await tx.employee.create({
        data: {
          // ── Định danh
          branchCode: toStr(body.branchCode),
          code,
          fullName,
          gender: String(body.gender ?? "male"),
          birthDate: toDate(body.birthDate),
          nationalId: toStr(body.nationalId),
          nationalIdDate: toDate(body.nationalIdDate),
          nationalIdPlace: toStr(body.nationalIdPlace),
          permanentAddress: toStr(body.permanentAddress),
          currentAddress: toStr(body.currentAddress),
          phone: toStr(body.phone),
          workEmail,
          personalEmail: toStr(body.personalEmail),
          emergencyName: toStr(body.emergencyName),
          emergencyRelation: toStr(body.emergencyRelation),
          emergencyPhone: toStr(body.emergencyPhone),
          // ── Công việc
          departmentCode,
          departmentName,
          position,
          level: toStr(body.level) || "staff",
          manager: toStr(body.manager),
          employeeType: toStr(body.employeeType) || "official",
          startDate: toDate(body.startDate),
          workLocation: toStr(body.workLocation) || "main",
          // ── Hợp đồng & Pháp lý
          contractType: toStr(body.contractType) || "unsigned",
          contractNumber: toStr(body.contractNumber),
          contractSignDate: toDate(body.contractSignDate),
          contractEndDate: toDate(body.contractEndDate),
          profileStatus: String(body.profileStatus ?? "pending"),
          socialInsuranceNumber: toStr(body.socialInsuranceNumber),
          taxCode: toStr(body.taxCode),
          // ── Lương & Phúc lợi
          baseSalary: toFloat(body.baseSalary),
          mealAllowance: toFloat(body.mealAllowance),
          fuelAllowance: toFloat(body.fuelAllowance),
          phoneAllowance: toFloat(body.phoneAllowance),
          seniorityAllowance: toFloat(body.seniorityAllowance),
          bankAccount: toStr(body.bankAccount),
          bankName: toStr(body.bankName),
          bankBranch: toStr(body.bankBranch),
          dependents: toInt(body.dependents, 0),
          // ── Kỹ năng
          skills: toStr(body.skills),
          softSkills: toStr(body.softSkills),
          education: toStr(body.education),
          certifications: toStr(body.certifications),
          // ── Chuyên cần
          annualLeave: toInt(body.annualLeave, 12),
          workShift: toStr(body.workShift) || "standard",
          notes: toStr(body.notes),
          // ── System
          status: "active",
          userId: user.id,
        },
      });

      return { employee, user };
    });

    return NextResponse.json(
      {
        employee,
        tempPassword,
        loginEmail: workEmail,
        message: "Tạo nhân viên và tài khoản đăng nhập thành công",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/hr/employees]", err);
    return NextResponse.json({ error: "Lỗi máy chủ, vui lòng thử lại." }, { status: 500 });
  }
}
