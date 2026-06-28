# 🏗️ KIẾN TRÚC HỆ THỐNG — EOS Master
> **Owner:** LEETECH  
> **Last updated:** 2026-03-21  
> **Mục đích:** Tài liệu tham chiếu kiến trúc trong suốt quá trình phát triển

---

## 1. TỔNG QUAN MÔ HÌNH

```
┌────────────────────────────────────────────────────────────┐
│                     MASTER PROJECT                          │
│                                                             │
│  /admin ──────────────────────────────────────────────     │
│    ├── /admin/clients   ← Quản lý khách hàng (lưu DB)      │
│    │       │ thông tin KH (tên, shortName, dept chọn...)   │
│    │       │ được dùng để sinh seed-client-companyInfo.js  │
│    │       └──────────────────── Export ──────────────┐    │
│    ├── /admin/employees ← Nhân viên LEETECH            │    │
│    └── /admin/departments                              │    │
│                                                        │    │
│  /(dashboard)/{deptCode} ← Nhân viên LEETECH làm việc │    │
│                                                        │    │
└───────────────────────────────────────────────────────┼────┘
                                                        │
              ┌─────────────────────────┬───────────────┘
              ▼                         ▼               
        [Child: KH A]            [Child: KH B]   ...
        (độc lập hoàn toàn)      (độc lập hoàn toàn)
```

**Nguyên tắc cốt lõi:**
- **Master** là sản phẩm ERP nội bộ của LEETECH — xây dựng hoàn toàn độc lập, không cần quan tâm đến Child.
- **Export** chỉ **ĐỌC + SAO CHÉP** những gì cần thiết từ Master sang một thư mục Child mới. **Không làm thay đổi bất kỳ thứ gì trong Master** — không sửa code, không chạm vào DB.
- **Child Project** sau khi được tạo ra là **hoàn toàn độc lập** — codebase riêng, DB riêng, không liên kết gì với Master hay Child khác.

---

## 2. MASTER PROJECT — ERP NỘI BỘ LEETECH

> Xây dựng như một sản phẩm độc lập. Không cần nghĩ đến Child Project khi dev ở đây.

### 2.1 Tech Stack
- **Framework:** Next.js 16 (Turbopack, App Router)
- **Database:** Prisma + SQLite (dev), có thể migrate PostgreSQL (prod)
- **Auth:** NextAuth v4 (JWT, 8h session)
- **Proxy (Middleware):** `src/proxy.ts`

### 2.2 Route Structure
```
/                          ← Landing page (giới thiệu sản phẩm LEETECH)
/login                     ← Đăng nhập
/admin                     ← SUPERADMIN only (admin@leetech.vn)
  ├── /admin/clients       ← Danh sách khách hàng + Công cụ Export
  ├── /admin/employees     ← Nhân viên LEETECH
  ├── /admin/departments   ← Danh mục phòng ban (23 dept)
  └── /admin/roles         ← [TBD]
/(dashboard)/{deptCode}    ← Giao diện làm việc từng phòng ban LEETECH
```

### 2.3 Roles trong Master
| Role | Mô tả | Route được phép |
|------|-------|-----------------|
| `SUPERADMIN` | LEETECH admin tối cao | `/admin/*` + `/(dashboard)/*` |
| `ADMIN` | LEETECH admin phòng ban | `/(dashboard)/{deptCode}` |
| `USER` | Nhân viên LEETECH | `/(dashboard)/{deptCode}` |

### 2.4 Tài khoản Master
- `admin@leetech.vn` → SUPERADMIN → vào `/admin`
- Nhân viên LEETECH → ADMIN/USER → vào `/(dashboard)/{dept}`

### 2.5 Danh sách 23 Phòng ban
| Group | Code | Tên |
|-------|------|-----|
| management | `board` | Ban Giám đốc |
| management | `exec` | Văn phòng TGĐ |
| core | `hr` | Nhân sự |
| core | `finance` | Tài chính – Kế toán |
| core | `legal` | Pháp chế |
| core | `it` | Công nghệ thông tin |
| core | `admin_ops` | Hành chính – Văn phòng |
| business | `sales` | Kinh doanh |
| business | `marketing` | Marketing |
| business | `product` | Sản phẩm |
| business | `bd` | Phát triển kinh doanh |
| business | `cs` | Chăm sóc khách hàng |
| business | `pr` | Quan hệ công chúng |
| business | `plan_finance` | Tài chính – Kinh doanh |
| support | `ops` | Vận hành |
| support | `logistics` | Kho vận |
| support | `purchase` | Mua hàng |
| support | `qa` | Đảm bảo chất lượng |
| support | `rd` | Nghiên cứu & Phát triển |
| support | `production` | Sản xuất |
| support | `facility` | Kỹ thuật – Cơ sở vật chất |
| support | `security` | Bảo vệ – An ninh |

