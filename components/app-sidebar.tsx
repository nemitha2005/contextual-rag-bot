"use client";

import Link from "next/link";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarHistory } from "@/components/sidebar-history";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { user } = useFirebaseAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader className="px-4 pb-3 pt-6">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory />
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4">
        {user ? (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Image
                src={user.photoURL ?? `https://avatar.vercel.sh/${user.email}`}
                alt={user.displayName ?? "User"}
                width={32}
                height={32}
                className="rounded-full shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm leading-tight">
                  {user.displayName ?? "User"}
                </p>
                <p className="truncate text-muted-foreground text-xs leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
              <Button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                type="button"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-3.5" />
                ) : (
                  <Moon className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-muted-foreground text-xs">
              {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
            </span>
            <Button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              size="sm"
              variant="ghost"
              type="button"
              className="text-muted-foreground"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}