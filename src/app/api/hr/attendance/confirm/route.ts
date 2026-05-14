import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { employeeId, month, year } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { db } = await import("@/lib/prisma");

    // Upsert confirmation
    await (db as any).attendanceConfirmation.upsert({
      where: {
        employeeId_month_year: {
          employeeId,
          month: Number(month),
          year: Number(year)
        }
      },
      update: {
        confirmedAt: new Date()
      },
      create: {
        employeeId,
        month: Number(month),
        year: Number(year),
        confirmedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Confirm Attendance API Error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
