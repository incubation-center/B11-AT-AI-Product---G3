import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import DashboardUserMenu from "@/components/DashboardUserMenu";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(var(--bg))] p-4 text-[hsl(var(--ink))] md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--warning)/0.1),transparent_36%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-[hsl(var(--line))] bg-[hsl(var(--surface)/0.82)] p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                Welcome, {session.user.name}!
              </h1>
              <p className="mt-2 text-[hsl(var(--muted-ink))]">
                Here&apos;s an overview of your subscriptions and billing health.
              </p>
            </div>

            <DashboardUserMenu name={session.user.name || "User"} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm transition hover:-translate-y-0.5">
            <h3 className="text-sm font-medium text-[hsl(var(--muted-ink))]">
              Total Contracts
            </h3>
            <p className="mt-3 text-3xl font-bold">0</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
              No contracts uploaded yet
            </p>
          </article>

          <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm transition hover:-translate-y-0.5">
            <h3 className="text-sm font-medium text-[hsl(var(--muted-ink))]">
              Active Bills
            </h3>
            <p className="mt-3 text-3xl font-bold">0</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
              No bills tracked yet
            </p>
          </article>

          <article className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm transition hover:-translate-y-0.5">
            <h3 className="text-sm font-medium text-[hsl(var(--muted-ink))]">
              Anomalies Detected
            </h3>
            <p className="mt-3 text-3xl font-bold text-amber-500">0</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
              All bills look normal
            </p>
          </article>
        </div>

        <section className="mt-6 rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <button className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4 text-left transition hover:bg-[hsl(var(--bg))]">
              <h3 className="font-semibold">Upload Contract</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
                Upload a PDF or image of your contract
              </p>
            </button>
            <button className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-4 text-left transition hover:bg-[hsl(var(--bg))]">
              <h3 className="font-semibold">Add Bill</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-ink))]">
                Manually add a new bill to track
              </p>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
