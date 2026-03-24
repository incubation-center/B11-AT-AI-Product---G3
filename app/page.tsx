import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(var(--bg))] text-[hsl(var(--ink))]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight"
          >
            Duey
          </Link>

          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </nav>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-4 rounded-full border border-[hsl(var(--line))] bg-[hsl(var(--surface)/0.75)] px-4 py-1.5 text-xs font-medium tracking-wide text-[hsl(var(--muted-ink))]">
            Smart Subscription and Bill Tracking
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">
            Never miss a payment again.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-[hsl(var(--muted-ink))] md:text-lg">
            Duey helps you monitor subscriptions, track due dates, and catch
            unusual charges before they become costly.
          </p>

          <div className="mt-10">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/sign-in">
                Get Started
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
