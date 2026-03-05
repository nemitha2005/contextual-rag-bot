"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { signInWithEmail } from "@/lib/firebase/auth";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!emailValue || !password) {
      toast({ type: "error", description: "Failed validating your submission!" });
      return;
    }

    setEmail(emailValue);
    setIsPending(true);

    try {
      await signInWithEmail(emailValue, password);
      setIsSuccessful(true);
      router.push("/");
      router.refresh();
    } catch {
      toast({ type: "error", description: "Invalid credentials!" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign In</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful || isPending}>Sign in</SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/register"
            >
              Sign up
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
