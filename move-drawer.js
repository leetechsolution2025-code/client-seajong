const fs = require('fs');

const pagePath = './src/app/(dashboard)/marketing/products/page.tsx';
const compPath = './src/components/marketing/ProductDrawer.tsx';

let lines = fs.readFileSync(pagePath, 'utf8').split('\n');

// Types are roughly from lines 6 to 19 (let's find // ── Types)
const typesStart = lines.findIndex(l => l.includes('// ── Types'));
const cardStart = lines.findIndex(l => l.includes('// ── ProductCard'));
const drawerStart = lines.findIndex(l => l.includes('// ── ProductDrawer'));
const syncStart = lines.findIndex(l => l.includes('// ── SyncPanel'));

if (typesStart === -1 || cardStart === -1 || drawerStart === -1 || syncStart === -1) {
  console.log("Could not find markers!");
  process.exit(1);
}

const typesLines = lines.slice(typesStart, cardStart).map(l => l.replace(/^interface/, 'export interface'));
const drawerLines = lines.slice(drawerStart, syncStart).map(l => l.replace(/^function ProductDrawer/, 'export function ProductDrawer'));

const drawerContent = `"use client";\n\nimport React, { useState, useEffect } from "react";\n\n` + 
  typesLines.join('\n') + '\n\n' + drawerLines.join('\n');

fs.writeFileSync(compPath, drawerContent, 'utf8');

const newPageLines = [
  ...lines.slice(0, typesStart),
  'import { Product, Category, SyncLog } from "@/components/marketing/ProductDrawer";',
  ...lines.slice(cardStart, drawerStart),
  ...lines.slice(syncStart)
];

fs.writeFileSync(pagePath, newPageLines.join('\n'), 'utf8');
console.log("Moved ProductDrawer to", compPath);
