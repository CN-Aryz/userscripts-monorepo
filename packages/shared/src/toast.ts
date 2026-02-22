export function toast(msg: string, ms = 1600) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position: fixed;
    left: 50%;
    top: 14%;
    transform: translateX(-50%);
    z-index: 999999;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(0,0,0,.78);
    color: #fff;
    font-size: 13px;
    line-height: 1;
    box-shadow: 0 6px 20px rgba(0,0,0,.25);
    user-select: none;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
