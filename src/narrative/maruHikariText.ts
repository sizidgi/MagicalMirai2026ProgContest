import {
  MARU_HIKARI_EDGE_FADE_MS,
  MARU_HIKARI_KAISHI_MS,
} from "./triggers";

/** 例示比率（0.2 / 0.15 / 0.1）を読める長さにスケール  */
const UNIT_MS = 10_000;

export const MARU_HIKARI_TEXT_START_MS = MARU_HIKARI_KAISHI_MS + MARU_HIKARI_EDGE_FADE_MS;

export type MaruHikariTextKind = "question" | "answer" | "final";

export interface MaruHikariTextCue {
  text: string;
  durationMs: number;
  kind: MaruHikariTextKind;
}

/** マスターとの思い出 — maruHikari 中の走馬灯テキスト */
export const MARU_HIKARI_TEXT_CUES: readonly MaruHikariTextCue[] = [
  { text: "このソラはどんなイロをしてるの？", durationMs: 0.2 * UNIT_MS, kind: "question" },
  { text: "「この空には色なんてないよ」", durationMs: 0.15 * UNIT_MS, kind: "answer" },
  { text: "じゃあ、カナシミはどんなイロをしてるの？", durationMs: 0.15 * UNIT_MS, kind: "question" },
  { text: "「青、かな」", durationMs: 0.15 * UNIT_MS, kind: "answer" },
  { text: "ナミダはどんなカタチをしてるの？", durationMs: 0.1 * UNIT_MS, kind: "question" },
  { text: "「涙には決まった形はないよ」", durationMs: 0.1 * UNIT_MS, kind: "answer" },
  { text: "じゃあ、あなたはどんなカタチをしてるの？", durationMs: 5_000, kind: "final" },
] as const;

export interface MaruHikariTextState {
  text: string;
  kind: MaruHikariTextKind;
  /** 0–1: キュー内経過（final はゆっくり） */
  progress: number;
}

export function getMaruHikariTextState(positionMs: number): MaruHikariTextState | null {
  if (positionMs < MARU_HIKARI_TEXT_START_MS) {
    return null;
  }

  let elapsed = positionMs - MARU_HIKARI_TEXT_START_MS;

  for (const cue of MARU_HIKARI_TEXT_CUES) {
    if (elapsed < cue.durationMs) {
      return {
        text: cue.text,
        kind: cue.kind,
        progress: cue.durationMs > 0 ? elapsed / cue.durationMs : 1,
      };
    }
    elapsed -= cue.durationMs;
  }

  return null;
}
