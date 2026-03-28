"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bell, RefreshCw, ShieldCheck, TrendingDown } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0f1e] text-white">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-500/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-bold tracking-tight">Duey</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0a0f1e] transition hover:bg-white/90"
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
          <span className="mb-6 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/60">
            Smart Subscription &amp; Bill Tracking
          </span>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Never miss a{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              payment
            </span>{" "}
            again.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/50">
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
              className="rounded-full border border-white/10 px-7 py-3 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
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
          className="mt-16 w-full"
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
            {/* Mockup top bar */}
            <div className="flex items-center gap-1.5 rounded-t-xl bg-white/5 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
              <span className="h-3 w-3 rounded-full bg-green-400/60" />
              <span className="ml-4 text-xs text-white/30">duey.app/dashboard</span>
            </div>

            {/* Mockup content */}
            <div className="rounded-b-xl bg-[#0d1526] p-5">
              {/* Stat row */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Invoices", value: "12", color: "border-l-blue-500" },
                  { label: "Recurring", value: "9", color: "border-l-cyan-500" },
                  { label: "Alerts", value: "4", color: "border-l-amber-400" },
                  { label: "This Month", value: "$1,107", color: "border-l-green-500" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-xl border-l-4 border border-white/5 bg-white/5 p-3 ${s.color}`}
                  >
                    <p className="text-xs text-white/40">{s.label}</p>
                    <p className="mt-1 text-lg font-bold">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Bill list */}
              <div className="space-y-2">
                {[
                  { name: "Spotify Premium", due: "Due in 2 days", amount: "$9.99", badge: "bg-amber-400/20 text-amber-300", badgeLabel: "Due soon" },
                  { name: "Netflix", due: "Due in 12 days", amount: "$15.99", badge: "bg-blue-400/20 text-blue-300", badgeLabel: "Upcoming" },
                  { name: "Adobe Creative Cloud", due: "Due in 18 days", amount: "$54.99", badge: "bg-blue-400/20 text-blue-300", badgeLabel: "Upcoming" },
                  { name: "iCloud Storage", due: "Overdue by 1 day", amount: "$2.99", badge: "bg-red-400/20 text-red-300", badgeLabel: "Overdue" },
                ].map((bill) => (
                  <div
                    key={bill.name}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
                        {bill.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{bill.name}</p>
                        <p className="text-xs text-white/30">{bill.due}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bill.badge}`}>
                        {bill.badgeLabel}
                      </span>
                      <span className="text-sm font-semibold">{bill.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60"
          >
            <Icon className="h-4 w-4 text-blue-400" />
            {label}
          </div>
        ))}
      </motion.section>
    </main>
  );
}
