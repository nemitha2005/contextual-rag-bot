"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import Image from "next/image";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { signOutUser } from "@/lib/firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon } from "./icons";

function PureChatHeader({
  chatId,
  isReadonly,
}: {
  chatId: string;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background px-4 py-3 md:px-6">
      <SidebarToggle />
      <Button
        className="h-8 px-2 md:h-fit md:px-2"
        onClick={() => {
          router.push("/");
          router.refresh();
        }}
        variant="outline"
      >
        <PlusIcon />
        <span className="sr-only">New Chat</span>
      </Button>

      <span className="ml-2 font-semibold text-sm">Anthropic Agent</span>

      <div className="ml-auto flex items-center gap-2">
        {!loading && !user && (
          <>
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Sign up</Link>
            </Button>
          </>
        )}

        {!loading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                type="button"
              >
                <Image
                  alt={user.displayName ?? user.email ?? "User"}
                  className="rounded-full"
                  height={32}
                  src={
                    user.photoURL ??
                    `https://avatar.vercel.sh/${user.email}`
                  }
                  width={32}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="truncate font-medium text-sm">
                  {user.displayName ?? "User"}
                </p>
                <p className="truncate text-muted-foreground text-xs">
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-500 focus:text-red-500"
                onSelect={handleSignOut}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
