"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { AuthButtons } from "./AuthButtons";
import { UserMenu } from "./UserMenu";

export function AuthHeaderSlot() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="size-8" />;
  }

  if (user) {
    return <UserMenu />;
  }

  return <AuthButtons />;
}
