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
