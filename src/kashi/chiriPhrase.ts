const CHIRI_DURATION_MS = 2400;
const PARTICLES_PER_CHAR_MIN = 3;
const PARTICLES_PER_CHAR_MAX = 5;
const CHAR_STAGGER_MS = 32;

/**
 * 特定フレーズの歌詞を塵のように崩して右上へ飛ばす演出。
 * 粒子が消えた後も hiddenPhraseStartTime は次フレーズまで維持する。
 */
export class ChiriPhraseLayer {
  private animating = false;
  private hiddenPhraseStartTime: number | null = null;
  private paused = false;
  private cleanupTimer = 0;

  constructor(private readonly host: HTMLElement) {}

  isAnimating(): boolean {
    return this.animating;
  }

  getHiddenPhraseStartTime(): number | null {
    return this.hiddenPhraseStartTime;
  }

  begin(lyricDisplay: HTMLElement, phraseStartTime: number): void {
    if (this.animating || this.hiddenPhraseStartTime !== null) return;

    const charNodes = lyricDisplay.querySelectorAll<HTMLElement>(
      ".lyric-char--sung, .lyric-char--current",
    );
    if (charNodes.length === 0) return;

    this.animating = true;
    this.hiddenPhraseStartTime = phraseStartTime;
    this.host.replaceChildren();

    let charIndex = 0;
    let maxDelayMs = 0;

    for (const charEl of charNodes) {
      const text = charEl.textContent?.trim();
      if (!text) continue;

      const rect = charEl.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;

      const style = window.getComputedStyle(charEl);
      const baseFontPx = Number.parseFloat(style.fontSize) || 24;
      const particleCount =
        PARTICLES_PER_CHAR_MIN +
        Math.floor(Math.random() * (PARTICLES_PER_CHAR_MAX - PARTICLES_PER_CHAR_MIN + 1));

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("span");
        particle.className = "chiri-particle";
        particle.textContent = text;
        particle.style.fontWeight = style.fontWeight;
        particle.style.color = style.color;
        particle.style.fontSize = `${baseFontPx * (0.32 + Math.random() * 0.38)}px`;

        const ox = rect.left + Math.random() * rect.width;
        const oy = rect.top + Math.random() * rect.height;
        particle.style.left = `${ox}px`;
        particle.style.top = `${oy}px`;

        const driftX = 90 + Math.random() * 160;
        const driftY = -(70 + Math.random() * 120);
        particle.style.setProperty("--chiri-dx", `${driftX.toFixed(1)}px`);
        particle.style.setProperty("--chiri-dy", `${driftY.toFixed(1)}px`);
        particle.style.setProperty("--chiri-rot", `${(Math.random() - 0.5) * 48}deg`);

        const delayMs = charIndex * CHAR_STAGGER_MS + i * 14 + Math.random() * 40;
        const durationMs = 1700 + Math.random() * 700;
        particle.style.animationDelay = `${delayMs.toFixed(0)}ms`;
        particle.style.animationDuration = `${durationMs.toFixed(0)}ms`;
        maxDelayMs = Math.max(maxDelayMs, delayMs + durationMs);

        this.host.appendChild(particle);
      }

      charIndex++;
    }

    if (charIndex === 0) {
      this.animating = false;
      this.hiddenPhraseStartTime = null;
      return;
    }

    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = window.setTimeout(
      () => this.finishAnimation(),
      Math.max(CHIRI_DURATION_MS, maxDelayMs + 120),
    );
  }

  reset(): void {
    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = 0;
    this.host.replaceChildren();
    this.host.classList.remove("chiri-phrase-host--paused");
    this.animating = false;
    this.hiddenPhraseStartTime = null;
    this.paused = false;
  }

  /** 次フレーズ開始時 — 塵にした歌詞の非表示を解除 */
  releaseHiddenPhrase(nextPhraseStartTime: number): void {
    if (
      this.hiddenPhraseStartTime !== null &&
      nextPhraseStartTime !== this.hiddenPhraseStartTime
    ) {
      this.hiddenPhraseStartTime = null;
    }
  }

  pause(): void {
    if (this.paused || !this.animating) return;
    this.paused = true;
    this.host.classList.add("chiri-phrase-host--paused");
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.host.classList.remove("chiri-phrase-host--paused");
  }

  private finishAnimation(): void {
    this.host.replaceChildren();
    this.animating = false;
    this.paused = false;
    this.host.classList.remove("chiri-phrase-host--paused");
  }
}
