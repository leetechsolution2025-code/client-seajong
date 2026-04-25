import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Lấy danh sách Employee (có kèm User)
  const employees = await prisma.employee.findMany({
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(employees);
}

/** Sinh mã nhân viên: {shortName}-{YYYYMMDD}-{random4} */
function genEmployeeCode(shortName: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${shortName.toUpperCase()}-${date}-${rand}`;
}

/** Chuyển họ tên tiếng Việt → username không dấu, ghép liền nhau
 * VD: "Nguyễn Văn A" → "nguyenvana", "Trần Thị Bình" → "tranthibinh"
 */
function nameToUsername(fullName: string): string {
  const map: Record<string, string> = {
    à:"a",á:"a",ả:"a",ã:"a",ạ:"a",
    ă:"a",ằ:"a",ắ:"a",ẳ:"a",ẵ:"a",ặ:"a",
    â:"a",ầ:"a",ấ:"a",ẩ:"a",ẫ:"a",ậ:"a",
    è:"e",é:"e",ẻ:"e",ẽ:"e",ẹ:"e",
    ê:"e",ề:"e",ế:"e",ể:"e",ễ:"e",ệ:"e",
    ì:"i",í:"i",ỉ:"i",ĩ:"i",ị:"i",
    ò:"o",ó:"o",ỏ:"o",õ:"o",ọ:"o",
    ô:"o",ồ:"o",ố:"o",ổ:"o",ỗ:"o",ộ:"o",
    ơ:"o",ờ:"o",ớ:"o",ở:"o",ỡ:"o",ợ:"o",
    ù:"u",ú:"u",ủ:"u",ũ:"u",ụ:"u",
    ư:"u",ừ:"u",ứ:"u",ử:"u",ữ:"u",ự:"u",
    ỳ:"y",ý:"y",ỷ:"y",ỹ:"y",ỵ:"y",
    đ:"d",
  };
  const normalize = (s: string) =>
    s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z0-9]/g, "");
  // ghép tất cả các từ liền nhau
  return fullName.trim().split(/\s+/).map(normalize).join("");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      fullName, workEmail, password,
      phone, departmentCode, departmentName, position,
      gender, birthDate, level, employeeType, startDate,
      branchCode, clientId,
    } = body;

    if (!fullName?.trim())    return NextResponse.json({ error: "Họ tên không được để trống" }, { status: 400 });
    if (!workEmail?.trim())   return NextResponse.json({ error: "Email không được để trống" }, { status: 400 });
    if (!departmentCode?.trim()) return NextResponse.json({ error: "Phòng ban không được để trống" }, { status: 400 });
    if (!position?.trim())    return NextResponse.json({ error: "Chức vụ không được để trống" }, { status: 400 });

    // Lấy thông tin công ty để lấy shortName cho mã NV
    const company = await prisma.companyInfo.findFirst({ select: { shortName: true } });
    const shortName = company?.shortName ?? "emp";

    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.hash(password || "Pass@123", 12);

    // Lấy tên phòng ban nếu chưa truyền
    let resolvedDeptName = departmentName?.trim() || "";
    if (!resolvedDeptName && departmentCode) {
      const dept = await prisma.departmentCategory.findUnique({
        where: { code: departmentCode },
        select: { nameVi: true },
      });
      resolvedDeptName = dept?.nameVi ?? departmentCode;
    }

    // Resolve clientId: nếu không truyền, lấy từ session hoặc client đầu tiên
    let resolvedClientId = clientId ?? (session.user as any)?.clientId ?? null;
    if (!resolvedClientId) {
      const firstClient = await prisma.client.findFirst({ select: { id: true } });
      resolvedClientId = firstClient?.id ?? null;
    }

    // Tạo User + Employee trong 1 transaction
    const result = await prisma.$transaction(async (tx) => {
      // Tạo user account
      const user = await tx.user.create({
        data: {
          email:    workEmail.trim(),
          password: hashed,
          name:     fullName.trim(),
          role:     "USER",
          clientId: resolvedClientId,
        },
      });

      // Tạo employee record
      const employee = await tx.employee.create({
        data: {
          code:           genEmployeeCode(shortName),
          fullName:       fullName.trim(),
          workEmail:      workEmail.trim(),
          phone:          phone?.trim()          || null,
          gender:         gender                  || "male",
          birthDate:      birthDate ? new Date(birthDate) : null,
          departmentCode: departmentCode.trim(),
          departmentName: resolvedDeptName,
          position:       position.trim(),
          level:          level                   || "staff",
          employeeType:   employeeType            || "official",
          startDate:      startDate ? new Date(startDate) : null,
          branchCode:     branchCode?.trim()      || null,
          status:         "active",
          clientId:       resolvedClientId,
          userId:         user.id,
        },
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      return employee;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      const field = e.meta?.target?.join(", ") ?? "email";
      return NextResponse.json({ error: `${field} đã tồn tại trong hệ thống` }, { status: 409 });
    }
    console.error("[POST /api/company/employees]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
