import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardUserMenu from "@/components/DashboardUserMenu";

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.2),transparent_38%),radial-gradient(circle_at_bottom_right,hsl(var(--warning)/0.14),transparent_35%),radial-gradient(circle_at_60%_30%,hsl(var(--accent)/0.11),transparent_42%)]" />

      <div className="relative">
        <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-[272px] lg:border-r lg:border-[hsl(var(--line))] lg:bg-[linear-gradient(180deg,hsl(var(--surface)/0.96),hsl(var(--bg)/0.86))] lg:backdrop-blur-sm">
          <DashboardSidebar counts={sidebarCounts} />
        </aside>

        <div className="p-4 md:p-8 lg:ml-[272px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[hsl(var(--line))] bg-[hsl(var(--surface)/0.88)] p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
                  <p className="mt-2 text-[hsl(var(--muted-ink))]">{description}</p>
                </div>
                <DashboardUserMenu name={userName} />
              </div>
            </div>

            <div>{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
