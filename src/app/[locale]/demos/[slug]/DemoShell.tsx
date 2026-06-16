"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface DemoShellProps {
  title: string;
  description: string;
  thumbnailHtml: string;
}

export function DemoShell({
  title,
  description,
  thumbnailHtml,
}: DemoShellProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [count, setCount] = useState(0);
  const t = useTranslations("DemoShell");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          {t("breadcrumbHome")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{title}</span>
      </div>

      {/* Title */}
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mb-8 text-muted-foreground">{description}</p>

      {/* Interactive Area */}
      <div className="mb-8 overflow-hidden rounded-xl border bg-card">
        <div className="aspect-video w-full bg-muted flex items-center justify-center">
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: thumbnailHtml }}
          />
        </div>

        {/* Control Panel Placeholder */}
        <div className="border-t bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            {t("controlPanel")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCount((c) => c + 1)}
            >
              {t("clickCount", { count })}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCount(0)}>
              {t("reset")}
            </Button>
          </div>
        </div>
      </div>

      {/* Teacher's Notes */}
      <Collapsible
        open={notesOpen}
        onOpenChange={setNotesOpen}
        className="rounded-xl border"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer">
          <span>{t("teacherNotes")}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              notesOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4 text-sm text-muted-foreground">
          <h4 className="mb-2 font-semibold text-foreground">
            {t("mathConcepts")}
          </h4>
          <p className="mb-4">{t("mathConceptsDesc")}</p>
          <h4 className="mb-2 font-semibold text-foreground">
            {t("discussionQuestions")}
          </h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("q1")}</li>
            <li>{t("q2")}</li>
            <li>{t("q3")}</li>
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
