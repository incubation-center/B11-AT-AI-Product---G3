import Link from "next/link";
import { ShieldCheck, Bell, TrendingDown, RefreshCw } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function AuthPageShell({
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0a0f1e] dark:text-white">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-125 w-125 rounded-full bg-blue-300/30 blur-[100px] dark:bg-blue-600/15" />
        <div className="absolute -right-40 bottom-0 h-100 w-100 rounded-full bg-indigo-300/20 blur-[100px] dark:bg-indigo-500/10" />
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-20">
        <ModeToggle />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left panel — branding */}
        <div className="hidden w-105 shrink-0 flex-col justify-between border-r border-slate-200 bg-white/60 p-10 backdrop-blur-sm dark:border-white/5 dark:bg-white/2 lg:flex">
          <Link href="/" className="text-2xl font-bold tracking-tight text-[hsl(var(--primary))] dark:text-white">
            Duey
          </Link>

          <div className="space-y-6">
            <p className="text-3xl font-semibold leading-snug text-slate-800 dark:text-white/90">
              Track every bill.
              <br />
              <span className="bg-linear-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
                Never miss a payment.
              </span>
            </p>
            <p className="text-sm text-slate-500 dark:text-white/40">
              Upload invoices, get AI-powered reminders, and catch unusual charges before they become costly.
            </p>
            <div className="space-y-2.5">
              {[
                { icon: Bell, label: "Email & Telegram reminders" },
                { icon: RefreshCw, label: "Auto-recurring bill tracker" },
                { icon: TrendingDown, label: "AI cheaper alternatives" },
                { icon: ShieldCheck, label: "Anomaly detection" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm text-slate-500 dark:text-white/50">
                  <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-white/20">© {new Date().getFullYear()} Duey</p>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
          {/* Mobile logo */}
          <Link href="/" className="mb-8 text-2xl font-bold tracking-tight text-[hsl(var(--primary))] dark:text-white lg:hidden">
            Duey
          </Link>

          <div className="w-full max-w-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-white/40">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
