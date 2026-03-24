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
    <nav className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface)/0.9)] p-3 shadow-sm lg:h-full lg:rounded-none lg:border-0 lg:bg-transparent lg:p-5 lg:shadow-none">
      <div className="-mx-3 -mt-3 mb-3 bg-[hsl(var(--primary))] px-3 py-4  lg:-mx-5 lg:-mt-5 lg:mb-4 lg:px-5 lg:py-5">
        <p className="text-3xl font-bold tracking-tight text-white lg:text-2xl">Duey</p>
      </div>
      <ul className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const count = item.countKey ? counts[item.countKey] : null;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                  "hover:bg-[hsl(var(--bg)/0.9)]",
                  isActive
                    ? "bg-[hsl(var(--accent-soft))] text-[hsl(var(--ink))] ring-1 ring-[hsl(var(--primary)/0.28)]"
                    : "text-[hsl(var(--ink))] hover:text-[hsl(var(--primary))]",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", isActive && "text-[hsl(var(--primary))]")} />
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
  );
}
