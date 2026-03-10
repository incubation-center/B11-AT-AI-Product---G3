"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function ResendVerification() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Use the better-auth client to resend verification email
      const { error: resendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });

      if (resendError) {
        setError(
          resendError.message ||
            "Failed to send verification email. Please try again.",
        );
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Resend Verification Email"
      description="Enter your email to receive a new verification link"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {success ? (
          <div className="space-y-5">
            <div className="rounded-md bg-secondary p-4">
              <div className="mb-2 flex items-center gap-2">
                <Mail size={16} className="text-primary" />
                <p className="font-medium">Verification Email Sent!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a new verification link to {email}. Please check
                your inbox and spam folder.
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/sign-in">Go to Sign In</Link>
              </Button>
              <Button asChild className="w-full" variant="ghost">
                <Link href="/verify-email">Check Verification Status</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send Verification Email"}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
              <p>
                Already verified?{" "}
                <Link href="/sign-in" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
              <p>
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </AuthPageShell>
  );
}
