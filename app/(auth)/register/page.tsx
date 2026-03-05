"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthForm } from "@/components/auth-form";
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

    if (!emailValue || !password) {
      toast({ type: "error", description: "Failed validating your submission!" });
      return;
    }

    setEmail(emailValue);
    setIsPending(true);

    try {
      await registerWithEmail(emailValue, password);
      toast({ type: "success", description: "Account created successfully!" });
      setIsSuccessful(true);
      router.push("/");
      router.refresh();
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
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign Up</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful || isPending}>Sign Up</SubmitButton>
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
