"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Moon, RefreshCw, ShieldCheck, Sun, TrendingDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const isDark = !mounted || theme === "dark";

  return (
    <main className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#0a0f1e] text-white" : "bg-[#f4f7fb] text-[#0a0f1e]"}`}>
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-40 -top-40 h-150 w-150 rounded-full blur-[120px] ${isDark ? "bg-blue-600/20" : "bg-blue-400/20"}`} />
        <div className={`absolute -right-40 top-1/3 h-125 w-125 rounded-full blur-[100px] ${isDark ? "bg-indigo-500/15" : "bg-indigo-300/20"}`} />
        <div className={`absolute bottom-0 left-1/2 h-100 w-150 -translate-x-1/2 rounded-full blur-[100px] ${isDark ? "bg-cyan-500/10" : "bg-cyan-300/15"}`} />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)"
              : "linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-bold tracking-tight">Duey</span>
        <nav className="flex items-center gap-3">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`rounded-full p-2 transition ${isDark ? "text-white/60 hover:text-white hover:bg-white/10" : "text-[#0a0f1e]/60 hover:text-[#0a0f1e] hover:bg-black/10"}`}
          >
            {mounted && theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <Link
            href="/sign-in"
            className={`rounded-full px-4 py-2 text-sm transition ${isDark ? "text-white/70 hover:text-white" : "text-[#0a0f1e]/70 hover:text-[#0a0f1e]"}`}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${isDark ? "bg-white text-[#0a0f1e] hover:bg-white/90" : "bg-[#0a0f1e] text-white hover:bg-[#0a0f1e]/90"}`}
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className={`mb-6 inline-block rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide ${isDark ? "border-white/10 bg-white/5 text-white/60" : "border-black/10 bg-black/5 text-[#0a0f1e]/60"}`}>
            Smart Subscription &amp; Bill Tracking
          </span>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Never miss a{" "}
            <span className="bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              payment
            </span>{" "}
            again.
          </h1>
          <p className={`mt-6 max-w-xl text-lg ${isDark ? "text-white/50" : "text-[#0a0f1e]/55"}`}>
            Duey monitors your subscriptions, tracks due dates, and catches
            unusual charges — automatically.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 rounded-full bg-blue-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className={`rounded-full border px-7 py-3 text-sm font-semibold transition ${isDark ? "border-white/10 text-white/70 hover:border-white/30 hover:text-white" : "border-black/10 text-[#0a0f1e]/70 hover:border-black/30 hover:text-[#0a0f1e]"}`}
            >
              Sign in
            </Link>
          </div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 w-full perspective-[1400px]"
        >
          <div className={`relative mx-auto rounded-2xl border p-1 shadow-2xl backdrop-blur-sm transition-transform duration-500 md:transform-[rotateX(18deg)_scale(1.03)] md:hover:transform-[rotateX(14deg)_translateY(-6px)_scale(1.035)] ${isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"}`}>
            {/* Mockup top bar */}
            <div className={`flex items-center gap-1.5 rounded-t-xl px-4 py-3 ${isDark ? "bg-white/5" : "bg-black/5"}`}>
              <span className="h-3 w-3 rounded-full bg-red-400/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
              <span className="h-3 w-3 rounded-full bg-green-400/60" />
              <span className={`ml-4 text-xs ${isDark ? "text-white/30" : "text-black/30"}`}>dashboard</span>
            </div>

            {/* Mockup content */}
            <div className={`rounded-b-xl p-5 ${isDark ? "bg-[#0d1526]" : "bg-[#e8edf5]"}`}>
              {/* Stat row */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Invoices", value: "12" },
                  { label: "Recurring", value: "9" },
                  { label: "Alerts", value: "4" },
                  { label: "This Month", value: "$1,107" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-xl border p-3 ${isDark ? "border-white/5 bg-white/5" : "border-black/5 bg-white/60"}`}
                  >
                    <p className={`text-xs ${isDark ? "text-white/40" : "text-black/40"}`}>{s.label}</p>
                    <p className="mt-1 text-lg font-bold">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Bill list */}
              <div className="space-y-2">
                {[
                  { name: "Spotify Premium", due: "Due in 2 days", amount: "$9.99", badge: "bg-amber-400/20 text-amber-600", darkBadge: "bg-amber-400/20 text-amber-300", badgeLabel: "Due soon" },
                  { name: "Netflix", due: "Due in 12 days", amount: "$15.99", badge: "bg-blue-400/20 text-blue-600", darkBadge: "bg-blue-400/20 text-blue-300", badgeLabel: "Upcoming" },
                  { name: "Adobe Creative Cloud", due: "Due in 18 days", amount: "$54.99", badge: "bg-blue-400/20 text-blue-600", darkBadge: "bg-blue-400/20 text-blue-300", badgeLabel: "Upcoming" },
                  { name: "iCloud Storage", due: "Overdue by 1 day", amount: "$2.99", badge: "bg-red-400/20 text-red-600", darkBadge: "bg-red-400/20 text-red-300", badgeLabel: "Overdue" },
                ].map((bill) => (
                  <div
                    key={bill.name}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isDark ? "border-white/5 bg-white/5" : "border-black/5 bg-white/60"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
                        {bill.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{bill.name}</p>
                        <p className={`text-xs ${isDark ? "text-white/30" : "text-black/40"}`}>{bill.due}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isDark ? bill.darkBadge : bill.badge}`}>
                        {bill.badgeLabel}
                      </span>
                      <span className="text-sm font-semibold">{bill.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floor shadow for depth */}
            <div className="pointer-events-none absolute -bottom-10 left-1/2 h-16 w-[82%] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-2xl md:-bottom-12 md:h-20 md:blur-3xl" />
          </div>
        </motion.div>
      </section>

      {/* Feature pills */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-10 mx-auto mb-20 flex max-w-3xl flex-wrap justify-center gap-3 px-6"
      >
        {[
          { icon: Bell, label: "Email & Telegram reminders" },
          { icon: RefreshCw, label: "Auto-recurring tracker" },
          { icon: TrendingDown, label: "AI cheaper alternatives" },
          { icon: ShieldCheck, label: "Anomaly detection" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${isDark ? "border-white/10 bg-white/5 text-white/60" : "border-black/10 bg-black/5 text-[#0a0f1e]/60"}`}
          >
            <Icon className="h-4 w-4 text-blue-400" />
            {label}
          </div>
        ))}
      </motion.section>
    </main>
  );
}
