"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Bell, FileText, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Get notified before payments hit. Never pay late fees again.",
  },
  {
    icon: FileText,
    title: "Upload Invoices",
    description: "Snap a photo or upload receipts. We'll extract the details.",
  },
  {
    icon: TrendingUp,
    title: "Spending Insights",
    description:
      "See where your money goes with monthly breakdowns and trends.",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
        <feature.icon className="h-7 w-7 text-accent" strokeWidth={2} />
      </div>
      <h3 className="font-display mb-2 text-2xl">{feature.title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section className="bg-secondary/30 px-4 py-20 md:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="font-display mb-4 text-4xl md:text-5xl">
            Everything you need to stay on top
          </h2>
          <p className="text-xl text-muted-foreground">
            Simple tools to manage all your recurring payments
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
