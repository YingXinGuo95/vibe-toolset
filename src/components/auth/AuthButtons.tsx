"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const t = useTranslations("Auth");

  return (
    <>
      <Link href="/login">
        <Button variant="ghost" size="sm">
          {t("login")}
        </Button>
      </Link>
      <Link href="/register">
        <Button variant="default" size="sm">
          {t("register")}
        </Button>
      </Link>
    </>
  );
}
