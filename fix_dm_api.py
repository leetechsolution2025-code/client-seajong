with open("src/app/api/plan-finance/inventory/[id]/dinhmuc/route.ts", "r") as f:
    content = f.read()

# Fix the first update
content = content.replace("/* where: { id }, data: { dinhMucId } });", "")
content = content.replace("/*", "")

# Fix the delete part
content = content.replace("if (!item?.dinhMucId) return NextResponse.json({ ok: true });", "if (!item?.dinhMucs || item.dinhMucs.length === 0) return NextResponse.json({ ok: true });")
content = content.replace("await prisma.dinhMuc.delete({ where: { id: item.dinhMucId } });", "await prisma.dinhMuc.delete({ where: { id: item.dinhMucs[0].id } });")
content = content.replace("/* where: { id }, data: { dinhMucId: null } });", "")

with open("src/app/api/plan-finance/inventory/[id]/dinhmuc/route.ts", "w") as f:
    f.write(content)

