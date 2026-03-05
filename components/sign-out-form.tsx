"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth";

export const SignOutForm = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      className="w-full px-1 py-0.5 text-left text-red-500"
      type="button"
      onClick={handleSignOut}
    >
      Sign out
    </button>
  );
};
