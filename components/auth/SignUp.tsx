"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignUpErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function SignUp() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<SignUpErrors>({});
  const strength = getPasswordStrength(password);

  const validate = () => {
    const nextErrors: SignUpErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!email.trim()) nextErrors.email = "Email is required";
    if (!email.includes("@")) nextErrors.email = "Enter a valid email address";
    if (!password) nextErrors.password = "Password is required";
    if (password && password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    if (!acceptedTerms) nextErrors.terms = "You must accept terms to continue";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    validate();
  };

  return (
    <AuthPageShell
      title="Create your account"
      description="Start tracking your subscriptions for free"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="John Doe"
            />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            ) : null}
          </div>

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
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a strong password"
            />
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 4 }).map((_, index) => {
                const active = index < strength;
                const shade =
                  index === 0
                    ? "bg-destructive"
                    : index < 3
                      ? "bg-amber-500"
                      : "bg-emerald-500";
                return (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full ${active ? shade : "bg-muted"}`}
                  />
                );
              })}
            </div>
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span>
                I agree to the{" "}
                <Link href="#" className="text-accent hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms ? (
              <p className="text-sm text-destructive">{errors.terms}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90"
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthPageShell>
  );
}
