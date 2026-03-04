"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  {
    value: "10K+",
    label: "Users",
  },
  {
    value: "50K+",
    label: "Subscriptions Tracked",
  },
  {
    value: "$2M+",
    label: "Saved",
  },
];

export default function SocialProof() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="bg-secondary px-4 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <p className="font-display mb-2 text-5xl md:text-6xl">
                {stat.value}
              </p>
              <p className="text-muted-foreground text-lg">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
