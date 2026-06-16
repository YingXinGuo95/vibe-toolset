import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Demo } from "@/data/demos";

interface DemoCardProps {
  demo: Demo;
  locale: string;
}

export async function DemoCard({ demo, locale }: DemoCardProps) {
  const t = await getTranslations({ locale, namespace: "Demos" });
  const title = t(`${demo.slug}.title`);
  const description = t(`${demo.slug}.description`);
  const subject = t(`${demo.slug}.subject`);

  return (
    <Link href={`/demos/${demo.slug}`}>
      <Card className="group h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
        <div
          className="aspect-video w-full bg-muted"
          dangerouslySetInnerHTML={{ __html: demo.thumbnailSvg(title) }}
        />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight">
              {title}
            </CardTitle>
            <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Tool
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {subject}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
