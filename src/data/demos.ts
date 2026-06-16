export interface Demo {
  slug: string;
  /** 生成 SVG 缩略图的函数，接收翻译后的标题文本 */
  thumbnailSvg: (label: string) => string;
}

export const demos: Demo[] = [];

export function getDemoBySlug(slug: string): Demo | undefined {
  return demos.find((demo) => demo.slug === slug);
}
