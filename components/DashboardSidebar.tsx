"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Files,
  TriangleAlert,
  Building2,
  CalendarDays,
  ChartColumn,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarCounts = {
  invoices: number;
  alerts: number;
  services: number;
  documents: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  countKey?: keyof SidebarCounts;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/invoices",
    label: "Invoices",
    icon: ReceiptText,
    countKey: "invoices",
  },
  {
    href: "/documents",
    label: "Documents",
    icon: Files,
    countKey: "documents",
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: TriangleAlert,
    countKey: "alerts",
  },
  {
    href: "/services",
    label: "Services",
    icon: Building2,
    countKey: "services",
  },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar({
  counts,
}: {
  counts: SidebarCounts;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-3 shadow-sm lg:sticky lg:top-6 lg:h-fit">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-ink))]">
          Navigation
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const count = item.countKey ? counts[item.countKey] : null;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                    "hover:bg-[hsl(var(--bg))]",
                    isActive
                      ? "bg-[hsl(var(--bg))] text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--ink))] hover:text-[hsl(var(--primary))]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  {typeof count === "number" && (
                    <span className="rounded-full bg-[hsl(var(--bg))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--muted-ink))]">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
