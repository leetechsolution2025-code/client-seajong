import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
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

    // Lấy thông tin cấu trúc các cột của bảng trong SQLite
    const columns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);

    // Lấy tối đa 100 bản ghi đầu tiên/mới nhất để hiển thị
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 100`);

    // Chuyển đổi dữ liệu kiểu BigInt sang String để tránh lỗi khi chuyển sang JSON
    const serializedRows = JSON.parse(
      JSON.stringify(rows, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({
      columns: columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        pk: col.pk === 1,
        notnull: col.notnull === 1,
      })),
      rows: serializedRows,
    });
  } catch (error: any) {
    console.error(`Error fetching table data:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    // Check if we are deleting a specific row
    const { searchParams } = new URL(req.url);
    const rowId = searchParams.get("id");

    if (rowId !== null) {
      // Find the primary key column dynamically
      const columns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
      const pkColumn = columns.find(col => col.pk === 1)?.name || "id";

      // Phân tách danh sách ID được gửi lên cách nhau bởi dấu phẩy
      const ids = rowId.split(",").map(id => id.trim()).filter(Boolean);

      if (ids.length === 1) {
        // Xoá 1 bản ghi
        await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}" WHERE "${pkColumn}" = ?`, ids[0]);
      } else if (ids.length > 1) {
        // Xoá hàng loạt sử dụng mệnh đề IN với tham số bảo mật
        const placeholders = ids.map(() => "?").join(", ");
        await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}" WHERE "${pkColumn}" IN (${placeholders})`, ...ids);
      }
      return NextResponse.json({ success: true, message: `Successfully deleted rows from ${tableName}` });
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
    console.error(`Error deleting table:`, error);
    
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
