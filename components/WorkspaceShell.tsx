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
    <main className="relative min-h-screen overflow-hidden bg-[hsl(var(--bg))] p-4 text-[hsl(var(--ink))] md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--warning)/0.1),transparent_36%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-[hsl(var(--line))] bg-[hsl(var(--surface)/0.82)] p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
              <p className="mt-2 text-[hsl(var(--muted-ink))]">{description}</p>
            </div>
            <DashboardUserMenu name={userName} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <DashboardSidebar counts={sidebarCounts} />
          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
