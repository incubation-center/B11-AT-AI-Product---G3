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
    <main className="min-h-screen bg-background">
      <section className="grid min-h-screen md:grid-cols-5">
        <div className="flex items-center justify-center px-4 py-10 md:col-span-3 md:px-10 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {description}
              </p>
            </div>
            {children}
          </div>
        </div>

        <aside className="relative hidden overflow-hidden bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] p-8 text-white md:col-span-2 md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[20px_20px]" />
          </div>
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-display text-lg">
                D
              </div>
              <p className="font-display text-2xl">Duey</p>
            </div>
            <p className="text-lg font-medium text-white/95">Track. Remind. Save.</p>
          </div>

          <div className="relative z-10">
            <div className="rounded-2xl border border-white/30 bg-white/15 p-4 backdrop-blur-sm">
              <p className="text-xs text-white/80">Upcoming payment</p>
              <div className="mt-3 rounded-xl bg-white/90 p-4 text-slate-800 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Spotify Premium</p>
                    <p className="text-xs text-slate-500">Due in 2 days</p>
                  </div>
                  <p className="font-display text-lg">$9.99</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
