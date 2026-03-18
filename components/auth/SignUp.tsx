"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/zod";
import { toast } from "sonner";

type SignUpErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const getErrorMessage = (error: unknown) => {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return null;
};

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<SignUpErrors>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const validate = () => {
    const nextErrors: SignUpErrors = {};
    const parsed = signUpSchema.safeParse({
      name: fullName,
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name" && !nextErrors.fullName) {
          nextErrors.fullName = issue.message;
        }
        if (field === "email" && !nextErrors.email) {
          nextErrors.email = issue.message;
        }
        if (field === "password" && !nextErrors.password) {
          nextErrors.password = issue.message;
        }
        if (field === "confirmPassword" && !nextErrors.confirmPassword) {
          nextErrors.confirmPassword = issue.message;
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: fullName,
      });

      if (error) {
        toast.error(getErrorMessage(error) || "Unable to create account right now. Please try again.");
        return;
      }

      toast.success("Account created! Please check your email to verify.");
      router.push("/verify-email");
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
              placeholder="Create a password"
            />
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
              disabled={isLoading}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthPageShell>
  );
}
