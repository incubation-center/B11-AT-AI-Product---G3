import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  basic: { amount: 900, label: "Duey Basic Plan" },
  pro: { amount: 1900, label: "Duey Pro Plan" },
};

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });

    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { plan?: string };
    const plan = body.plan;

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: { name: PLAN_PRICES[plan].label },
            unit_amount: PLAN_PRICES[plan].amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        plan,
      },
      customer_email: session.user.email,
      success_url: `${baseUrl}/settings?upgraded=${plan}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: "checkout_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
