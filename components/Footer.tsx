"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-6">
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <a
              href="/about"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </a>
            <a
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </a>
            <a
              href="/contact"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </a>
          </nav>
          <p className="text-sm text-muted-foreground">© {currentYear} Duey</p>
        </div>
      </div>
    </footer>
  );
}
