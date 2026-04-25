"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem { name: string; href: string; requiredOrder?: number }
interface NavGroup { key: string; label: string; icon: string; items: NavItem[]; flat?: boolean; }
interface Props { overviewHref: string; groups: NavGroup[]; isCollapsed: boolean; onMenuSelect?: () => void; userRole?: string; userLevelOrder?: number | null; }

export function SidebarAccordion({ overviewHref, groups, isCollapsed, onMenuSelect, userRole, userLevelOrder }: Props) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const isOverviewActive = pathname === overviewHref;

  return (
    <nav className="d-flex flex-column flex-grow-1 overflow-x-hidden px-2 py-2" style={{ overflowY: "auto" }}>

      {/* ── Tổng quan ── */}
      <Link
        href={overviewHref}
        onClick={onMenuSelect}
        className={`si-item d-flex align-items-center gap-2 px-3 py-2 mb-1 text-decoration-none${isOverviewActive ? " active" : ""}`}
      >
        <i className="bi bi-speedometer2 flex-shrink-0" style={{ fontSize: 16 }} />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
              style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", fontWeight: isOverviewActive ? 600 : 400 }}
            >
              Tổng quan
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* ── Accordion groups ── */}
      {groups.map((group) => {
        const isGroupActive = group.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/"));
        const isOpen = openGroup === group.key;

        // Flat item — render link trực tiếp, không accordion
        if (group.flat && group.items[0]) {
          const item = group.items[0];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const isAdmin = userRole === "SUPERADMIN" || userRole === "admin";
          // isLocked: admin bypass, others need levelOrder (smaller = higher rank)
          // requiredOrder=2 means: need levelOrder <= 2 (i.e. senior or mid manager)
          const isLocked = !isAdmin && item.requiredOrder != null && (
            userLevelOrder == null || userLevelOrder > item.requiredOrder
          );
          
          const handleClick = (e: React.MouseEvent) => {
            if (isLocked) {
              e.preventDefault();
            } else if (onMenuSelect) {
              onMenuSelect();
            }
          };

          return (
            <Link
              key={group.key}
              href={isLocked ? "#" : item.href}
              onClick={handleClick}
              className={`si-item d-flex align-items-center gap-2 px-3 py-2 mb-1 text-decoration-none${active ? " active" : ""}`}
              style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
            >
              <i className={`bi ${group.icon} flex-shrink-0`} style={{ fontSize: 16 }} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
                    style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", fontWeight: active ? 600 : 400, flex: 1 }}
                  >
                    {group.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isLocked && !isCollapsed && <i className="bi bi-lock-fill text-muted flex-shrink-0" style={{ fontSize: 13 }} />}
            </Link>
          );
        }

        return (
          <div key={group.key} className="mb-1">
            <button
              onClick={() => { if (!isCollapsed) setOpenGroup(isOpen ? null : group.key); }}
              className="si-btn w-100 d-flex align-items-center gap-2 px-3 py-2 border-0"
              style={{ cursor: "pointer" }}
            >
              <i className={`bi ${group.icon} flex-shrink-0`} style={{ fontSize: 16 }} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
                    style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", flexGrow: 1, textAlign: "left", fontWeight: 500 }}
                  >
                    {group.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!isCollapsed && (
                <motion.i
                  className="bi bi-chevron-down flex-shrink-0"
                  style={{ fontSize: 11, opacity: 0.45 }}
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>

            <AnimatePresence>
              {isOpen && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="ps-3 pe-1 pb-1">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      const isAdmin = userRole === "SUPERADMIN" || userRole === "admin";
                      const isLocked = !isAdmin && item.requiredOrder != null && (
                        userLevelOrder == null || userLevelOrder > item.requiredOrder
                      );
                      
                      const handleClick = (e: React.MouseEvent) => {
                        if (isLocked) {
                          e.preventDefault();
                        } else if (onMenuSelect) {
                          onMenuSelect();
                        }
                      };

                      return (
                        <Link
                          key={item.href}
                          href={isLocked ? "#" : item.href}
                          onClick={handleClick}
                          className={`si-item d-flex align-items-center gap-2 px-3 py-2 text-decoration-none${active ? " active" : ""}`}
                          style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                        >
                          <span className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 16 }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%",
                              border: "1.5px solid currentColor",
                              background: active ? "currentColor" : "transparent",
                              opacity: active ? 1 : 0.5,
                              transition: "all 0.15s",
                            }} />
                          </span>
                          <span style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500, flex: 1 }}>
                            {item.name}
                          </span>
                          {isLocked && <i className="bi bi-lock-fill text-muted flex-shrink-0" style={{ fontSize: 13 }} />}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* ── Công việc cá nhân ── */}
      <div className="mt-auto pt-2">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-3 pb-1 mb-0 text-uppercase"
              style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--muted-foreground)", opacity: 0.4, fontWeight: 600 }}
            >
              Công việc cá nhân
            </motion.p>
          )}
        </AnimatePresence>
        {[
          { name: "Danh sách công việc", href: "/my/tasks",         icon: "bi-list-check"        },
          { name: "Chấm công",           href: "/my/attendance",    icon: "bi-clock-history"     },
          { name: "Tạo yêu cầu",         href: "/my/leave-request", icon: "bi-file-earmark-plus" },
        ].map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMenuSelect}
              className={`si-item d-flex align-items-center gap-2 px-3 py-2 mb-1 text-decoration-none${active ? " active" : ""}`}
            >
              <i className={`bi ${item.icon} flex-shrink-0`} style={{ fontSize: 16 }} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
                    style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden" }}
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
