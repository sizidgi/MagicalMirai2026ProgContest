import type { IPhrase } from "textalive-app-api";

/** 歌詞から集められるキーワードの種類 */
export type ShushuKeywordKind = "ongaku" | "senritsu" | "melody" | "uta" | "koe";

export type NoteKind = ShushuKeywordKind;

export const SHUSHU_KEYWORD_LABELS = ["オンガク", "旋律", "メロディ", "歌", "コエ"] as const;

export const SHUSHU_KEYWORD_ALIASES: Record<ShushuKeywordKind, string[]> = {
  ongaku: ["オンガク", "音楽"],
  senritsu: ["旋律"],
  melody: ["メロディ"],
  uta: ["歌"],
  koe: ["コエ"],
};

export const COLLECT_ALIASES = SHUSHU_KEYWORD_ALIASES;

export function getShushuLabel(kind: ShushuKeywordKind): string {
  return SHUSHU_KEYWORD_ALIASES[kind][0];
}

export function getCollectLabel(kind: ShushuKeywordKind): string {
  return getShushuLabel(kind);
}

/** フレーズ内の1か所分の収集対象 */
export interface ShushuSpan {
  kind: ShushuKeywordKind;
  label: string;
  startWordIndex: number;
  endWordIndex: number;
  startTime: number;
  endTime: number;
  /** compact 文字列内の開始位置 */
  compactStart: number;
  /** compact 文字列内の終了位置（排他的） */
  compactEnd: number;
}

export type CollectSpan = ShushuSpan;

interface PhraseTextIndex {
  compact: string;
  wordRanges: { start: number; end: number }[];
}

export function makeSpanKey(phraseStartTime: number, span: ShushuSpan): string {
  return `${phraseStartTime}-${span.kind}-${span.label}-${span.startWordIndex}`;
}

export function collectSpanKey(phraseStartTime: number, span: ShushuSpan): string {
  return makeSpanKey(phraseStartTime, span);
}

export function isSpanKeyInPhrase(phraseStartTime: number, spanKey: string): boolean {
  return spanKey.startsWith(`${phraseStartTime}-`);
}

/** 文字タイミングと一致する compact 文字列を構築 */
function buildPhraseTextIndex(words: IPhrase["children"]): PhraseTextIndex {
  let compact = "";
  const wordRanges: { start: number; end: number }[] = [];

  for (const word of words) {
    const start = compact.length;
    if (word.children.length > 0) {
      for (const char of word.children) {
        compact += char.text;
      }
    } else {
      compact += word.text;
    }
    wordRanges.push({ start, end: compact.length });
  }

  return { compact, wordRanges };
}

export function wordToShushuKind(word: string): ShushuKeywordKind | null {
  if (/オンガク|音楽/.test(word)) return "ongaku";
  if (/メロディ/.test(word)) return "melody";
  if (/旋律/.test(word)) return "senritsu";
  if (/コエ/.test(word)) return "koe";
  if (/歌/.test(word)) return "uta";
  return null;
}

export function wordToCreatureKind(word: string): ShushuKeywordKind | null {
  return wordToShushuKind(word);
}

export function listShushuKindsInText(text: string): ShushuKeywordKind[] {
  const kinds: ShushuKeywordKind[] = [];
  if (/オンガク|音楽/.test(text)) kinds.push("ongaku");
  if (/旋律/.test(text)) kinds.push("senritsu");
  if (/メロディ/.test(text)) kinds.push("melody");
  if (/歌/.test(text)) kinds.push("uta");
  if (/コエ/.test(text)) kinds.push("koe");
  return kinds;
}

export function listShushuKindsInPhrase(phraseText: string): ShushuKeywordKind[] {
  return listShushuKindsInText(phraseText);
}

export function phraseToCreatureKinds(phraseText: string): ShushuKeywordKind[] {
  return listShushuKindsInPhrase(phraseText);
}

export function resolveWordKind(wordIndex: number, phrase: IPhrase): ShushuKeywordKind | null {
  const word = phrase.children[wordIndex];
  if (!word) return null;

  const direct = wordToShushuKind(word.text);
  if (direct) return direct;

  const { compact, wordRanges } = buildPhraseTextIndex(phrase.children);
  const range = wordRanges[wordIndex];
  if (!range) return null;

  for (const kind of listShushuKindsInText(compact)) {
    for (const label of SHUSHU_KEYWORD_ALIASES[kind]) {
      let searchFrom = 0;
      while (searchFrom < compact.length) {
        const idx = compact.indexOf(label, searchFrom);
        if (idx < 0) break;
        const end = idx + label.length;
        if (range.start < end && range.end > idx) return kind;
        searchFrom = idx + 1;
      }
    }
  }
  return null;
}

