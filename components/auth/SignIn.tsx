"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Apple } from "lucide-react";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/zod";

type SignInErrors = {
  email?: string;
  password?: string;
  general?: string;
};

export default function SignIn() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<SignInErrors>({});
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const validate = () => {
    const nextErrors: SignInErrors = {};
    const parsed = signInSchema.safeParse({ email, password });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" && !nextErrors.email) {
          nextErrors.email = issue.message;
        }
        if (field === "password" && !nextErrors.password) {
          nextErrors.password = issue.message;
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
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setErrors({ general: error.message || "Invalid email or password" });
        return;
      }

      // Success! Redirect to dashboard or home
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      setErrors({ general: "Google sign-in failed" });
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Welcome back"
      description="Sign in to your Duey account"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {errors.general && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.general}
          </div>
        )}

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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-md bg-accent text-accent-foreground transition hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <p className="text-xs text-muted-foreground">or continue with</p>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="rounded-md"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <span className="text-base">G</span> Google
          </Button>
          <Button
            variant="outline"
            className="rounded-md"
            disabled
            title="Apple sign-in coming soon"
          >
            <Apple size={16} /> Apple
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </AuthPageShell>
  );
}
