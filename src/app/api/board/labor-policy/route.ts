import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policies = await (prisma as any).laborPolicy.findMany();
    
    // Lấy danh sách địa điểm làm việc từ danh mục (nới lỏng lọc clientId để tránh bị trống)
    const workplaces = await (prisma as any).category.findMany({
      where: { 
        type: 'dia_diem_lam_viec', 
        isActive: true,
        OR: [
          { clientId: session.user.clientId },
          { clientId: null },
          { clientId: "default" }
        ]
      }
    });

    // Trả về dữ liệu dựa trên danh mục địa điểm làm việc
    const branches = await Promise.all(workplaces.map(async (wp: any) => {
      // Lấy cấu hình mạng (IP công cộng) đang lưu tạm ở bảng branch
      const config = await (prisma as any).branch.findUnique({
        where: { id: wp.id },
        select: { wifiIp: true }
      });

      const subnets = await (prisma as any).branchSubnet.findMany({
        where: { branchId: wp.id }
      });

      return {
        id: wp.id,
        code: wp.code,
        name: wp.name,
        wifiIp: config?.wifiIp || null,
        subnets
      };
    }));

    return NextResponse.json({ policies, branches });
  } catch (error: any) {
    console.error("GET Labor Policy Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, title, content, isActive, branchConfig } = body;

    if (branchConfig) {
      const { id, wifiIp } = branchConfig;
      await (prisma as any).branch.upsert({
        where: { id },
        update: {
          wifiIp,
        },
        create: {
          id,
          code: `WP-${id.substring(0, 5)}`,
          name: "Workplace",
          wifiIp,
          clientId: session.user.clientId || "default"
        }
      });
      return NextResponse.json({ success: true });
    }

    const policy = await (prisma as any).laborPolicy.upsert({
      where: { 
        clientId_type: { 
          clientId: session.user.clientId || "default", 
          type 
        } 
      },
      update: { title, content, isActive },
      create: { 
        clientId: session.user.clientId || "default", 
        type, title, content, isActive 
      },
    });

    // Tự động cập nhật bảng chấm công nếu là quy định nghỉ lễ
    if (type === "holiday_regulation" && content) {
      try {
        const parsedContent = JSON.parse(content);
        // Lấy tất cả nhân viên đang hoạt động
        const employees = await (prisma as any).employee.findMany({
          where: { status: "active", clientId: session.user.clientId || "default" },
          select: { id: true }
        });

        if (employees.length > 0) {
          // Duyệt qua từng năm trong cấu hình
          for (const year in parsedContent) {
            const holidays = parsedContent[year];
            for (const holiday of holidays) {
              const start = new Date(holiday.startDate);
              const end = new Date(holiday.endDate);
              
              // Duyệt qua từng ngày trong khoảng startDate -> endDate
              let current = new Date(start);
              while (current <= end) {
                const dateToUpdate = new Date(current);
                dateToUpdate.setHours(0, 0, 0, 0);

                // Cập nhật cho tất cả nhân viên
                await Promise.all(employees.map((emp: any) => 
                  (prisma as any).attendance.upsert({
                    where: {
                      employeeId_date: {
                        employeeId: emp.id,
                        date: dateToUpdate
                      }
                    },
                    update: { status: "L", note: holiday.name },
                    create: {
                      employeeId: emp.id,
                      date: dateToUpdate,
                      status: "L",
                      note: holiday.name
                    }
                  })
                ));

                current.setDate(current.getDate() + 1);
              }
            }
          }
        }
      } catch (parseError) {
        console.error("Error updating holiday attendance:", parseError);
      }
    }

    return NextResponse.json(policy);
  } catch (error: any) {
    console.error("POST Labor Policy Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
