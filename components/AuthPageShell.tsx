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
      <section className="flex min-h-screen items-center justify-center px-4 py-10 md:px-8">
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
      </section>
    </main>
  );
}
