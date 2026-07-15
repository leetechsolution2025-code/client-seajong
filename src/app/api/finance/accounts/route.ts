import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const accounts = await (prisma as any).accountingAccount.findMany({
      orderBy: { code: 'asc' },
    });

    // Build tree
    const rootAccounts = accounts.filter((a: any) => !a.parentId);
    const buildTree = (parents: any[]): any[] => {
      return parents.map((parent) => {
        const children = accounts.filter((a: any) => a.parentId === parent.id);
        return {
          ...parent,
          children: children.length ? buildTree(children) : []
        };
      });
    };

    const tree = buildTree(rootAccounts);

    return NextResponse.json({ success: true, data: tree, flatData: accounts });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
