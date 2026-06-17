"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MergeAnonymousDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anonymousCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function MergeAnonymousDialog({
  open,
  onOpenChange,
  anonymousCount,
  onConfirm,
  onCancel,
  t,
}: MergeAnonymousDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mergeAnonymousTitle")}</DialogTitle>
          <DialogDescription>
            {t("mergeAnonymousDescription", { count: anonymousCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("mergeAnonymousCancel")}
          </Button>
          <Button onClick={onConfirm}>{t("mergeAnonymousConfirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
