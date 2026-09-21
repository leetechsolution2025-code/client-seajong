import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface CarrierRecord {
  id: string;
  code: string | null;
  name: string;
  serviceType: string | null;
  contactName: string | null;
  contactRole: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  transactionAddress: string | null;
  address: string | null;
  routes: string | null;
  hanMucNo: number;
  danhGia: number;
  trangThai: string;
  ghiChu: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const carrierDb = {
  async findMany(params: {
    where?: {
      trangThai?: string;
      serviceType?: string;
      search?: string;
    };
    skip?: number;
    take?: number;
  }): Promise<CarrierRecord[]> {
    if ((prisma as any).carrier?.findMany) {
      const where: any = {};
      if (params.where?.trangThai) where.trangThai = params.where.trangThai;
      if (params.where?.serviceType) where.serviceType = params.where.serviceType;
      if (params.where?.search) {
        where.OR = [
          { name: { contains: params.where.search } },
          { code: { contains: params.where.search } },
          { contactName: { contains: params.where.search } },
          { contactRole: { contains: params.where.search } },
          { phone: { contains: params.where.search } },
          { transactionAddress: { contains: params.where.search } },
          { address: { contains: params.where.search } },
          { routes: { contains: params.where.search } },
        ];
      }
      return await (prisma as any).carrier.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      });
    }

    // Fallback SQLite trực tiếp khi dev server chưa restart Prisma client
    let query = "SELECT * FROM Carrier WHERE 1=1";
    const conditions: string[] = [];
    const search = params.where?.search?.toLowerCase();

    if (params.where?.trangThai) {
      conditions.push(`trangThai = '${params.where.trangThai.replace(/'/g, "''")}'`);
    }
    if (params.where?.serviceType) {
      conditions.push(`serviceType = '${params.where.serviceType.replace(/'/g, "''")}'`);
    }
    if (search) {
      const s = search.replace(/'/g, "''");
      conditions.push(`(
        LOWER(name) LIKE '%${s}%' OR
        LOWER(code) LIKE '%${s}%' OR
        LOWER(contactName) LIKE '%${s}%' OR
        LOWER(contactRole) LIKE '%${s}%' OR
        phone LIKE '%${s}%' OR
        LOWER(address) LIKE '%${s}%' OR
        LOWER(routes) LIKE '%${s}%'
      )`);
    }

    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }
    query += " ORDER BY createdAt DESC";
    if (params.take) {
      query += ` LIMIT ${params.take}`;
      if (params.skip) {
        query += ` OFFSET ${params.skip}`;
      }
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(query);
    return rows.map((r) => ({
      ...r,
      hanMucNo: Number(r.hanMucNo || 0),
      danhGia: Number(r.danhGia || 5),
    }));
  },

  async count(where?: {
    trangThai?: string;
    serviceType?: string;
    search?: string;
  }): Promise<number> {
    if ((prisma as any).carrier?.count) {
      const pWhere: any = {};
      if (where?.trangThai) pWhere.trangThai = where.trangThai;
      if (where?.serviceType) pWhere.serviceType = where.serviceType;
      if (where?.search) {
        pWhere.OR = [
          { name: { contains: where.search } },
          { code: { contains: where.search } },
          { contactName: { contains: where.search } },
          { contactRole: { contains: where.search } },
          { phone: { contains: where.search } },
          { address: { contains: where.search } },
          { routes: { contains: where.search } },
        ];
      }
      return await (prisma as any).carrier.count({ where: pWhere });
    }

    let query = "SELECT COUNT(*) as cnt FROM Carrier WHERE 1=1";
    const conditions: string[] = [];
    const search = where?.search?.toLowerCase();

    if (where?.trangThai) {
      conditions.push(`trangThai = '${where.trangThai.replace(/'/g, "''")}'`);
    }
    if (where?.serviceType) {
      conditions.push(`serviceType = '${where.serviceType.replace(/'/g, "''")}'`);
    }
    if (search) {
      const s = search.replace(/'/g, "''");
      conditions.push(`(
        LOWER(name) LIKE '%${s}%' OR
        LOWER(code) LIKE '%${s}%' OR
        LOWER(contactName) LIKE '%${s}%' OR
        LOWER(contactRole) LIKE '%${s}%' OR
        phone LIKE '%${s}%' OR
        LOWER(address) LIKE '%${s}%' OR
        LOWER(routes) LIKE '%${s}%'
      )`);
    }

    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }

    const res = await prisma.$queryRawUnsafe<any[]>(query);
    return Number(res[0]?.cnt || 0);
  },

  async findUnique(id: string): Promise<CarrierRecord | null> {
    if ((prisma as any).carrier?.findUnique) {
      return await (prisma as any).carrier.findUnique({ where: { id } });
    }
    const safeId = id.replace(/'/g, "''");
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Carrier WHERE id = '${safeId}' LIMIT 1`);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      hanMucNo: Number(r.hanMucNo || 0),
      danhGia: Number(r.danhGia || 5),
    };
  },

  async findLastCode(prefix: string): Promise<string | null> {
    if ((prisma as any).carrier?.findFirst) {
      const last = await (prisma as any).carrier.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: "desc" },
      });
      return last?.code || null;
    }
    const safePrefix = prefix.replace(/'/g, "''");
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT code FROM Carrier WHERE code LIKE '${safePrefix}%' ORDER BY code DESC LIMIT 1`
    );
    return rows[0]?.code || null;
  },

  async create(data: {
    code?: string;
    name: string;
    serviceType?: string | null;
    contactName?: string | null;
    contactRole?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    transactionAddress?: string | null;
    address?: string | null;
    routes?: string | null;
    hanMucNo?: number;
    danhGia?: number;
    trangThai?: string;
    ghiChu?: string | null;
  }): Promise<CarrierRecord> {
    if ((prisma as any).carrier?.create) {
      return await (prisma as any).carrier.create({ data });
    }

    const id = "car_" + crypto.randomBytes(12).toString("hex");
    const now = new Date().toISOString();
    const code = data.code || null;
    const name = data.name;
    const serviceType = data.serviceType || "Chuyển phát nhanh";
    const contactName = data.contactName || null;
    const contactRole = data.contactRole || null;
    const phone = data.phone || null;
    const email = data.email || null;
    const website = data.website || null;
    const transactionAddress = data.transactionAddress || null;
    const address = data.address || null;
    const routes = data.routes || null;
    const hanMucNo = data.hanMucNo || 0;
    const danhGia = data.danhGia || 5;
    const trangThai = data.trangThai || "active";
    const ghiChu = data.ghiChu || null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO Carrier (id, code, name, serviceType, contactName, contactRole, phone, email, website, transactionAddress, address, routes, hanMucNo, danhGia, trangThai, ghiChu, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, code, name, serviceType, contactName, contactRole, phone, email, website, transactionAddress, address, routes, hanMucNo, danhGia, trangThai, ghiChu, now, now
    );

    return {
      id,
      code,
      name,
      serviceType,
      contactName,
      contactRole,
      phone,
      email,
      website,
      transactionAddress,
      address,
      routes,
      hanMucNo,
      danhGia,
      trangThai,
      ghiChu,
      createdAt: now,
      updatedAt: now,
    };
  },

  async update(id: string, data: any): Promise<CarrierRecord> {
    if ((prisma as any).carrier?.update) {
      return await (prisma as any).carrier.update({ where: { id }, data });
    }

    const now = new Date().toISOString();
    const fields: string[] = ["updatedAt = ?"];
    const values: any[] = [now];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.code !== undefined) { fields.push("code = ?"); values.push(data.code); }
    if (data.serviceType !== undefined) { fields.push("serviceType = ?"); values.push(data.serviceType); }
    if (data.contactName !== undefined) { fields.push("contactName = ?"); values.push(data.contactName); }
    if (data.contactRole !== undefined) { fields.push("contactRole = ?"); values.push(data.contactRole); }
    if (data.phone !== undefined) { fields.push("phone = ?"); values.push(data.phone); }
    if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
    if (data.website !== undefined) { fields.push("website = ?"); values.push(data.website); }
    if (data.transactionAddress !== undefined) { fields.push("transactionAddress = ?"); values.push(data.transactionAddress); }
    if (data.address !== undefined) { fields.push("address = ?"); values.push(data.address); }
    if (data.routes !== undefined) { fields.push("routes = ?"); values.push(data.routes); }
    if (data.hanMucNo !== undefined) { fields.push("hanMucNo = ?"); values.push(data.hanMucNo); }
    if (data.danhGia !== undefined) { fields.push("danhGia = ?"); values.push(data.danhGia); }
    if (data.trangThai !== undefined) { fields.push("trangThai = ?"); values.push(data.trangThai); }
    if (data.ghiChu !== undefined) { fields.push("ghiChu = ?"); values.push(data.ghiChu); }

    values.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE Carrier SET ${fields.join(", ")} WHERE id = ?`,
      ...values
    );

    const updated = await this.findUnique(id);
    if (!updated) throw new Error("Carrier not found after update");
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    if ((prisma as any).carrier?.delete) {
      await (prisma as any).carrier.delete({ where: { id } });
      return true;
    }
    await prisma.$executeRawUnsafe(`DELETE FROM Carrier WHERE id = ?`, id);
    return true;
  }
};
