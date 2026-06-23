import type { StageTheme } from "./themes";

export interface StageRuntime {
  theme: StageTheme;
  previousTheme: StageTheme;
  sceneFlash: number;
  phraseIndex: number;
  beatPulse: number;
  /** 0=白い世界, 1=ユーザーの色が広がった */
  colorSpread: number;
  colorSpreadTarget: number;
  /** 0–1: ラストの顕現 */
  wordReveal: number;
  wordRevealTarget: number;
  narrativePhase: "white" | "living" | "finale";
  smogRevealed: boolean;
  smogRevealGlow: number;
  hiddenMelody: number;
  /** 0–1: エピローグの時間加速 */
  jikanKasoku: number;
  /** 横方向スクロール量（px 相当） */
  jikanKasokuScroll: number;
}

export function createInitialStageRuntime(theme: StageTheme): StageRuntime {
  return {
    theme,
    previousTheme: theme,
    sceneFlash: 0,
    phraseIndex: -1,
    beatPulse: 0,
    colorSpread: 0,
    colorSpreadTarget: 0,
    wordReveal: 0,
    wordRevealTarget: 0,
    narrativePhase: "white",
    smogRevealed: false,
    smogRevealGlow: 0,
    hiddenMelody: 0,
    jikanKasoku: 0,
    jikanKasokuScroll: 0,
  };
}
