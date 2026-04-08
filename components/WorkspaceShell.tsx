import DashboardSidebar from "@/components/DashboardSidebar";
import { ModeToggle } from "@/components/mode-toggle";

type SidebarCounts = {
  invoices: number;
  alerts: number;
  services: number;
  documents: number;
};

export default function WorkspaceShell({
  title,
  description,
  userName,
  sidebarCounts,
  children,
}: {
  title: string;
  description: string;
  userName: string;
  sidebarCounts: SidebarCounts;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(var(--bg))] text-[hsl(var(--ink))]">
      <div className="relative">
        <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-68 lg:border-r lg:border-[hsl(var(--line))] lg:bg-[hsl(var(--surface))]">
          <DashboardSidebar counts={sidebarCounts} />
        </aside>

        <div className="p-4 md:p-8 lg:ml-68">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-[hsl(var(--primary))]" />
                  <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ink))]">{title}</h1>
                    <p className="text-xs text-[hsl(var(--muted-ink))]">{description}</p>
                  </div>
                </div>
                <ModeToggle />
              </div>
            </div>

            <div>{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
