/**
 * 国际化配置 — 单一配置源
 *
 * Fork 项目时，只需修改此文件即可控制语言支持：
 *   1. 增删 `locales` 数组中的条目
 *   2. 对应创建/删除 `/messages/{locale}.json` 文件
 *   3. (可选) 修改 `defaultLocale`
 */

export type Locale = (typeof locales)[number];

export const locales = ["zh", "en"] as const;

export const defaultLocale = "zh" satisfies Locale;

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

/**
 * as-needed: 默认语言无前缀 (/ → zh)，其他语言带前缀 (/en)  ← 当前使用
 * always:    所有语言都带前缀 (/zh, /en)
 * never:     无前缀（基于域名的语言识别）
 */
export const localePrefix = "as-needed" as const;
