-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "slogan" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "taxCode" TEXT,
    "legalRep" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeajongCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "parent" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SeajongProduct" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "images" TEXT NOT NULL DEFAULT '[]',
    "specs" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SeajongSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "totalSynced" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "domain" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxCode" TEXT,
    "legalRep" TEXT,
    "slogan" TEXT,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "deptAccess" TEXT NOT NULL DEFAULT '[]',
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchCode" TEXT,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'male',
    "birthDate" DATETIME,
    "nationalId" TEXT,
    "nationalIdDate" DATETIME,
    "nationalIdPlace" TEXT,
    "permanentAddress" TEXT,
    "currentAddress" TEXT,
    "phone" TEXT,
    "workEmail" TEXT NOT NULL,
    "personalEmail" TEXT,
    "emergencyName" TEXT,
    "emergencyRelation" TEXT,
    "emergencyPhone" TEXT,
    "departmentCode" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'staff',
    "manager" TEXT,
    "employeeType" TEXT NOT NULL DEFAULT 'official',
    "startDate" DATETIME,
    "workLocation" TEXT NOT NULL DEFAULT 'main',
    "contractType" TEXT NOT NULL DEFAULT 'unsigned',
    "contractNumber" TEXT,
    "contractSignDate" DATETIME,
    "contractEndDate" DATETIME,
    "profileStatus" TEXT NOT NULL DEFAULT 'pending',
    "socialInsuranceNumber" TEXT,
    "taxCode" TEXT,
    "baseSalary" REAL,
    "mealAllowance" REAL,
    "fuelAllowance" REAL,
    "phoneAllowance" REAL,
    "seniorityAllowance" REAL,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "dependents" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT,
    "softSkills" TEXT,
    "education" TEXT,
    "certifications" TEXT,
    "annualLeave" INTEGER NOT NULL DEFAULT 12,
    "workShift" TEXT NOT NULL DEFAULT 'standard',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "clientId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nam" INTEGER NOT NULL,
    "thang" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "nguonChamCong" TEXT NOT NULL DEFAULT 'thu-cong',
    "ngayCong" REAL NOT NULL DEFAULT 0,
    "ngayNghiPhep" REAL NOT NULL DEFAULT 0,
    "ngayNghiKhac" REAL NOT NULL DEFAULT 0,
    "gioLamThem" REAL NOT NULL DEFAULT 0,
    "luongCoBan" REAL NOT NULL DEFAULT 0,
    "phuCap" REAL NOT NULL DEFAULT 0,
    "thuong" REAL NOT NULL DEFAULT 0,
    "luongLamThem" REAL NOT NULL DEFAULT 0,
    "khauTruBH" REAL NOT NULL DEFAULT 0,
    "thueTNCN" REAL NOT NULL DEFAULT 0,
    "khauTruKhac" REAL NOT NULL DEFAULT 0,
    "luongThucNhan" REAL NOT NULL DEFAULT 0,
    "chiPhiCtyDong" REAL NOT NULL DEFAULT 0,
    "tongChiPhiCty" REAL NOT NULL DEFAULT 0,
    "trangThai" TEXT NOT NULL DEFAULT 'chua-tra',
    "ngayTra" DATETIME,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DepartmentCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryTypeDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'bi-folder',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "prefix" TEXT NOT NULL DEFAULT 'CAT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxCode" TEXT,
    "legalRep" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "audienceType" TEXT NOT NULL DEFAULT 'all',
    "audienceValue" TEXT,
    "attachments" TEXT,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "senderId" TEXT NOT NULL,
    "clientId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageParticipant_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "nguon" TEXT,
    "nhom" TEXT,
    "daiDien" TEXT,
    "xungHo" TEXT DEFAULT 'Anh',
    "chucVu" TEXT,
    "dienThoai" TEXT,
    "email" TEXT,
    "ghiChu" TEXT,
    "nguoiChamSocId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_nguoiChamSocId_fkey" FOREIGN KEY ("nguoiChamSocId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerCareHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "nguoiChamSocId" TEXT,
    "ngayChamSoc" DATETIME NOT NULL,
    "hinhThuc" TEXT NOT NULL,
    "thaiDo" TEXT,
    "nhuCau" TEXT,
    "nganSach" TEXT,
    "thoiGianDauTu" TEXT,
    "thanhToan" TEXT,
    "nguoiDaiDien" TEXT,
    "soDienThoai" TEXT,
    "tomTat" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerCareHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerCareHistory_nguoiChamSocId_fkey" FOREIGN KEY ("nguoiChamSocId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "taxCode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "contactName" TEXT,
    "xungHo" TEXT,
    "hanMucNo" REAL NOT NULL DEFAULT 0,
    "danhGia" INTEGER NOT NULL DEFAULT 0,
    "trangThai" TEXT NOT NULL DEFAULT 'active',
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierCategory" (
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    PRIMARY KEY ("supplierId", "categoryId"),
    CONSTRAINT "SupplierCategory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "customerId" TEXT,
    "ngayDat" DATETIME,
    "ngayGiao" DATETIME,
    "trangThai" TEXT NOT NULL DEFAULT 'draft',
    "tongTien" REAL NOT NULL DEFAULT 0,
    "daThanhToan" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "nguoiPhuTrach" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "nguoiYeuCau" TEXT NOT NULL,
    "donVi" TEXT NOT NULL,
    "ngayTao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngayCanCo" DATETIME,
    "lyDo" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'chua-xu-ly',
    "ghiChu" TEXT,
    "clientId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseRequestId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "tenHang" TEXT NOT NULL,
    "donVi" TEXT,
    "soLuong" REAL NOT NULL DEFAULT 1,
    "donGiaDK" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "trangThaiXuLy" TEXT NOT NULL DEFAULT 'cho-xu-ly',
    "supplierId" TEXT,
    "purchaseOrderItemId" TEXT,
    CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequestItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequestItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequestItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "supplierId" TEXT,
    "purchaseRequestId" TEXT,
    "ngayDat" DATETIME,
    "ngayNhan" DATETIME,
    "trangThai" TEXT NOT NULL DEFAULT 'draft',
    "tongTien" REAL NOT NULL DEFAULT 0,
    "daThanhToan" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "tenHang" TEXT NOT NULL,
    "donVi" TEXT,
    "soLuong" REAL NOT NULL DEFAULT 1,
    "donGia" REAL NOT NULL DEFAULT 0,
    "thanhTien" REAL NOT NULL DEFAULT 0,
    "soLuongDaNhan" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenChiPhi" TEXT NOT NULL,
    "loai" TEXT,
    "soTien" REAL NOT NULL DEFAULT 0,
    "ngayChiTra" DATETIME,
    "nguoiChiTra" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'pending',
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loai" TEXT NOT NULL DEFAULT 'phai-thu',
    "doiTuong" TEXT NOT NULL,
    "soTien" REAL NOT NULL DEFAULT 0,
    "daThu" REAL NOT NULL DEFAULT 0,
    "hanThanhToan" DATETIME,
    "trangThai" TEXT NOT NULL DEFAULT 'chua-thu',
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "tenTaiSan" TEXT NOT NULL,
    "loai" TEXT,
    "ngayMua" DATETIME,
    "giaTriMua" REAL NOT NULL DEFAULT 0,
    "giaTriConLai" REAL NOT NULL DEFAULT 0,
    "khauHao" REAL NOT NULL DEFAULT 0,
    "trangThai" TEXT NOT NULL DEFAULT 'dang-su-dung',
    "viTri" TEXT,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "tenHang" TEXT NOT NULL,
    "loai" TEXT,
    "categoryId" TEXT,
    "donVi" TEXT DEFAULT 'cái',
    "soLuong" REAL NOT NULL DEFAULT 0,
    "soLuongMin" REAL NOT NULL DEFAULT 0,
    "giaNhap" REAL NOT NULL DEFAULT 0,
    "giaBan" REAL NOT NULL DEFAULT 0,
    "nhaCungCap" TEXT,
    "thongSoKyThuat" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'con-hang',
    "ghiChu" TEXT,
    "dinhMucId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_dinhMucId_fkey" FOREIGN KEY ("dinhMucId") REFERENCES "DinhMuc" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DinhMuc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "tenDinhMuc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DinhMucVatTu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dinhMucId" TEXT NOT NULL,
    "tenVatTu" TEXT NOT NULL,
    "soLuong" REAL NOT NULL DEFAULT 1,
    "donViTinh" TEXT,
    "ghiChu" TEXT,
    CONSTRAINT "DinhMucVatTu_dinhMucId_fkey" FOREIGN KEY ("dinhMucId") REFERENCES "DinhMuc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "soLuong" REAL NOT NULL DEFAULT 0,
    "soLuongMin" REAL NOT NULL DEFAULT 0,
    "viTriHang" TEXT,
    "viTriCot" TEXT,
    "viTriTang" TEXT,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryStock_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryItemId" TEXT NOT NULL,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "type" TEXT NOT NULL,
    "soLuong" REAL NOT NULL DEFAULT 0,
    "soLuongCT" REAL,
    "soLuongTruoc" REAL,
    "soLuongSau" REAL,
    "donGia" REAL,
    "lyDo" TEXT,
    "soChungTu" TEXT,
    "nguoiThucHien" TEXT,
    "purchaseOrderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "soChungTu" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'system',
    "warehouseId" TEXT,
    "nguoiKiem" TEXT,
    "ngayKiem" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ghiChu" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'nhap',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockCountLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockCountId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "soLuongHeTong" REAL NOT NULL DEFAULT 0,
    "soLuongThucTe" REAL,
    "chenh" REAL,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockCountLine_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "customerId" TEXT,
    "nguoiPhuTrachId" TEXT,
    "ngayBaoGia" DATETIME,
    "ngayHetHan" DATETIME,
    "trangThai" TEXT NOT NULL DEFAULT 'draft',
    "uuTien" TEXT NOT NULL DEFAULT 'medium',
    "tongTien" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "vat" REAL NOT NULL DEFAULT 0,
    "thanhTien" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quotation_nguoiPhuTrachId_fkey" FOREIGN KEY ("nguoiPhuTrachId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationNegotiation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "loai" TEXT NOT NULL DEFAULT 'call',
    "ngay" DATETIME NOT NULL,
    "nguoiThucHien" TEXT NOT NULL,
    "ketQua" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuotationNegotiation_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "tenHang" TEXT NOT NULL,
    "donVi" TEXT DEFAULT 'cái',
    "soLuong" REAL NOT NULL DEFAULT 1,
    "donGia" REAL NOT NULL DEFAULT 0,
    "thanhTien" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "customerId" TEXT,
    "nguoiPhuTrachId" TEXT,
    "quotationId" TEXT,
    "ngayKy" DATETIME,
    "ngayBatDau" DATETIME,
    "ngayKetThuc" DATETIME,
    "trangThai" TEXT NOT NULL DEFAULT 'pending',
    "uuTien" TEXT NOT NULL DEFAULT 'medium',
    "giaTriHopDong" REAL NOT NULL DEFAULT 0,
    "daThanhToan" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contract_nguoiPhuTrachId_fkey" FOREIGN KEY ("nguoiPhuTrachId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contract_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "tenKhach" TEXT,
    "dienThoai" TEXT,
    "diaChi" TEXT,
    "tongTien" REAL NOT NULL DEFAULT 0,
    "chietKhau" REAL NOT NULL DEFAULT 0,
    "vat" REAL NOT NULL DEFAULT 0,
    "tongCong" REAL NOT NULL DEFAULT 0,
    "hinhThucTT" TEXT NOT NULL DEFAULT 'cash',
    "tienKhachDua" REAL NOT NULL DEFAULT 0,
    "tienThua" REAL NOT NULL DEFAULT 0,
    "conNo" REAL NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'chua-xuat-hang',
    "nguoiBanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailInvoice_nguoiBanId_fkey" FOREIGN KEY ("nguoiBanId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "tenHang" TEXT NOT NULL,
    "dvt" TEXT NOT NULL DEFAULT 'cái',
    "soLuong" REAL NOT NULL DEFAULT 1,
    "donGia" REAL NOT NULL DEFAULT 0,
    "thanhTien" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "RetailInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "RetailInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailInvoiceItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlySalesSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "quotationCount" INTEGER NOT NULL DEFAULT 0,
    "quotationWon" INTEGER NOT NULL DEFAULT 0,
    "quotationLost" INTEGER NOT NULL DEFAULT 0,
    "contractCount" INTEGER NOT NULL DEFAULT 0,
    "contractActive" INTEGER NOT NULL DEFAULT 0,
    "contractDone" INTEGER NOT NULL DEFAULT 0,
    "contractOverdue" INTEGER NOT NULL DEFAULT 0,
    "contractValue" REAL NOT NULL DEFAULT 0,
    "contractPaid" REAL NOT NULL DEFAULT 0,
    "retailCount" INTEGER NOT NULL DEFAULT 0,
    "retailRevenue" REAL NOT NULL DEFAULT 0,
    "retailDebt" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigneeId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "deptCode" TEXT,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "threat" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Đang theo dõi',
    "lastScan" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "swot" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "newsHighlights" TEXT,
    "marketingActivity" TEXT,
    "dataSources" TEXT,
    "strategySuggestions" TEXT,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingAnnualPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "targetSegment" TEXT,
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "jobOverview" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rejectedReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startMonth" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "assignedTeam" TEXT NOT NULL DEFAULT 'all',
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingTheme_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingAnnualPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "themeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT,
    "format" TEXT,
    "targetMonth" INTEGER NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "kpi" TEXT,
    "assignedTeam" TEXT DEFAULT 'all',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingContent_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "MarketingTheme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingMonthlyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "team" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rejectedReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthlyPlanId" TEXT NOT NULL,
    "contentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" TEXT,
    "category" TEXT,
    "taskGroup" TEXT,
    "taskSubGroup" TEXT,
    "week1" BOOLEAN NOT NULL DEFAULT false,
    "week2" BOOLEAN NOT NULL DEFAULT false,
    "week3" BOOLEAN NOT NULL DEFAULT false,
    "week4" BOOLEAN NOT NULL DEFAULT false,
    "week1Content" TEXT,
    "week2Content" TEXT,
    "week3Content" TEXT,
    "week4Content" TEXT,
    "assigneeName" TEXT,
    "channel" TEXT,
    "format" TEXT,
    "deadline" DATETIME,
    "actualResult" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "budget" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingTask_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "MarketingMonthlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketingTask_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingTaskComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MarketingTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "parentId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerIsActive" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'all',
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileType" TEXT NOT NULL,
    "thumbnail" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingYearlyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ban-nhap',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "versionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "revisionData" TEXT,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    CONSTRAINT "MarketingYearlyPlan_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MarketingYearlyPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingGeneralPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "primaryGoal" TEXT,
    "totalBudget" REAL DEFAULT 0,
    "targetAudience" TEXT,
    "platforms" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingGeneralPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingYearlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingYearlyGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingYearlyGoal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingYearlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingYearlyTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "assigneeId" TEXT,
    "color" TEXT,
    "isExpanded" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingYearlyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingYearlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketingYearlyTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketingYearlyTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutlineMarketingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "planId" TEXT,
    "planData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingExecutionMonth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    CONSTRAINT "MarketingExecutionMonth_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingYearlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketingExecutionMonth_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MarketingYearlyTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingExecutionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "strategyPillarId" TEXT,
    CONSTRAINT "MarketingExecutionGroup_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MarketingExecutionMonth" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingExecutionDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "parentId" TEXT,
    "isDetail" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "week" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "visual" TEXT,
    "quantity" TEXT,
    "channel" TEXT,
    "ads" BOOLEAN NOT NULL DEFAULT false,
    "targetAudience" TEXT,
    "recordTime" TEXT,
    "location" TEXT,
    "detailContent" TEXT,
    "pic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    CONSTRAINT "MarketingExecutionDetail_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MarketingExecutionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketingExecutionDetail_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketingExecutionDetail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityCode" TEXT,
    "entityTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "dueDate" DATETIME,
    "department" TEXT,
    "metadata" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "approverId" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "note" TEXT,
    "rejectedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "attachments" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ApprovalComment" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "pageToken" TEXT,
    "userToken" TEXT,
    "appId" TEXT,
    "appSecret" TEXT,
    "verifyToken" TEXT,
    "webhookActive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objective" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "dailyBudget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "startTime" DATETIME,
    "stopTime" DATETIME,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "externalId" TEXT,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "formValues" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT,
    "medium" TEXT,
    "adId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingLead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingBudgetPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "revenueGoal" REAL NOT NULL DEFAULT 0,
    "mktRate" REAL NOT NULL DEFAULT 0,
    "mktValue" REAL NOT NULL DEFAULT 0,
    "agencyRate" REAL NOT NULL DEFAULT 0,
    "agencyValue" REAL NOT NULL DEFAULT 0,
    "brandingRate" REAL NOT NULL DEFAULT 0,
    "brandingValue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingBudgetPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingYearlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingBudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetPlanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" REAL NOT NULL DEFAULT 0,
    "value" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingBudgetItem_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "MarketingBudgetPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingMonthlyBudgetTotal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetPlanId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "totalValue" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "MarketingMonthlyBudgetTotal_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "MarketingBudgetPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingMonthlyBudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "rate" REAL NOT NULL DEFAULT 0,
    "value" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "MarketingMonthlyBudgetItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MarketingBudgetItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Workshop',
    "category" TEXT NOT NULL DEFAULT 'B2B',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "location" TEXT,
    "address" TEXT,
    "budget" REAL,
    "expectedAttendees" INTEGER,
    "pic" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "managementFeeRate" REAL NOT NULL DEFAULT 5,
    "vatRate" REAL NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingEventContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "quantity" REAL NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingEventContent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MarketingEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketingEventContent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketingEventContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketingEventTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "pic" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "weeks" TEXT,
    "content" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingEventTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MarketingEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketingEventTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketingEventTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProductCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "SeajongCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "SeajongProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ClientToModule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ClientToModule_A_fkey" FOREIGN KEY ("A") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ClientToModule_B_fkey" FOREIGN KEY ("B") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeajongProduct_slug_key" ON "SeajongProduct"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Client_shortName_key" ON "Client"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "Client_domain_key" ON "Client"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_workEmail_key" ON "Employee"("workEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Payroll_nam_thang_idx" ON "Payroll"("nam", "thang");

-- CreateIndex
CREATE INDEX "Payroll_trangThai_idx" ON "Payroll"("trangThai");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_thang_nam_key" ON "Payroll"("employeeId", "thang", "nam");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentCategory_code_key" ON "DepartmentCategory"("code");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE INDEX "Category_clientId_idx" ON "Category"("clientId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_type_code_key" ON "Category"("type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTypeDef_value_key" ON "CategoryTypeDef"("value");

-- CreateIndex
CREATE INDEX "CategoryTypeDef_isActive_idx" ON "CategoryTypeDef"("isActive");

-- CreateIndex
CREATE INDEX "CategoryTypeDef_sortOrder_idx" ON "CategoryTypeDef"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "MessageParticipant_userId_idx" ON "MessageParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageParticipant_messageId_userId_key" ON "MessageParticipant"("messageId", "userId");

-- CreateIndex
CREATE INDEX "Customer_nguon_idx" ON "Customer"("nguon");

-- CreateIndex
CREATE INDEX "Customer_nhom_idx" ON "Customer"("nhom");

-- CreateIndex
CREATE INDEX "CustomerCareHistory_customerId_idx" ON "CustomerCareHistory"("customerId");

-- CreateIndex
CREATE INDEX "CustomerCareHistory_nguoiChamSocId_idx" ON "CustomerCareHistory"("nguoiChamSocId");

-- CreateIndex
CREATE INDEX "CustomerCareHistory_ngayChamSoc_idx" ON "CustomerCareHistory"("ngayChamSoc");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_trangThai_idx" ON "Supplier"("trangThai");

-- CreateIndex
CREATE INDEX "SupplierCategory_categoryId_idx" ON "SupplierCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleOrder_code_key" ON "SaleOrder"("code");

-- CreateIndex
CREATE INDEX "SaleOrder_trangThai_idx" ON "SaleOrder"("trangThai");

-- CreateIndex
CREATE INDEX "SaleOrder_customerId_idx" ON "SaleOrder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_code_key" ON "PurchaseRequest"("code");

-- CreateIndex
CREATE INDEX "PurchaseRequest_trangThai_idx" ON "PurchaseRequest"("trangThai");

-- CreateIndex
CREATE INDEX "PurchaseRequest_donVi_idx" ON "PurchaseRequest"("donVi");

-- CreateIndex
CREATE INDEX "PurchaseRequest_clientId_idx" ON "PurchaseRequest"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequestItem_purchaseOrderItemId_key" ON "PurchaseRequestItem"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_purchaseRequestId_idx" ON "PurchaseRequestItem"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_inventoryItemId_idx" ON "PurchaseRequestItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_trangThaiXuLy_idx" ON "PurchaseRequestItem"("trangThaiXuLy");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_supplierId_idx" ON "PurchaseRequestItem"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_trangThai_idx" ON "PurchaseOrder"("trangThai");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_purchaseRequestId_idx" ON "PurchaseOrder"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_inventoryItemId_idx" ON "PurchaseOrderItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Expense_loai_idx" ON "Expense"("loai");

-- CreateIndex
CREATE INDEX "Expense_trangThai_idx" ON "Expense"("trangThai");

-- CreateIndex
CREATE INDEX "Debt_loai_idx" ON "Debt"("loai");

-- CreateIndex
CREATE INDEX "Debt_trangThai_idx" ON "Debt"("trangThai");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_code_key" ON "Asset"("code");

-- CreateIndex
CREATE INDEX "Asset_loai_idx" ON "Asset"("loai");

-- CreateIndex
CREATE INDEX "Asset_trangThai_idx" ON "Asset"("trangThai");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_name_key" ON "InventoryCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_code_key" ON "InventoryCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_isActive_idx" ON "Warehouse"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_code_key" ON "InventoryItem"("code");

-- CreateIndex
CREATE INDEX "InventoryItem_loai_idx" ON "InventoryItem"("loai");

-- CreateIndex
CREATE INDEX "InventoryItem_trangThai_idx" ON "InventoryItem"("trangThai");

-- CreateIndex
CREATE INDEX "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_nhaCungCap_idx" ON "InventoryItem"("nhaCungCap");

-- CreateIndex
CREATE INDEX "InventoryItem_dinhMucId_idx" ON "InventoryItem"("dinhMucId");

-- CreateIndex
CREATE UNIQUE INDEX "DinhMuc_code_key" ON "DinhMuc"("code");

-- CreateIndex
CREATE INDEX "DinhMuc_code_idx" ON "DinhMuc"("code");

-- CreateIndex
CREATE INDEX "DinhMucVatTu_dinhMucId_idx" ON "DinhMucVatTu"("dinhMucId");

-- CreateIndex
CREATE INDEX "InventoryStock_warehouseId_idx" ON "InventoryStock"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryStock_inventoryItemId_idx" ON "InventoryStock"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryStock_inventoryItemId_warehouseId_key" ON "InventoryStock"("inventoryItemId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryItemId_idx" ON "StockMovement"("inventoryItemId");

-- CreateIndex
CREATE INDEX "StockMovement_fromWarehouseId_idx" ON "StockMovement"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_toWarehouseId_idx" ON "StockMovement"("toWarehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_soChungTu_idx" ON "StockMovement"("soChungTu");

-- CreateIndex
CREATE INDEX "StockMovement_purchaseOrderId_idx" ON "StockMovement"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockCount_soChungTu_key" ON "StockCount"("soChungTu");

-- CreateIndex
CREATE INDEX "StockCount_warehouseId_idx" ON "StockCount"("warehouseId");

-- CreateIndex
CREATE INDEX "StockCount_trangThai_idx" ON "StockCount"("trangThai");

-- CreateIndex
CREATE INDEX "StockCount_ngayKiem_idx" ON "StockCount"("ngayKiem");

-- CreateIndex
CREATE INDEX "StockCountLine_stockCountId_idx" ON "StockCountLine"("stockCountId");

-- CreateIndex
CREATE INDEX "StockCountLine_inventoryItemId_idx" ON "StockCountLine"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_code_key" ON "Quotation"("code");

-- CreateIndex
CREATE INDEX "Quotation_trangThai_idx" ON "Quotation"("trangThai");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_nguoiPhuTrachId_idx" ON "Quotation"("nguoiPhuTrachId");

-- CreateIndex
CREATE INDEX "Quotation_ngayBaoGia_idx" ON "Quotation"("ngayBaoGia");

-- CreateIndex
CREATE INDEX "QuotationNegotiation_quotationId_idx" ON "QuotationNegotiation"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_code_key" ON "Contract"("code");

-- CreateIndex
CREATE INDEX "Contract_trangThai_idx" ON "Contract"("trangThai");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_nguoiPhuTrachId_idx" ON "Contract"("nguoiPhuTrachId");

-- CreateIndex
CREATE INDEX "Contract_quotationId_idx" ON "Contract"("quotationId");

-- CreateIndex
CREATE INDEX "Contract_ngayKetThuc_idx" ON "Contract"("ngayKetThuc");

-- CreateIndex
CREATE UNIQUE INDEX "RetailInvoice_code_key" ON "RetailInvoice"("code");

-- CreateIndex
CREATE INDEX "RetailInvoice_trangThai_idx" ON "RetailInvoice"("trangThai");

-- CreateIndex
CREATE INDEX "RetailInvoice_createdAt_idx" ON "RetailInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "RetailInvoice_nguoiBanId_idx" ON "RetailInvoice"("nguoiBanId");

-- CreateIndex
CREATE INDEX "RetailInvoiceItem_invoiceId_idx" ON "RetailInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "RetailInvoiceItem_inventoryItemId_idx" ON "RetailInvoiceItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "MonthlySalesSnapshot_year_idx" ON "MonthlySalesSnapshot"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySalesSnapshot_year_month_key" ON "MonthlySalesSnapshot"("year", "month");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_creatorId_idx" ON "Task"("creatorId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "MarketingAnnualPlan_year_idx" ON "MarketingAnnualPlan"("year");

-- CreateIndex
CREATE INDEX "MarketingAnnualPlan_status_idx" ON "MarketingAnnualPlan"("status");

-- CreateIndex
CREATE INDEX "MarketingAnnualPlan_createdById_idx" ON "MarketingAnnualPlan"("createdById");

-- CreateIndex
CREATE INDEX "MarketingTheme_planId_idx" ON "MarketingTheme"("planId");

-- CreateIndex
CREATE INDEX "MarketingContent_themeId_idx" ON "MarketingContent"("themeId");

-- CreateIndex
CREATE INDEX "MarketingContent_targetMonth_idx" ON "MarketingContent"("targetMonth");

-- CreateIndex
CREATE INDEX "MarketingMonthlyPlan_year_month_idx" ON "MarketingMonthlyPlan"("year", "month");

-- CreateIndex
CREATE INDEX "MarketingMonthlyPlan_employeeId_idx" ON "MarketingMonthlyPlan"("employeeId");

-- CreateIndex
CREATE INDEX "MarketingMonthlyPlan_status_idx" ON "MarketingMonthlyPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingMonthlyPlan_year_month_employeeId_key" ON "MarketingMonthlyPlan"("year", "month", "employeeId");

-- CreateIndex
CREATE INDEX "MarketingTask_monthlyPlanId_idx" ON "MarketingTask"("monthlyPlanId");

-- CreateIndex
CREATE INDEX "MarketingTask_contentId_idx" ON "MarketingTask"("contentId");

-- CreateIndex
CREATE INDEX "MarketingTask_status_idx" ON "MarketingTask"("status");

-- CreateIndex
CREATE INDEX "MarketingTaskComment_taskId_idx" ON "MarketingTaskComment"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingYearlyPlan_code_key" ON "MarketingYearlyPlan"("code");

-- CreateIndex
CREATE INDEX "MarketingYearlyPlan_year_idx" ON "MarketingYearlyPlan"("year");

-- CreateIndex
CREATE INDEX "MarketingYearlyPlan_status_idx" ON "MarketingYearlyPlan"("status");

-- CreateIndex
CREATE INDEX "MarketingYearlyPlan_isCurrent_idx" ON "MarketingYearlyPlan"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingGeneralPlan_planId_key" ON "MarketingGeneralPlan"("planId");

-- CreateIndex
CREATE INDEX "MarketingYearlyGoal_planId_idx" ON "MarketingYearlyGoal"("planId");

-- CreateIndex
CREATE INDEX "MarketingYearlyTask_planId_idx" ON "MarketingYearlyTask"("planId");

-- CreateIndex
CREATE INDEX "MarketingYearlyTask_parentId_idx" ON "MarketingYearlyTask"("parentId");

-- CreateIndex
CREATE INDEX "MarketingYearlyTask_assigneeId_idx" ON "MarketingYearlyTask"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "OutlineMarketingPlan_planId_key" ON "OutlineMarketingPlan"("planId");

-- CreateIndex
CREATE INDEX "OutlineMarketingPlan_year_idx" ON "OutlineMarketingPlan"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingExecutionMonth_planId_taskId_month_key" ON "MarketingExecutionMonth"("planId", "taskId", "month");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_approverId_idx" ON "ApprovalRequest"("status", "approverId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedById_idx" ON "ApprovalRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ApprovalRequest_department_status_idx" ON "ApprovalRequest"("department", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_createdAt_idx" ON "ApprovalRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ApprovalComment_requestId_idx" ON "ApprovalComment"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalComment_authorId_idx" ON "ApprovalComment"("authorId");

-- CreateIndex
CREATE INDEX "ApprovalComment_parentId_idx" ON "ApprovalComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_platform_key" ON "SocialConnection"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingCampaign_externalId_key" ON "MarketingCampaign"("externalId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_platform_idx" ON "MarketingCampaign"("platform");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "MarketingCampaign_clientId_idx" ON "MarketingCampaign"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingLead_externalId_key" ON "MarketingLead"("externalId");

-- CreateIndex
CREATE INDEX "MarketingLead_campaignId_idx" ON "MarketingLead"("campaignId");

-- CreateIndex
CREATE INDEX "MarketingLead_status_idx" ON "MarketingLead"("status");

-- CreateIndex
CREATE INDEX "MarketingLead_email_idx" ON "MarketingLead"("email");

-- CreateIndex
CREATE INDEX "MarketingLead_phone_idx" ON "MarketingLead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingBudgetPlan_planId_key" ON "MarketingBudgetPlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingMonthlyBudgetTotal_budgetPlanId_month_key" ON "MarketingMonthlyBudgetTotal"("budgetPlanId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingMonthlyBudgetItem_itemId_month_key" ON "MarketingMonthlyBudgetItem"("itemId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingEvent_code_key" ON "MarketingEvent"("code");

-- CreateIndex
CREATE INDEX "MarketingEventContent_eventId_idx" ON "MarketingEventContent"("eventId");

-- CreateIndex
CREATE INDEX "MarketingEventContent_parentId_idx" ON "MarketingEventContent"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductCategories_AB_unique" ON "_ProductCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductCategories_B_index" ON "_ProductCategories"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ClientToModule_AB_unique" ON "_ClientToModule"("A", "B");

-- CreateIndex
CREATE INDEX "_ClientToModule_B_index" ON "_ClientToModule"("B");

