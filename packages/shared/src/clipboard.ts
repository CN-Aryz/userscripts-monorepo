import { GM_setClipboard } from "vite-plugin-monkey/dist/client";

export async function copyText(text: string): Promise<boolean> {
  try {
    GM_setClipboard(text, "text");
    return true;
  } catch {}

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch {
    return false;
  }
}
