"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResetErrors = {
  newPassword?: string;
  confirmPassword?: string;
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function ResetPassword() {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<ResetErrors>({});
  const [isUpdated, setIsUpdated] = React.useState(false);
  const strength = getPasswordStrength(newPassword);

  const validate = () => {
    const nextErrors: ResetErrors = {};
    if (!newPassword) nextErrors.newPassword = "New password is required";
    if (newPassword && newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validate()) setIsUpdated(true);
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
              <Link href="/login">Back to Sign in</Link>
            </Button>
          </div>
        ) : (
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
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
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
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90"
            >
              Update Password
            </Button>
          </form>
        )}
      </motion.div>
    </AuthPageShell>
  );
}
