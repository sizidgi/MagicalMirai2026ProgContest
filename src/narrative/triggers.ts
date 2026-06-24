export type NarrativeTrigger = "colorAwaken" | "voiceFinale" | "smogStart";

/** 歌詞フレーズから物語イベントを検出 */
export function detectNarrativeTrigger(phraseText: string): NarrativeTrigger | null {
  if (/託したコエ|コエが鳴る|あなたが託した/.test(phraseText)) {
    return "voiceFinale";
  }
  if (/データスモッグ/.test(phraseText)) {
    return "smogStart";
  }
  if (/青、かな|青.*かな/.test(phraseText)) {
    return "colorAwaken";
  }
  return null;
}

/** 「あなたはもう何も言わなかった」— 歌い終わりで歌詞を塵にする */
export function isAnataMouNanimoIwanakatta(phraseText: string): boolean {
  return /あなたは.*何も言わなかった|もう何も言わなかった/.test(phraseText);
}

/** エピローグ — （君は光の中で歌った）付近から時間加速 */
export function isJikanKasokuKaishi(phraseText: string): boolean {
  return /君は.*光.*歌った|光の中で歌った/.test(phraseText);
}

/** 楽曲末尾付近 [ms] — ここで停止ボタンと同じ終了処理 */
export function isKyokuOwari(position: number, duration: number): boolean {
  return position >= duration - 60;
}

/** 間奏 — 心の球体（maruHikari） [ms] */
export const MARU_HIKARI_KAISHI_MS = 130_000;
/** 発光が消えきる／フェードアウト開始（2:30） */
export const MARU_HIKARI_SHURYO_MS = 150_000;
/** 演出が完全に終わる（2:34） */
export const MARU_HIKARI_OWARI_MS = 154_000;
/** フェードイン／フェードアウト時間 [ms]（各4秒） */
export const MARU_HIKARI_EDGE_FADE_MS = 4_000;

function smoothstep(t: number): number {
  
  const x = Math.max(0, Math.min(1, t));

  return x * x * (3 - 2 * x);
}

export interface MaruHikariEnvelope {
  /** 0=発光50%, 1=消灯 */
  progress: number;
  /** レイヤー全体の不透明度 0–1 */
  alpha: number;
}

/** 区間外は null。2:10 から4秒イン、2:30 から4秒アウト */
export function getMaruHikariEnvelope(positionMs: number): MaruHikariEnvelope | null {
  const edge = MARU_HIKARI_EDGE_FADE_MS;

  if (positionMs < MARU_HIKARI_KAISHI_MS || positionMs > MARU_HIKARI_OWARI_MS) 
  {
    return null;
  }

  let alpha = 1;

  if (positionMs < MARU_HIKARI_KAISHI_MS + edge) {

    alpha = smoothstep((positionMs - MARU_HIKARI_KAISHI_MS) / edge);

  } else if (positionMs > MARU_HIKARI_SHURYO_MS) {

    alpha = smoothstep((MARU_HIKARI_OWARI_MS - positionMs) / edge);

  }

  let progress = 0;

  if (positionMs >= MARU_HIKARI_SHURYO_MS) {

    progress = 1;

  } else if (positionMs > MARU_HIKARI_KAISHI_MS) {

    progress = (positionMs - MARU_HIKARI_KAISHI_MS) / (MARU_HIKARI_SHURYO_MS - MARU_HIKARI_KAISHI_MS);
  }

  return { progress, alpha };
}

/** @deprecated progress のみ必要な場合は envelope を使う */
export function getMaruHikariFade(positionMs: number): number | null {
  return getMaruHikariEnvelope(positionMs)?.progress ?? null;
}
