export async function copyText(text: string): Promise<boolean> {
  // Tampermonkey / Violentmonkey
  if (typeof GM_setClipboard === "function") {
    GM_setClipboard(text, "text");
    return true;
  }

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
