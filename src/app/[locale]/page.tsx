import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale: _locale } = await params;
  const t = await getTranslations({ locale: _locale, namespace: "HomePage" });
  const tTodo = await getTranslations({ locale: _locale, namespace: "TodoList" });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("heroDescription")}
        </p>
      </section>

      {/* Tool Grid */}
      <section id="demos">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          {t("allDemos")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/todoList">
            <Card className="group h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
              <div className="aspect-video w-full bg-muted flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
                  <rect width="400" height="225" fill="#2563EB" rx="8"/>
                  <text x="200" y="105" textAnchor="middle" fill="white" fontSize="20" fontFamily="sans-serif" fontWeight="bold">{tTodo("title")}</text>
                  <text x="200" y="135" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="13" fontFamily="sans-serif">Memo</text>
                </svg>
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {tTodo("title")}
                  </CardTitle>
                  <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Tool
                  </span>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Memo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground">{tTodo("placeholder")}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
