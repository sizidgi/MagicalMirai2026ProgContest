import { getMaruHikariTextState } from "../narrative/maruHikariText";

/** maruHikari 中 — 球体中央の思い出テキスト */
export class MaruHikariTextOverlay {
  private activeKey = "";

  constructor(private readonly host: HTMLElement) {}

  update(positionMs: number, maruAlpha: number): void {
    const visible = maruAlpha > 0.01;
    this.host.style.opacity = String(Math.min(1, maruAlpha));
    this.host.setAttribute("aria-hidden", visible ? "false" : "true");

    if (!visible) {

      this.clear();

      return;
    }

    const state = getMaruHikariTextState(positionMs);

    if (!state) {

      this.clear();

      return;
    }

    const key = `${state.kind}:${state.text}`;
    
    if (key === this.activeKey) {
      return;
    }

    this.activeKey = key;
    this.host.replaceChildren();

    const el = document.createElement("p");
    el.className = `maru-hikari-text maru-hikari-text--${state.kind}`;
    el.textContent = state.text;
    this.host.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add("maru-hikari-text--visible");
    });
  }

  reset(): void {
    this.clear();
  }

  private clear(): void {
    this.activeKey = "";
    this.host.replaceChildren();
  }
}
