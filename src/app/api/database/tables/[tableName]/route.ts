import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tableName } = await params;

    if (!tableName || tableName.includes('"') || tableName.includes("'")) {
       return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    // Execute DELETE statement to remove all rows
    await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
    
    // Attempt to reset auto-increment if table exists in sqlite_sequence
    try {
       await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);
    } catch(e) {
       // Ignore if sqlite_sequence doesn't exist or table is not in it
    }

    return NextResponse.json({ success: true, message: `Successfully cleared table ${tableName}` });
  } catch (error: any) {
    console.error(`Error deleting table ${params?.tableName}:`, error);
    
    // Handle foreign key constraint error specifically
    if (error.message?.includes("FOREIGN KEY constraint failed")) {
      return NextResponse.json(
        { error: "Không thể xoá vì có dữ liệu ở bảng khác đang liên kết (Foreign Key Constraint)." },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
