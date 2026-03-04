"use client";

import { useRouter } from "next/navigation";

// TODO: wire this up to your real backend sign-out logic
export const SignOutForm = () => {
  const router = useRouter();

  return (
    <button
      className="w-full px-1 py-0.5 text-left text-red-500"
      type="button"
      onClick={() => router.push("/")}
    >
      Sign out
    </button>
  );
};
