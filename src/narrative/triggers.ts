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
