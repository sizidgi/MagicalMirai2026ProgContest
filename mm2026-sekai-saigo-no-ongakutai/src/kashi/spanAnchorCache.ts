/** 収集ワードの画面上位置（フレーズ切替直前でも浮遊の出発点に使う） */
const cache = new Map<string, { x: number; y: number }>();

export function rememberSpanAnchors(lyricDisplay: HTMLElement): void {
  lyricDisplay.querySelectorAll<HTMLElement>("[data-collect-span-key]").forEach((node) => {
    const spanKey = node.dataset.collectSpanKey;
    if (!spanKey) return;
    const rect = node.getBoundingClientRect();
    cache.set(spanKey, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });
}

export function getRememberedSpanAnchor(
  spanKey: string,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  return cache.get(spanKey) ?? fallback;
}

export function clearSpanAnchorCache(): void {
  cache.clear();
}
