import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardUserMenu from "@/components/DashboardUserMenu";
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
        <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-[272px] lg:border-r lg:border-[hsl(var(--line))] lg:bg-[hsl(var(--surface))]">
          <DashboardSidebar counts={sidebarCounts} />
        </aside>

        <div className="p-4 md:p-8 lg:ml-[272px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[hsl(var(--primary))] bg-[hsl(var(--primary))] p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
                  <p className="mt-2 text-white/85">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ModeToggle />
                  <DashboardUserMenu name={userName} />
                </div>
              </div>
            </div>

            <div>{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
