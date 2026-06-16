import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale, localePrefix } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
});

// 导出 locale-aware 的路由工具（组件中使用这些替代 next/link 等）
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
