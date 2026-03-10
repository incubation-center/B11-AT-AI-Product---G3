"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { object } from "zod";
import { getPasswordSchema } from "@/lib/zod";

type ResetErrors = {
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
};

const resetSchema = object({
  newPassword: getPasswordSchema("password"),
  confirmPassword: getPasswordSchema("confirmPassword"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<ResetErrors>({});
  const [isUpdated, setIsUpdated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const strength = getPasswordStrength(newPassword);

  const validate = () => {
    const nextErrors: ResetErrors = {};
    const parsed = resetSchema.safeParse({ newPassword, confirmPassword });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "newPassword" && !nextErrors.newPassword) {
          nextErrors.newPassword = issue.message;
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

    const token = searchParams?.get("token");
    if (!token) {
      setErrors({ general: "Invalid or missing reset token" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (error) {
        setErrors({
          general:
            error.message || "Failed to reset password. Token may be expired.",
        });
        return;
      }

      setIsUpdated(true);
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Set new password"
      description="Choose a strong password for your account"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {isUpdated ? (
          <div className="space-y-4">
            <div className="rounded-md bg-secondary p-4">
              <p className="font-medium">Password updated successfully.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
            </div>
            <Button asChild className="w-full rounded-md">
              <Link href="/sign-in">Back to Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            {errors.general && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
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
                {errors.newPassword ? (
                  <p className="text-sm text-destructive">
                    {errors.newPassword}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                />
                {errors.confirmPassword ? (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </AuthPageShell>
  );
}
