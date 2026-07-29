import os

files = [
"src/app/(dashboard)/hr/stationery/page.tsx",
"src/app/(dashboard)/production/bom/page.tsx",
"src/components/plan-finance/kho_hang/LichSuNhapKhoOffcanvas.tsx",
"src/components/plan-finance/kho_hang/LichSuXuatKhoOffcanvas.tsx",
"src/components/plan-finance/kho_hang/XuatKhoModal.tsx",
"src/components/plan-finance/kho_hang/LuanChuyenKhoModal.tsx",
"src/components/plan-finance/kho_hang/TaoMoiHangHoa.tsx",
"src/components/plan-finance/kho_hang/NhapKhoModal.tsx",
"src/components/plan-finance/ban_hang/TaoHoaDonBanLe.tsx",
"src/components/plan-finance/bao_gia/BaoGiaSanitaryModal.tsx",
"src/components/plan-finance/bao_gia/TaoDonHangModal.tsx",
"src/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal.tsx",
"src/components/plan-finance/mua_hang/TaoDonMuaHangTrucTiepModal.tsx",
"src/components/plan-finance/mua_hang/TaoDonMuaHangModal.tsx",
"src/components/plan-finance/khach_hang/ThemKetQuaChamSocModal.tsx",
"src/components/logistics/inventory/LogisticsSerial.tsx",
"src/components/logistics/inventory/LogisticsAuditLogs.tsx"
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # Check if there is a 'limit=' that fetches data for a table
    # Simple heuristic: if it renders <Table or <table
    if '<Table' in content or '<table' in content:
        print(f"Table found in: {file}")
