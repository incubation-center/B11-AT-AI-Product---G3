"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = React.useState<
    "loading" | "success" | "error" | "pending"
  >("pending");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const token = searchParams?.get("token");
    const error = searchParams?.get("error");

    if (error) {
      setStatus("error");
      setMessage(
        error === "expired"
          ? "Verification link has expired"
          : "Invalid verification link",
      );
      return;
    }

    if (token) {
      // Token is present, verification will be handled by better-auth automatically
      setStatus("loading");
      // Give it a moment to process
      setTimeout(() => {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      }, 1500);
    } else {
      setStatus("pending");
    }
  }, [searchParams]);

  return (
    <AuthPageShell
      title="Email Verification"
      description="Verify your email address to continue"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <h3 className="mb-2 text-lg font-semibold">Verifying your email</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500" />
              <h3 className="mb-2 text-lg font-semibold">Email Verified! ✓</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/sign-in">Continue to Sign In</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
              <XCircle className="mb-4 h-12 w-12 text-destructive" />
              <h3 className="mb-2 text-lg font-semibold">
                Verification Failed
              </h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/sign-up">Create New Account</Link>
              </Button>
              <Button asChild className="w-full" variant="ghost">
                <Link href="/sign-in">Back to Sign In</Link>
              </Button>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
              <Mail className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">Check Your Email</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a verification link to your email address. Click
                the link in the email to verify your account.
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive the email?{" "}
              <Link
                href="/resend-verification"
                className="text-primary hover:underline"
              >
                Resend verification email
              </Link>
            </p>
          </div>
        )}
      </motion.div>
    </AuthPageShell>
  );
}
