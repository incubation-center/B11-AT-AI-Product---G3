"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Files,
  TriangleAlert,
  Building2,
  CalendarDays,
  ChartColumn,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

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
  iconColor: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Main Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, iconColor: "text-blue-500" },
      { href: "/invoices",  label: "Invoices",  icon: ReceiptText,     iconColor: "text-indigo-500", countKey: "invoices" },
      { href: "/upload", label: "Upload", icon: Files,            iconColor: "text-violet-500", countKey: "documents" },
      { href: "/alerts",    label: "Alerts",    icon: TriangleAlert,    iconColor: "text-amber-500",  countKey: "alerts" },
      { href: "/services",  label: "Services",  icon: Building2,        iconColor: "text-teal-500",   countKey: "services" },
    ],
  },
  {
    title: "Features",
    items: [
      { href: "/calendar",  label: "Calendar",     icon: CalendarDays, iconColor: "text-cyan-500" },
      { href: "/reports",   label: "Reports",      icon: ChartColumn,  iconColor: "text-emerald-500" },
      { href: "/pricing",   label: "Subscription", icon: CreditCard,   iconColor: "text-pink-500" },
    ],
  },
  {
    title: "General",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, iconColor: "text-slate-400" },
    ],
  },
];

export default function DashboardSidebar({
  counts,
}: {
  counts: SidebarCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface)/0.9)] p-3 shadow-sm lg:h-full lg:rounded-none lg:border-0 lg:bg-transparent lg:p-5 lg:shadow-none">
      {/* Header */}
      <div className="-mx-3 -mt-3 mb-4 overflow-hidden lg:-mx-5 lg:-mt-5 lg:mb-5">
        <div className="relative bg-linear-to-br from-blue-600 via-blue-500 to-cyan-500 px-5 py-5">
          {/* subtle pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <span className="text-sm font-black text-white">D</span>
            </div>
            <div>
              <p className="text-lg font-bold leading-none tracking-tight text-white">Duey</p>
              <p className="mt-0.5 text-[10px] font-medium text-white/60 tracking-wide">Bill Tracker</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-ink))]">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
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
                      <span className="flex items-center gap-2.5">
                        <Icon className={cn("h-4 w-4 shrink-0", item.iconColor)} />
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
          </div>
        ))}
      </div>

      {/* Sign out */}
      <div className="mt-4 border-t border-[hsl(var(--line))] pt-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-[hsl(var(--ink))] transition hover:bg-[hsl(var(--bg)/0.9)] hover:text-red-500 outlines:variant-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
        >
          <span>Sign Out</span>
          <LogOut className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </nav>
  );
}
