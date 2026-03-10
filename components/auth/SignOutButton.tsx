"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
