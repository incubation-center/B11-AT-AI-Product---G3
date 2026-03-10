"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface DashboardUserMenuProps {
  name: string;
}

export default function DashboardUserMenu({ name }: DashboardUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-4 py-2 text-sm font-medium transition hover:bg-[hsl(var(--bg))]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="max-w-36 truncate">{name}</span>
        <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-1 shadow-lg">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isLoading}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[hsl(var(--danger))] transition hover:bg-[hsl(var(--danger-soft))] disabled:opacity-70"
          >
            <LogOut size={15} />
            {isLoading ? "Signing out..." : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
