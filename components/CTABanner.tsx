"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function CTABanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="px-4 py-20 md:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-linear-to-r from-accent to-[hsl(12_90%_50%)] px-8 py-16 text-center md:px-16 md:py-20"
        >
          <h2 className="font-display mb-6 text-4xl text-white md:text-5xl lg:text-6xl">
            Start tracking your subscriptions today
          </h2>
          <Button
            size="lg"
            variant="outline"
            className="border-white bg-transparent text-white hover:bg-white hover:text-accent text-lg px-8 py-6"
          >
            Sign Up Free
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
