export function once(id: string, mount: () => HTMLElement) {
  if (document.getElementById(id)) return;
  mount();
}