---

## 3. CHỨC NĂNG EXPORT (trong `/admin/clients`)

### 3.1 Mục đích
`/admin/clients` là nơi LEETECH SUPERADMIN **quản lý danh sách khách hàng** (các dự án Child Project sẽ được tạo ra). Dữ liệu khách hàng được lưu vào DB của Master và là **cơ sở để sinh seed file** khi Export.

### 3.2 Tạo / Quản lý Client
Admin nhập thông tin client và lưu vào DB (bảng `Client` trong Master):
- Logo, Tên công ty, **shortName** (sinh domain `{shortName}.vn`)
- Mã số thuế, Địa chỉ, Điện thoại, Email, Slogan, Người đại diện pháp lý
- Danh sách chi nhánh (nếu có)
- **Danh sách phòng ban được chọn** (từ 23 dept) → quyết định export những gì

### 3.3 Luồng Export → Child Project

> ⚠️ **Toàn bộ quá trình Export chỉ ĐỌC + SAO CHÉP. Master không bị thay đổi bất kỳ thứ gì — không sửa code, không ghi vào DB.**

```
1. SUPERADMIN bấm Export cho một Client
   → Đọc thông tin Client từ DB của Master (read-only)

2. Sinh seed files vào thư mục Child (từ data Client đọc được):
   client-{shortName}/prisma/
   ├── seed-client-companyInfo.js  ← Thông tin công ty KH (riêng từng client)
   ├── seed-client-admin.js        ← 2 tài khoản admin cho KH
   └── seed-client-branches.js     ← Chi nhánh của KH (nếu có)

3. Sao chép (copy) từ Master → client-{shortName}/
   EXCLUDE: /admin, /api/admin, node_modules, .next, *.db
   (Master giữ nguyên — chỉ copy, không xóa/sửa gì ở Master)

4. Chỉ giữ lại trong Child:
   - /company/*              ← Admin panel của Child (xem Mục 4)
   - /api/company/*          ← API cho Child admin
   - /(dashboard)/{dept}/   ← Chỉ các dept được chọn
   - /api/{module}/          ← API tương ứng
   - /components/{module}/   ← Components tương ứng
   - Schema đã được pruning  ← Chỉ models cần thiết

5. Patch các file trong Child (không đụng vào Master):
   - page.tsx  → redirect /login
   - .env      → config riêng cho client

6. Client chạy: npm run setup (trong thư mục Child)
   → prisma db push
   → seed-departments.js       (chỉ dept được chọn)
   → seed-client-companyInfo.js
   → seed-client-branches.js
   → seed-client-admin.js
```

> **Lưu ý:** `seed-client-companyInfo.js` được sinh **vào thư mục Child**, từ data đọc được từ DB Master — KHÔNG tạo trong Master, KHÔNG lẫn vào seed của Master.

---

## 4. CHILD PROJECT — SẢN PHẨM GIAO CHO KHÁCH HÀNG

> Child Project là một codebase **hoàn toàn độc lập**. Sau khi Export xong, nó không còn liên quan gì đến Master.

### 4.1 Đặc điểm
- Codebase riêng (clone từ Master, đã pruning)
- DB riêng, bắt đầu gần như trống
- Chỉ có các phòng ban được chọn lúc export
- Không có trang `/admin` của Master

### 4.2 Route Structure của Child
```
/                          ← Redirect → /login
/login                     ← Đăng nhập
/company                   ← Admin panel dành cho khách hàng (xem 4.3)
/(dashboard)/{deptCode}    ← Giao diện làm việc nhân viên (chỉ dept được export)
```

### 4.3 `/company` — Admin Panel của Child (cùng code ở mọi Child Project)

Đây là trang Admin dành riêng cho **khách hàng** (ADMIN của công ty họ).  
Mọi Child Project đều có chung code này — chỉ khác nhau về data trong DB.

Lần đầu đăng nhập, khách hàng vào đây để **thiết lập ban đầu:**
- Xem/sửa thông tin công ty (từ `CompanyInfo` đã được seed sẵn)
- Thêm nhân viên vào các phòng ban đã được export
- Quản lý chi nhánh, tài khoản, phân quyền

```
/company                   ← Dashboard tổng quan (stats, quick links)
  ├── /company/profile     ← Thông tin công ty — CRUD CompanyInfo
  ├── /company/branches    ← Chi nhánh — CRUD Branch
  ├── /company/employees   ← Nhân viên — thêm/sửa + tạo tài khoản User
  ├── /company/departments ← Phòng ban đang hoạt động (read-only)
  ├── /company/accounts    ← Tài khoản hệ thống (đổi pass, tạo admin)
  └── /company/permissions ← Phân quyền người dùng
```

> **Lưu ý phát triển:** `/company` được viết trong repo Master cho tiện phát triển và test,  
> nhưng **về khái niệm nó thuộc về Child Project**, không thuộc Master.

