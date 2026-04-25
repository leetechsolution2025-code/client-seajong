import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return new NextResponse(null, { status: 404 });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    select: { logoUrl: true, name: true },
  });

  if (!client?.logoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  // Nếu là data URL (base64), parse và trả về image stream
  const dataUrlMatch = client.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1];
    const buffer = Buffer.from(dataUrlMatch[2], "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Nếu là URL thường, redirect
  return NextResponse.redirect(client.logoUrl);
}
