"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Mail, Lock, User, UserPlus, AlertCircle } from "lucide-react";

/** Simple email format check. */
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RegisterForm() {
  const t = useTranslations("Auth");
  const { register } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError(t("errorUsernameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("errorEmailRequired"));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t("errorInvalidEmail"));
      return;
    }
    if (!password) {
      setError(t("errorPasswordRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordsDontMatch"));
      return;
    }

    setLoading(true);
    const result = await register({ username, email, password });
    setLoading(false);

    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error ?? t("errorInvalidCredentials"));
    }
  }

  return (
    <Card className="w-full max-w-md border-0 bg-card/80 p-2.5 shadow-lg shadow-black/[0.04] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-500">
      <CardHeader className="pb-4 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
          <UserPlus className="size-5 text-primary-foreground" />
        </div>
        <CardTitle className="text-xl font-semibold">{t("registerTitle")}</CardTitle>
        <CardDescription className="text-sm">
          {t("registerDescription")}
        </CardDescription>
      </CardHeader>

      {error && (
        <div className="mx-(--card-spacing) mb-2 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground/80">
              {t("username")}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder={t("username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="reg-email" className="text-sm font-medium text-foreground/80">
              {t("email")}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="reg-password" className="text-sm font-medium text-foreground/80">
              {t("password")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground/80">
              {t("confirmPassword")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="h-10 pl-9"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-t-0 bg-transparent pb-6 mt-5">
          <Button type="submit" size="lg" className="w-full gap-1.5" disabled={loading}>
            {loading ? (
              <>
                <svg
                  className="size-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("registering")}
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                {t("registerButton")}
              </>
            )}
          </Button>
          <div className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <span>{t("hasAccount")}</span>
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("login")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
