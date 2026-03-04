"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background px-4 py-20 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <h1 className="font-display text-5xl leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Never Miss a <span className="text-gradient">Payment</span> Again
            </h1>

            <p className="text-xl text-muted-foreground md:text-2xl">
              Track subscriptions, rentals, and bills in one place. Get
              reminders before you&apos;re charged.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6"
              >
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                See How It Works
              </Button>
            </div>
          </motion.div>

          {/* Right Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 transition-all hover:border-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <span className="text-xl">🎵</span>
                    </div>
                    <div>
                      <p className="font-medium">Spotify Premium</p>
                      <p className="text-sm text-muted-foreground">
                        Due in 3 days
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-lg">$9.99</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 transition-all hover:border-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <span className="text-xl">📺</span>
                    </div>
                    <div>
                      <p className="font-medium">Netflix</p>
                      <p className="text-sm text-muted-foreground">
                        Due in 12 days
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-lg">$15.99</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 transition-all hover:border-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <span className="text-xl">☁️</span>
                    </div>
                    <div>
                      <p className="font-medium">iCloud Storage</p>
                      <p className="text-sm text-muted-foreground">
                        Due in 21 days
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-lg">$2.99</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
