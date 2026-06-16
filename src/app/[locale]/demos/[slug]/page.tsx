import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getDemoBySlug, demos } from "@/data/demos";
import { locales } from "@/i18n/config";
import { DemoShell } from "./DemoShell";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const paths = locales.flatMap((locale) =>
    demos.map((demo) => ({ locale, slug: demo.slug }))
  );
  return paths;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const demo = getDemoBySlug(slug);
  if (!demo) return {};
  const t = await getTranslations({ locale, namespace: "Demos" });
  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.description`),
  };
}

export default async function DemoPage({ params }: Props) {
  const { locale, slug } = await params;
  const demo = getDemoBySlug(slug);

  if (!demo) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Demos" });
  const title = t(`${slug}.title`);
  const description = t(`${slug}.description`);
  const thumbnailHtml = demo.thumbnailSvg(title);

  return (
    <DemoShell
      title={title}
      description={description}
      thumbnailHtml={thumbnailHtml}
    />
  );
}
