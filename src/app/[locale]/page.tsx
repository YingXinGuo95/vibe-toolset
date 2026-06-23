import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _locale } = await params;

  return {
    title: "vibe coding 工具集合",
    description: "在线、免费、实用的工具箱，通过AI coding实现，快来试一试吧",
    openGraph: {
      title: "vibe coding 工具集合",
      description: "在线、免费、实用的工具箱，通过AI coding实现，快来试一试吧",
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale: _locale } = await params;
  const t = await getTranslations({ locale: _locale, namespace: "HomePage" });
  const tTodo = await getTranslations({ locale: _locale, namespace: "TodoList" });
  const tGomoku = await getTranslations({ locale: _locale, namespace: "Gomoku" });

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
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{t("memoDesc")}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/gomoku">
            <Card className="group h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-800">
                <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-12 -left-6 size-36 rounded-full bg-white/5" />
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
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                    <circle cx="12" cy="12" r="2" fill="white" stroke="none" />
                    <circle cx="7" cy="7" r="1.5" fill="white" stroke="none" />
                    <circle cx="17" cy="17" r="1.5" fill="white" stroke="none" />
                  </svg>
                </div>
                <div className="absolute bottom-3 left-4">
                  <p className="text-lg font-bold text-white drop-shadow">{tGomoku("title")}</p>
                  <p className="text-xs text-white/70">Excel</p>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{t("gomokuDesc")}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
