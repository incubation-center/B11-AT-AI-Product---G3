"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [submittedEmail, setSubmittedEmail] = React.useState("");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setSubmittedEmail(email);
  };

  return (
    <AuthPageShell
      title="Reset your password"
      description="Enter your email and we'll send you a reset link"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {submittedEmail ? (
          <div className="space-y-5">
            <div className="rounded-md bg-secondary p-4">
              <div className="mb-2 flex items-center gap-2">
                <Mail size={16} />
                <p className="font-medium">Check your inbox!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a password reset link to {submittedEmail}
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-accent hover:underline">
                Back to Sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>

              <Button
                type="submit"
                className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90"
              >
                Send Reset Link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-accent hover:underline">
                Back to Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </AuthPageShell>
  );
}
