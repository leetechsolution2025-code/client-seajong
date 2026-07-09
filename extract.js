const fs = require('fs');
const path = './src/app/(dashboard)/marketing/products/page.tsx';
const content = fs.readFileSync(path, 'utf8');

const drawerStart = content.indexOf('// ── ProductDrawer ──────────────────────────────────────────────────────────────');
const productGridStart = content.indexOf('// ── Trang Chính ──────────────────────────────────────────────────────────────');

if (drawerStart === -1 || productGridStart === -1) {
  console.log("Could not find start/end markers");
  process.exit(1);
}

const beforeDrawer = content.substring(0, drawerStart);
const drawerCode = content.substring(drawerStart, productGridStart);
const afterDrawer = content.substring(productGridStart);

const newComponentCode = `"use client";
import React, { useState, useEffect } from "react";

export interface Product {
  id: number; slug: string; url: string; name: string;
  excerpt: string; description: string;
  images: string[]; specs: Record<string, string>;
  price: number;
  categories: number[]; updatedAt: string;
}
export interface Category { id: number; name: string; slug: string; count: number; parent: number; }

` + drawerCode.replace(/function ProductDrawer/g, "export function ProductDrawer");

fs.writeFileSync('./src/components/marketing/ProductDrawer.tsx', newComponentCode, 'utf8');

// Update page.tsx
const newPageCode = beforeDrawer + afterDrawer;
// Need to add import
const finalPageCode = newPageCode.replace(
  'import { PageHeader } from "@/components/layout/PageHeader";',
  'import { PageHeader } from "@/components/layout/PageHeader";\nimport { ProductDrawer, Product, Category } from "@/components/marketing/ProductDrawer";'
).replace(/interface Product \{[\s\S]*?\}\ninterface Category \{[\s\S]*?\}\n/g, '');

fs.writeFileSync(path, finalPageCode, 'utf8');
console.log("Extraction successful!");