### 4.4 Roles trong Child
| Role | Mô tả | Route được phép |
|------|-------|-----------------|
| `ADMIN` | Admin công ty khách hàng | `/company/*` + `/(dashboard)/*` |
| `USER` | Nhân viên công ty | `/(dashboard)/{deptCode}` (theo phân quyền) |

> **Không có SUPERADMIN trong Child Project.**

### 4.5 Tài khoản được seed sẵn
```
admin@{shortName}.vn           role: ADMIN  ← Tài khoản cho client
admin.leetech@{shortName}.vn   role: ADMIN  ← LEETECH support access
  Password mặc định: Admin@123
```
> Ví dụ: shortName = `xyz-tech` → `admin@xyz-tech.vn` / `admin.leetech@xyz-tech.vn`

### 4.6 DB Child khi khởi tạo
| Bảng | Trạng thái | Ghi chú |
|------|-----------|---------|
| `CompanyInfo` | ✅ 1 record | Seed từ `seed-client-companyInfo.js` (sinh riêng cho KH) |
| `DepartmentCategory` | ✅ N records | Chỉ dept được chọn lúc export |
| `Branch` | ✅ / trống | Seed từ `seed-client-branches.js` nếu có |
| `User` | ✅ 2 records | admin + admin.leetech |
| Tất cả bảng khác | ⬜ Rỗng | Công ty tự nhập sau qua `/company` |

---

## 5. PERMISSION SYSTEM (Child Project)

### 5.1 User Schema
```prisma
model User {
  role          String  @default("USER")    // ADMIN | USER
  permissions   String  @default("[]")      // Feature flags (JSON)
  deptAccess    String  @default("[]")      // Department access (JSON)
}
```

### 5.2 Feature Flags (`permissions`)
```json
["approve_request", "approve_budget", "report", "plan", "notify", "chat"]
```

### 5.3 Department Access (`deptAccess`)
```json
[
  { "code": "sales",        "level": "full" },
  { "code": "plan_finance", "level": "view" }
]
```
> `level`: `"full"` (toàn quyền) | `"view"` (chỉ xem)

---

## 6. PROXY / MIDDLEWARE (`src/proxy.ts`)

```
/admin/*    → chỉ SUPERADMIN             (Master)
/company/*  → ADMIN hoặc SUPERADMIN      (Child — nhưng dev trong Master)
/(dashboard)/* → tất cả user đã đăng nhập
```

---

## 7. KEY DECISIONS

| Quyết định | Lý do |
|-----------|-------|
| Child dùng `/company`, Master dùng `/admin` | Tách biệt hoàn toàn — không nhầm lẫn khi dev |
| Không có SUPERADMIN trong Child | Child chỉ có 1 công ty, không cần tầng LEETECH |
| `seed-client-companyInfo.js` sinh riêng cho từng client | Không lẫn data khách hàng vào seed Master |
| `/company` được dev trong repo Master | Tiện phát triển + test, nhưng export vào mọi Child |
| `Branch` là bảng riêng | Không phải công ty nào cũng có chi nhánh |

---

## 8. TRẠNG THÁI HIỆN TẠI

### ✅ Master ERP — Đã có
- [x] `/admin` — SUPERADMIN panel (clients, employees, departments)
- [x] `/(dashboard)/{deptCode}` — 22+ phòng ban
- [x] Auth, middleware, proxy

### ✅ Child Admin Panel (`/company`) — Đã hoàn thiện
- [x] `layout.tsx` — sidebar + topbar đầy đủ
- [x] `/company` — Dashboard tổng quan
- [x] `/company/profile` — CRUD CompanyInfo
- [x] `/company/branches` — CRUD Branch
- [x] `/company/employees` — Danh sách + tạo nhân viên, auto-sinh email từ họ tên Việt
- [x] `/company/departments` — Xem phòng ban (read-only)
- [x] `/company/accounts` — Quản lý tài khoản
- [x] `/company/permissions` — Phân quyền
- [x] `/api/company/*` — Toàn bộ API routes

### 🔴 Critical — Export Tool (chưa làm)
- [ ] Clone API: exclude `/admin`, `/api/admin` khi export
- [ ] Clone API: copy đúng API routes + components theo module được chọn
- [ ] Clone API: generate `seed-client-companyInfo.js` riêng cho từng client
- [ ] Clone API: schema pruning theo module được chọn
- [ ] Fix `LoginForm.tsx`: ADMIN → redirect `/company` trong Child context

### 🟠 Important
- [ ] Form tạo Client trong Master: lưu branches vào `Branch` model
- [ ] Xóa hardcode data trong `seed-branches.js`

### 🟡 Nice to have
- [ ] Version tracking cho clone (clonedAt, masterVersion)
- [ ] NEXTAUTH_URL động trong .env của child
