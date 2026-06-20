import type { StageTheme } from "./themes";
import { STAGE_THEMES } from "./themes";

export interface CameraState {
  targetX: number;
  targetY: number;
  targetZoom: number;
  x: number;
  y: number;
  zoom: number;
  dragging: boolean;
  lastPointerX: number;
  lastPointerY: number;
}

export interface StageRuntime {
  theme: StageTheme;
  previousTheme: StageTheme;
  themeIndex: number;
  themeBlend: number;
  sceneFlash: number;
  phraseIndex: number;
  phraseText: string;
  inChorus: boolean;
  beatPulse: number;
  sectionLabel: string;
  charGlow: number;
  currentChar: string;
  chordName: string;
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
}

export function createInitialCamera(): CameraState {
  return {
    targetX: 0,
    targetY: 0,
    targetZoom: 1,
    x: 0,
    y: 0,
    zoom: 1,
    dragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
  };
}

export function createInitialStageRuntime(theme: StageTheme): StageRuntime {
  return {
    theme,
    previousTheme: theme,
    themeIndex: 0,
    themeBlend: 1,
    sceneFlash: 0,
    phraseIndex: -1,
    phraseText: "",
    inChorus: false,
    beatPulse: 0,
    sectionLabel: theme.label,
    charGlow: 0,
    currentChar: "",
    chordName: "",
    colorSpread: 0,
    colorSpreadTarget: 0,
    wordReveal: 0,
    wordRevealTarget: 0,
    narrativePhase: "white",
    smogRevealed: false,
    smogRevealGlow: 0,
    hiddenMelody: 0,
  };
}

export function createDefaultRuntime(): StageRuntime {
  return createInitialStageRuntime(STAGE_THEMES[0]);
}
