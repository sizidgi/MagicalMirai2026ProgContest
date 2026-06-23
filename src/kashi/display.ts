import type { IPhrase } from "textalive-app-api";
import {
  detectShushuSpans,
  findSpanForWord,
  makeSpanKey,
  resolveWordKind,
} from "../shushu/keywords";

export interface KashiRenderOptions {
  isSpanCollected: (spanKey: string) => boolean;
  activeFloatingSpanKeys: ReadonlySet<string>;
  spawnedSpanKeys: ReadonlySet<string>;
  /** 塵にしたフレーズは次フレーズまで歌詞パネルに出さない */
  hiddenPhraseStartTime?: number | null;
}

function isHiddenCollectWord(
  wordIndex: number,
  phrase: IPhrase,
  options: KashiRenderOptions,
): boolean {
  for (const span of detectShushuSpans(phrase)) {
    if (wordIndex < span.startWordIndex || wordIndex > span.endWordIndex) continue;
    const key = makeSpanKey(phrase.startTime, span);
    if (options.activeFloatingSpanKeys.has(key)) return true;
    if (options.spawnedSpanKeys.has(key) && !options.isSpanCollected(key)) return true;
  }
  return false;
}

/** フレーズ単位で、歌詞タイミングに合わせて1文字ずつ表示 */
export function renderPhraseKashi(
  container: HTMLElement,
  phrase: IPhrase | null,
  position: number,
  options: KashiRenderOptions,
): void {
  container.replaceChildren();
  if (!phrase) return;

  if (options.hiddenPhraseStartTime === phrase.startTime) {
    return;
  }

  phrase.children.forEach((word, wordIndex) => {
    if (isHiddenCollectWord(wordIndex, phrase, options)) {
      return;
    }

    const kind = resolveWordKind(wordIndex, phrase);
    const span = kind ? findSpanForWord(wordIndex, detectShushuSpans(phrase)) : null;
    const spanKey = span ? makeSpanKey(phrase.startTime, span) : null;
    const isShushuTarget =
      kind !== null && spanKey !== null && !options.isSpanCollected(spanKey);

    const wordEl = document.createElement("span");
    wordEl.className = "lyric-word";
    if (isShushuTarget && kind) {
      wordEl.classList.add("lyric-word--collect");
      wordEl.dataset.collectKind = kind;
      if (spanKey) {
        wordEl.dataset.collectSpanKey = spanKey;
      }
    }

    let hasVisibleChar = false;
    for (const char of word.children) {
      if (position < char.startTime) continue;
      hasVisibleChar = true;

      const charEl = document.createElement("span");
      charEl.textContent = char.text;
      const isCurrent = position <= char.endTime;
      charEl.className = isCurrent ? "lyric-char--current" : "lyric-char--sung";
      if (isShushuTarget) {
        charEl.classList.add("lyric-char--collect");
      }
      wordEl.appendChild(charEl);
    }

    if (hasVisibleChar) {
      container.appendChild(wordEl);
    }
  });
}

export function measureSpanAnchor(
  lyricDisplay: HTMLElement,
  spanKey: string,
): { x: number; y: number } {
  const node = lyricDisplay.querySelector<HTMLElement>(`[data-collect-span-key="${spanKey}"]`);
  if (node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  const panel = lyricDisplay.closest(".lyric-panel");
  const rect = panel?.getBoundingClientRect() ?? lyricDisplay.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 };
}
