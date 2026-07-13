import fs from 'fs';
let content = fs.readFileSync('src/app/api/seajong/sync/route.ts', 'utf-8');

// Add DELETE method for cancelling sync
if (!content.includes("export async function DELETE()")) {
    const deleteMethod = `
export async function DELETE() {
  try {
    const log = await prisma.seajongSyncLog.findFirst({ orderBy: { startedAt: "desc" } });
    if (log && log.status === "running") {
      await prisma.seajongSyncLog.update({
        where: { id: log.id },
        data: { status: "error", message: "Đã huỷ bởi người dùng", finishedAt: new Date() }
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, message: "Không có tiến trình nào đang chạy" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg });
  }
}
`;
    content = content.replace("export async function POST() {", deleteMethod + "\nexport async function POST() {");
}

// Add check inside syncAll to break if cancelled
const checkCode = `
      // Check if cancelled
      const currentLog = await prisma.seajongSyncLog.findUnique({ where: { id: logId } });
      if (currentLog?.status === "error" || currentLog?.status === "cancelled") {
        console.log("Sync cancelled.");
        return;
      }
`;
if (!content.includes("Sync cancelled.")) {
    content = content.replace(
        "const rawProducts: any[] = await res.json();", 
        checkCode + "\n      const rawProducts: any[] = await res.json();"
    );
}

fs.writeFileSync('src/app/api/seajong/sync/route.ts', content);
