"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/zod";
import { toast } from "sonner";

type SignInErrors = {
  email?: string;
  password?: string;
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
        toast.error(error.message || "Invalid email or password");
        return;
      }

      toast.success("Signed in successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
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
      toast.error("Google sign-in failed. Please try again.");
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
            className="w-full rounded-md bg-[hsl(var(--primary))] text-accent-foreground transition hover:opacity-90 cursor-pointer"
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

        
          <Button
            variant="outline"
            className="w-full border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 cursor-pointer"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.16 3.56-8.66Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.73-2.46 1.17-4.07 1.17-3.13 0-5.78-2.12-6.73-4.97H1.26v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.33.6 4.57 1.77l3.43-3.43C17.95 1.16 15.23 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.1c.95-2.85 3.6-4.93 6.73-4.93Z"
              />
            </svg>
            Google
          </Button>
          
        

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
