"use client";

import * as React from "react";
import { Menu as MenuNamespace } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

function DropdownMenu(props: React.ComponentProps<typeof MenuNamespace.Root>) {
  return <MenuNamespace.Root {...props} />;
}

function DropdownMenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenuNamespace.Trigger>) {
  return (
    <MenuNamespace.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn("cursor-pointer outline-none", className)}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof MenuNamespace.Popup>) {
  return (
    <MenuNamespace.Portal>
      <MenuNamespace.Positioner
        align="end"
        sideOffset={4}
        className="z-50"
      >
        <MenuNamespace.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-32 overflow-hidden rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none",
            "origin-[var(--anchor-side)] enter-start:opacity-0 enter-start:scale-95 enter:opacity-100 enter:scale-100",
            className
          )}
          {...props}
        />
      </MenuNamespace.Positioner>
    </MenuNamespace.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuNamespace.Item>) {
  return (
    <MenuNamespace.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:bg-accent focus-visible:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
};
