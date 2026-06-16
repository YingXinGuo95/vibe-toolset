import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold">VibeApp</h3>
            <p className="text-xs text-muted-foreground">{t("description")}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("headingLinks")}</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t("navHome")}
                </Link>
              </li>
              <li>
                <Link href="/#demos" className="hover:text-foreground transition-colors">
                  {t("navDemos")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("headingAbout")}</h3>
            <p className="text-xs text-muted-foreground">{t("aboutText")}</p>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>{t("disclaimer")}</p>
          <p className="mt-1">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
