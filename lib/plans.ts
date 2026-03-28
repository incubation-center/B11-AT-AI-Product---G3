export type Plan = "free" | "basic" | "pro";

export type PlanConfig = {
  name: string;
  label: string;
  maxBills: number | null; // null = unlimited
  features: {
    basicEmailAlerts: boolean;
    anomalyDetection: boolean;
    cheaperAlternatives: boolean;
    exportCsv: boolean;
    financialImpact: boolean;
    teamAccess: boolean;
  };
};

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: "free",
    label: "Free",
    maxBills: 10,
    features: {
      basicEmailAlerts: true,
      anomalyDetection: false,
      cheaperAlternatives: false,
      exportCsv: false,
      financialImpact: false,
      teamAccess: false,
    },
  },
  basic: {
    name: "basic",
    label: "Basic",
    maxBills: 30,
    features: {
      basicEmailAlerts: true,
      anomalyDetection: true,
      cheaperAlternatives: true,
      exportCsv: false,
      financialImpact: false,
      teamAccess: false,
    },
  },
  pro: {
    name: "pro",
    label: "Pro",
    maxBills: null,
    features: {
      basicEmailAlerts: true,
      anomalyDetection: true,
      cheaperAlternatives: true,
      exportCsv: true,
      financialImpact: true,
      teamAccess: true,
    },
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS[plan];
}

export function canAddBill(plan: Plan, currentCount: number): boolean {
  const config = PLANS[plan];
  if (config.maxBills === null) return true;
  return currentCount < config.maxBills;
}

export function hasFeature(
  plan: Plan,
  feature: keyof PlanConfig["features"],
): boolean {
  return PLANS[plan].features[feature];
}
