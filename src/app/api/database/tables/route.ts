import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get list of tables in SQLite
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name != '_prisma_migrations'
    `);

    const result = [];

    // Get count for each table
    for (const table of tables) {
      const tableName = table.name;
      try {
        const countResult: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${tableName}"`);
        // The count is a BigInt or Number depending on driver, so we safely convert it to Number
        const count = Number(countResult[0]?.count || 0);
        result.push({ name: tableName, count });
      } catch (err) {
        console.error(`Error counting table ${tableName}`, err);
        result.push({ name: tableName, count: 0, error: true });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/database/tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