export function detectShushuSpans(phrase: IPhrase): ShushuSpan[] {
  const words = phrase.children;
  if (words.length === 0) return [];

  const { compact, wordRanges } = buildPhraseTextIndex(words);
  const searchText = `${phrase.text}${compact}`;
  const kinds = listShushuKindsInText(searchText);
  const spans: ShushuSpan[] = [];
  const seen = new Set<string>();

  for (const kind of kinds) {
    const labels = [...SHUSHU_KEYWORD_ALIASES[kind]].sort((a, b) => b.length - a.length);
    for (const label of labels) {
      let searchFrom = 0;
      while (searchFrom < compact.length) {
        const idx = compact.indexOf(label, searchFrom);
        if (idx < 0) break;
        const endIdx = idx + label.length;

        let startWordIndex = -1;
        let endWordIndex = -1;
        for (let wi = 0; wi < wordRanges.length; wi++) {
          const range = wordRanges[wi];
          if (range.end <= idx || range.start >= endIdx) continue;
          if (startWordIndex < 0) startWordIndex = wi;
          endWordIndex = wi;
        }

        const timing = resolveSpanTiming(words, wordRanges, idx, endIdx);
        const dedupeKey = `${kind}-${idx}-${endIdx}`;
        if (
          startWordIndex >= 0 &&
          endWordIndex >= 0 &&
          timing &&
          !seen.has(dedupeKey)
        ) {
          seen.add(dedupeKey);
          spans.push({
            kind,
            label,
            startWordIndex,
            endWordIndex,
            startTime: timing.startTime,
            endTime: timing.endTime,
            compactStart: idx,
            compactEnd: endIdx,
          });
        }
        searchFrom = idx + 1;
      }
    }
  }
  return spans;
}

function resolveSpanTiming(
  words: IPhrase["children"],
  wordRanges: { start: number; end: number }[],
  startCharIdx: number,
  endCharIdx: number,
): { startTime: number; endTime: number } | null {
  let startTime = Infinity;
  let endTime = -Infinity;
  let charOffset = 0;

  for (const word of words) {
    if (word.children.length > 0) {
      for (const char of word.children) {
        const charStart = charOffset;
        const charEnd = charOffset + char.text.length;
        charOffset = charEnd;

        if (charEnd <= startCharIdx || charStart >= endCharIdx) continue;
        startTime = Math.min(startTime, char.startTime);
        endTime = Math.max(endTime, char.endTime);
      }
      continue;
    }

    const wordStart = charOffset;
    const wordEnd = charOffset + word.text.length;
    charOffset = wordEnd;
    if (wordEnd <= startCharIdx || wordStart >= endCharIdx) continue;
    startTime = Math.min(startTime, word.startTime);
    endTime = Math.max(endTime, word.endTime);
  }

  if (startTime !== Infinity && endTime >= 0) {
    return { startTime, endTime };
  }

  for (let wi = 0; wi < words.length; wi++) {
    const range = wordRanges[wi];
    if (range.end <= startCharIdx || range.start >= endCharIdx) continue;
    startTime = Math.min(startTime, words[wi].startTime);
    endTime = Math.max(endTime, words[wi].endTime);
  }

  if (startTime === Infinity || endTime < 0) {
    return null;
  }
  return { startTime, endTime };
}

export function findCollectSpans(phrase: IPhrase): ShushuSpan[] {
  return detectShushuSpans(phrase);
}

export function findSpanForWord(wordIndex: number, spans: ShushuSpan[]): ShushuSpan | null {
  for (const span of spans) {
    if (wordIndex >= span.startWordIndex && wordIndex <= span.endWordIndex) {
      return span;
    }
  }
  return null;
}

export function isSpanFinished(span: ShushuSpan, position: number, lastPosition: number): boolean {
  if (position < span.startTime) return false;
  if (lastPosition < span.endTime && position >= span.endTime) return true;
  return position >= span.endTime;
}

/** 歌詞の1文字が、収集ラベルの最後の文字として歌い終わったか */
export function isLabelEndChar(phrase: IPhrase, span: ShushuSpan, char: { endTime: number }): boolean {
  const labelEndTime = getLabelEndTime(phrase, span);
  if (labelEndTime === null) return false;
  return Math.abs(char.endTime - labelEndTime) <= 2;
}

function getLabelEndTime(phrase: IPhrase, span: ShushuSpan): number | null {
  let offset = 0;
  for (const word of phrase.children) {
    if (word.children.length > 0) {
      for (const c of word.children) {
        const charEnd = offset + c.text.length;
        if (charEnd === span.compactEnd) {
          return c.endTime;
        }
        offset = charEnd;
      }
      continue;
    }
    offset += word.text.length;
  }
  return null;
}

/** フレーズ末尾のキーワードか（メロディ等） */
export function isSpanAtPhraseTail(phrase: IPhrase, span: ShushuSpan): boolean {
  if (phrase.children.length === 0) return false;
  const lastWord = phrase.children[phrase.children.length - 1];
  return (
    span.endWordIndex === phrase.children.length - 1 &&
    span.endTime >= lastWord.endTime - 2
  );
}

/** ワード単位（char なし）のフォールバック */
export function isSpanEndWord(span: ShushuSpan, wordIndex: number): boolean {
  return wordIndex === span.endWordIndex;
}
