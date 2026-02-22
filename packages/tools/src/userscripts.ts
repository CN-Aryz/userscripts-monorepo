export type UserscriptMeta = {
  name: string;
  namespace?: string;
  version: string;
  description?: string;
  author?: string;
  match?: string[];
  include?: string[];
  exclude?: string[];
  icon?: string;
  license?: string;
  runAt?: string;

  /** 更新地址 */
  updateURL?: string;
  /** 下载地址 */
  downloadURL?: string;

  grant?: string[];
  connect?: string[];

  // 允许你扩展其它字段（比如 require/resource 等）
  [key: string]: unknown;
};

function push(lines: string[], key: string, value: unknown) {
  if (value == null) return;

  // userscript header 里 key 是 @run-at 这种
  const headerKey = key === "runAt" ? "run-at" : key;

  if (Array.isArray(value)) {
    for (const v of value) {
      if (v == null) continue;
      lines.push(`// @${headerKey} ${String(v)}`);
    }
    return;
  }

  lines.push(`// @${headerKey} ${String(value)}`);
}

export function metaToHeader(meta: UserscriptMeta): string {
  const lines: string[] = [];
  lines.push("// ==UserScript==");

  // 按常见顺序输出，保证稳定 diff
  push(lines, "name", meta.name);
  push(lines, "namespace", meta.namespace);
  push(lines, "version", meta.version);
  push(lines, "description", meta.description);
  push(lines, "author", meta.author);

  push(lines, "match", meta.match);
  push(lines, "include", meta.include);
  push(lines, "exclude", meta.exclude);

  push(lines, "icon", meta.icon);
  push(lines, "license", meta.license);
  push(lines, "runAt", meta.runAt);

  push(lines, "updateURL", meta.updateURL);
  push(lines, "downloadURL", meta.downloadURL);

  push(lines, "grant", meta.grant);
  push(lines, "connect", meta.connect);

  // 输出额外字段（可选）：把上面没覆盖的 key 也输出
  // 你如果不想自动输出扩展字段，删掉下面这段即可
  const known = new Set([
    "name",
    "namespace",
    "version",
    "description",
    "author",
    "match",
    "include",
    "exclude",
    "icon",
    "license",
    "runAt",
    "updateURL",
    "downloadURL",
    "grant",
    "connect",
  ]);
  for (const [k, v] of Object.entries(meta)) {
    if (known.has(k)) continue;
    // 跳过对象类型，避免把复杂结构塞进 header
    if (typeof v === "object" && v !== null && !Array.isArray(v)) continue;
    push(lines, k, v);
  }

  lines.push("// ==/UserScript==");
  return lines.join("\n");
}

export function userscriptHeaderInject(header: string, fileName: string) {
  return {
    name: "userscript-header-inject",
    generateBundle(_: any, bundle: any) {
      const chunk = bundle[fileName];
      if (!chunk || chunk.type !== "chunk") return;
      chunk.code = header + "\n\n" + chunk.code;
    },
  };
}
