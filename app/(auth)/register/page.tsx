"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { registerWithEmail } from "@/lib/firebase/auth";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = (formData.get("name") as string)?.trim();

    if (!emailValue || !password || !name) {
      toast({ type: "error", description: "Please fill in all fields." });
      return;
    }

    setEmail(emailValue);
    setIsPending(true);

    try {
      await registerWithEmail(emailValue, password, name);
      toast({ type: "success", description: "Verification email sent! Please check your inbox." });
      setIsSuccessful(true);
      router.push("/login");
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        toast({ type: "error", description: "Account already exists!" });
      } else {
        toast({ type: "error", description: "Failed to create account!" });
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-5 px-4 text-center sm:px-16">
          <Image
            src="/logo.png"
            alt="Logo"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email} showName>
          <SubmitButton isSuccessful={isSuccessful || isPending}>Sign Up</SubmitButton>
          <div className="relative my-2 flex items-center">
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
            <span className="mx-3 text-xs text-zinc-400">or</span>
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
          </div>
          <GoogleSignInButton />
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/login"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
