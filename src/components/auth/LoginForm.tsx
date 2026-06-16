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
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("Auth");
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("errorEmailRequired"));
      return;
    }
    if (!password) {
      setError(t("errorPasswordRequired"));
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      router.push("/");
    } else {
      setError(t(result.error ?? "errorInvalidCredentials"));
    }
  }

  return (
    <Card className="w-full max-w-md border-0 bg-card/80 p-4 shadow-lg shadow-black/[0.04] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-500">
      <CardHeader className="pb-4 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
          <LogIn className="size-5 text-primary-foreground" />
        </div>
        <CardTitle className="text-xl font-semibold">{t("loginTitle")}</CardTitle>
        <CardDescription className="text-sm">
          {t("loginDescription")}
        </CardDescription>
      </CardHeader>

      {error && (
        <div className="mx-(--card-spacing) mb-2 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground/80">
              {t("email")}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="demo@mathdemos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground/80">
              {t("password")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="h-10 pl-9"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-t-0 bg-transparent pb-6">
          <Button type="submit" size="lg" className="w-full gap-1.5 mt-3" disabled={loading}>
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
                {t("loggingIn")}
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                {t("loginButton")}
              </>
            )}
          </Button>
          <div className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <span>{t("noAccount")}</span>
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("register")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
