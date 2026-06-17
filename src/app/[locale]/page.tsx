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
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700">
                {/* decorative circles */}
                <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-12 -left-6 size-36 rounded-full bg-white/5" />
                {/* notepad icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="72"
                    height="72"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                  >
                    <path d="M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                    <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
                    <path d="M9 12h6" />
                    <path d="M9 16h6" />
                    <path d="M9 8h4" />
                  </svg>
                </div>
                {/* title overlay */}
                <div className="absolute bottom-3 left-4">
                  <p className="text-lg font-bold text-white drop-shadow">{tTodo("title")}</p>
                  <p className="text-xs text-white/70">Memo</p>
                </div>
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
