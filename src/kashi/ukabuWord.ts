import type { ShushuKeywordKind } from "../shushu/keywords";
import { isSpanKeyInPhrase } from "../shushu/keywords";

const UKABU_LIFETIME_MS = 10000;
const UKABU_FADE_MS = 2200;

interface UkabuItem {
  spanKey: string;
  kind: ShushuKeywordKind;
  el: HTMLButtonElement;
  bornAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * 歌い終わった収集ワード（ukabu word）を画面上に浮かべ、クリックで集める UI。
 */
export class UkabuWordLayer {
  private items: UkabuItem[] = [];
  private readonly spawnedSpanKeys = new Set<string>();
  private lastTick = performance.now();
  private paused = false;
  private pauseStartedAt = 0;
  private clockOffset = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly onCollect: (spanKey: string, kind: ShushuKeywordKind) => boolean,
    private readonly isSpanCollected: (spanKey: string) => boolean,
  ) {
    this.host.addEventListener("click", (event) => {
      if (this.paused) return;

      const el = (event.target as HTMLElement).closest<HTMLButtonElement>(".floating-collect");
      if (!el?.dataset.collectKind || !el.dataset.collectSpanKey) return;

      const kind = el.dataset.collectKind as ShushuKeywordKind;
      const spanKey = el.dataset.collectSpanKey;
      const item = this.items.find((entry) => entry.el === el);

      if (this.onCollect(spanKey, kind)) {
        if (item) {
          this.spawnedSpanKeys.delete(item.spanKey);
        }
        el.classList.add("floating-collect--got");
        window.setTimeout(() => el.remove(), 380);
        this.items = this.items.filter((entry) => entry.el !== el);
      }
    });

    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  hasSpawnedSpan(spanKey: string): boolean {
    return this.spawnedSpanKeys.has(spanKey);
  }

  getActiveFloatingSpanKeys(): ReadonlySet<string> {
    return new Set(this.items.map((item) => item.spanKey));
  }

  spawn(
    spanKey: string,
    kind: ShushuKeywordKind,
    label: string,
    originX: number,
    originY: number,
  ): void {
    if (this.isSpanCollected(spanKey) || this.spawnedSpanKeys.has(spanKey)) {
      return;
    }

    this.spawnedSpanKeys.add(spanKey);

    const el = document.createElement("button");
    el.type = "button";
    el.className = "floating-collect";
    el.textContent = label;
    el.dataset.collectKind = kind;
    el.dataset.collectSpanKey = spanKey;
    el.style.left = `${originX}px`;
    el.style.top = `${originY}px`;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    const speed = 0.028 + Math.random() * 0.022;

    this.host.appendChild(el);
    this.items.push({
      spanKey,
      kind,
      el,
      bornAt: performance.now() - this.clockOffset,
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  /** 同じフレーズが再び流れたとき、再び浮遊できるようにする */
  clearPhraseSpawn(phraseStartTime: number): void {
    for (const key of this.spawnedSpanKeys) {
      if (isSpanKeyInPhrase(phraseStartTime, key)) {
        this.spawnedSpanKeys.delete(key);
      }
    }
  }

  reset(): void {
    this.host.replaceChildren();
    this.items = [];
    this.spawnedSpanKeys.clear();
    this.paused = false;
    this.clockOffset = 0;
    this.host.classList.remove("floating-collect-host--paused");
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.pauseStartedAt = performance.now();
    this.host.classList.add("floating-collect-host--paused");
  }

  resume(): void {
    if (!this.paused) return;
    this.clockOffset += performance.now() - this.pauseStartedAt;
    this.paused = false;
    this.lastTick = performance.now();
    this.host.classList.remove("floating-collect-host--paused");
  }

  private tick(now: number): void {
    requestAnimationFrame(this.tick);
    if (this.paused) return;

    const delta = Math.min(48, now - this.lastTick);
    this.lastTick = now;
    const effectiveNow = now - this.clockOffset;

    this.items = this.items.filter((item) => {
      const age = effectiveNow - item.bornAt;
      if (age >= UKABU_LIFETIME_MS) {
        this.spawnedSpanKeys.delete(item.spanKey);
        item.el.remove();
        return false;
      }

      item.x += item.vx * delta;
      item.y += item.vy * delta;
      item.el.style.left = `${item.x}px`;
      item.el.style.top = `${item.y}px`;

      let opacity = 1;
      if (age > UKABU_LIFETIME_MS - UKABU_FADE_MS) {
        opacity = (UKABU_LIFETIME_MS - age) / UKABU_FADE_MS;
      }
      item.el.style.opacity = String(Math.max(0, opacity));
      return true;
    });
  }
}
