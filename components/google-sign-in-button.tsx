"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsPending(true);
    try {
      await signInWithGoogle();
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") {
        toast({ type: "error", description: "Google sign-in failed. Try again." });
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      className="flex w-full items-center gap-2"
      disabled={isPending}
      onClick={handleGoogleSignIn}
      type="button"
      variant="outline"
    >
      <SiGoogle className="size-4" />
      {isPending ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}
