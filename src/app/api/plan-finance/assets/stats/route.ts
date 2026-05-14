import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [all, byLoai, byTrangThai] = await Promise.all([
      // Tổng hợp toàn bộ tài sản đang sử dụng
      prisma.asset.aggregate({
        _count: { id: true },
        _sum: { giaTriMua: true, giaTriConLai: true },
        where: { trangThai: "dang-su-dung" },
      }),
      // Phân bổ theo loại (tất cả trạng thái)
      prisma.asset.groupBy({
        by: ["loai"],
        _count: { id: true },
        _sum: { giaTriMua: true, giaTriConLai: true },
      }),
      // Phân bổ theo trạng thái
      prisma.asset.groupBy({
        by: ["trangThai"],
        _count: { id: true },
      }),
    ]);

    // Tính tổng khấu hao tháng từ các tài sản đang sử dụng
    const activeAssets = await prisma.asset.findMany({
      where: { trangThai: "dang-su-dung" },
      select: { giaTriMua: true, soThangKhauHao: true },
    });
    // Tính khấu hao tháng = nguyên giá / thời gian khấu hao (tháng)
    const khauHaoThang = activeAssets.reduce((s, a) => {
      const thang = a.soThangKhauHao || 0;
      if (!thang || !a.giaTriMua) return s;
      return s + a.giaTriMua / thang;
    }, 0);

    // Tổng tài sản (mọi trạng thái)
    const tongTaiSan = await prisma.asset.count();

    // ── Label maps ──────────────────────────────────────────────────────────────
    const LOAI_LIST = [
      { value: "nha-cua-vat-kien-truc",  label: "Nhà cửa, vật kiến trúc" },
      { value: "may-moc-thiet-bi",       label: "Máy móc, thiết bị" },
      { value: "phuong-tien-van-tai",    label: "Phương tiện vận tải" },
      { value: "thiet-bi-van-phong",     label: "Thiết bị văn phòng" },
      { value: "huu-hinh-khac",          label: "Hữu hình khác" },
      { value: "quyen-su-dung-dat",      label: "Quyền sử dụng đất" },
      { value: "phan-mem-may-tinh",      label: "Phần mềm máy tính" },
      { value: "ban-quyen-bang-sang-che",label: "Bản quyền, bằng sáng chế" },
      { value: "nhan-hieu-thuong-mai",   label: "Nhãn hiệu thương mại" },
      { value: "vo-hinh-khac",           label: "Vô hình khác" },
    ];
    const TT_LIST = [
      { value: "dang-su-dung", label: "Đang sử dụng" },
      { value: "bao-duong",    label: "Bảo dưỡng" },
      { value: "hong",         label: "Hỏng" },
      { value: "thanh-ly",     label: "Thanh lý" },
    ];

    const loaiMap = Object.fromEntries(
      byLoai.map(r => [r.loai ?? "khac", { count: r._count.id, giaTriMua: r._sum.giaTriMua ?? 0 }])
    );
    const ttMap = Object.fromEntries(byTrangThai.map(r => [r.trangThai, r._count.id]));

    const byLoaiChart  = LOAI_LIST.map(({ value, label }) => ({
      label, value: loaiMap[value]?.count ?? 0,
    }));
    const byStatusChart = TT_LIST.map(({ value, label }) => ({
      label, value: ttMap[value] ?? 0,
    }));

    return NextResponse.json({
      tongTaiSan,
      tongDangSuDung: all._count.id,
      tongNguyenGia:  all._sum.giaTriMua    ?? 0,
      tongConLai:     all._sum.giaTriConLai ?? 0,
      khauHaoThang,
      khauHaoNam:     khauHaoThang * 12,
      byLoaiChart,
      byStatusChart,
    });
  } catch (e: unknown) {
    console.error("[GET /assets/stats]", e);
    return NextResponse.json({
      tongTaiSan: 0, tongDangSuDung: 0,
      tongNguyenGia: 0, tongConLai: 0,
      khauHaoThang: 0, khauHaoNam: 0,
      byLoaiChart: [], byStatusChart: [],
    });
  }
}
