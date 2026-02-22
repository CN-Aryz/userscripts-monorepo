export function getBv(): string | null {
  const m = location.pathname.match(/\/video\/(BV[0-9A-Za-z]{10})/);
  if (m) return m[1];

  // 番剧页 fallback（弱匹配）
  const html = document.documentElement.innerHTML;
  const m2 = html.match(/BV[0-9A-Za-z]{10}/);
  return m2 ? m2[0] : null;
}

export function canonicalUrl(): string {
  return (
    document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
    location.href
  );
}
