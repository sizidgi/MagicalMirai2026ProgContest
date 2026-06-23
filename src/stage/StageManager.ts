import type { IPhrase } from "textalive-app-api";
import type { ShushuKeywordKind } from "../shushu/keywords";
import { OngakutaiBand } from "../shushu/ongakutaiBand";
import { SmogGrid } from "../interaction/SmogGrid";
import { detectNarrativeTrigger } from "../narrative/triggers";
import {
  SCENE_TRANSITION_MS,
  SMOG_BRUSH_RADIUS,
  SMOG_CLEAR_THRESHOLD,
  SMOG_AUTO_CLEAR_MS,
} from "../config/song";
import type { UserSession } from "../session/UserSession";
import { createInitialStageRuntime, type StageRuntime } from "./StageState";
import {
  applyUserNarrativeToTheme,
  blendThemes,
  pickThemeForPhrase,
  STAGE_THEMES,
  type StageTheme,
} from "./themes";

export interface StageSnapshot {
  runtime: StageRuntime;
  displayTheme: StageTheme;
  session: UserSession;
  smog: SmogGrid;
  notes: OngakutaiBand;
}

export class StageManager {
  private runtime: StageRuntime;
  private transitionElapsed = SCENE_TRANSITION_MS;
  readonly smog = new SmogGrid();
  readonly notes = new OngakutaiBand();
  private canvasW = 1;
  private canvasH = 1;
  private smogElapsedMs = 0;
  private jikanKasokuActive = false;

  constructor(private readonly session: UserSession) {
    this.runtime = createInitialStageRuntime(STAGE_THEMES[0]);
  }

  initCanvas(width: number, height: number): void {
    this.canvasW = width;
    this.canvasH = height;
    this.smog.resize(width, height);
  }

  getSnapshot(): StageSnapshot {
    const t = Math.min(1, this.transitionElapsed / SCENE_TRANSITION_MS);
    let displayTheme = blendThemes(this.runtime.previousTheme, this.runtime.theme, t);
    displayTheme = applyUserNarrativeToTheme(
      displayTheme,
      this.session.primaryColor,
      this.runtime.colorSpread,
      this.runtime.wordReveal,
    );
    return {
      runtime: this.runtime,
      displayTheme,
      session: this.session,
      smog: this.smog,
      notes: this.notes,
    };
  }

  reset(): void {
    this.runtime = createInitialStageRuntime(STAGE_THEMES[0]);
    this.transitionElapsed = SCENE_TRANSITION_MS;
    this.smog.active = false;
    this.smog.revealed = false;
    this.smog.clearedRatio = 0;
    this.notes.reset();
    this.smog.resize(this.canvasW, this.canvasH);
    this.smogElapsedMs = 0;
    this.jikanKasokuActive = false;
  }

  isJikanKasokuChu(): boolean {
    return this.jikanKasokuActive;
  }

  /** エピローグ — 時間加速演出を開始 */
  beginJikanKasoku(): void {
    if (this.jikanKasokuActive) return;
    this.jikanKasokuActive = true;
    this.runtime.narrativePhase = "finale";
    this.runtime.wordRevealTarget = 1;
    this.runtime.sceneFlash = 0.75;
  }

  isSpanCollected(spanKey: string): boolean {
    return this.notes.isSpanCollected(spanKey);
  }

  /** 同じフレーズが再び流れたとき、再収集できるようにする */
  onPhraseReenter(phraseStartTime: number): void {
    this.notes.clearPhraseCollection(phraseStartTime);
  }

  collectFromKashi(spanKey: string, _kind: ShushuKeywordKind): boolean {
    if (this.notes.collectSpan(spanKey)) {
      this.runtime.sceneFlash = 0.35;
      return true;
    }
    return false;
  }

  bootstrapInitialScene(phrase: IPhrase, phraseIndex: number): void {
    this.runtime.phraseIndex = phraseIndex;
    const theme = pickThemeForPhrase(phrase.text, false, phraseIndex);
    this.runtime.previousTheme = theme;
    this.runtime.theme = theme;
    this.transitionElapsed = SCENE_TRANSITION_MS;
    this.runtime.narrativePhase = "white";
  }

  updateFrame(deltaMs: number): void {
    this.runtime.beatPulse *= 0.88;
    this.runtime.sceneFlash = Math.max(0, this.runtime.sceneFlash - deltaMs * 0.002);
    this.transitionElapsed = Math.min(
      SCENE_TRANSITION_MS,
      this.transitionElapsed + deltaMs,
    );

    if (this.jikanKasokuActive) {
      this.runtime.jikanKasoku = Math.min(1, this.runtime.jikanKasoku + deltaMs * 0.00045);
      const speed = 0.35 + this.runtime.jikanKasoku * 3.2;
      this.runtime.jikanKasokuScroll += deltaMs * speed;
    }

    this.runtime.colorSpread +=
      (this.runtime.colorSpreadTarget - this.runtime.colorSpread) * Math.min(1, deltaMs * 0.0018);
    this.runtime.wordReveal +=
      (this.runtime.wordRevealTarget - this.runtime.wordReveal) * Math.min(1, deltaMs * 0.0012);

    if (this.runtime.smogRevealed) {
      this.runtime.smogRevealGlow = Math.min(
        1,
        this.runtime.smogRevealGlow + deltaMs * 0.0008,
      );
      this.runtime.hiddenMelody = Math.min(1, this.runtime.hiddenMelody + deltaMs * 0.0006);
    }

    if (this.smog.active && !this.smog.revealed) {
      this.smogElapsedMs += deltaMs;
      if (this.smogElapsedMs >= SMOG_AUTO_CLEAR_MS) {
        this.smog.autoClearAll();
        this.onSmogCleared();
      }
    }
  }

  onTimeUpdate(
    _position: number,
    phrase: IPhrase | null,
    inChorus: boolean,
    beatStrength: number,
  ): void {
    if (beatStrength > 0.05) {
      this.runtime.beatPulse = Math.max(this.runtime.beatPulse, beatStrength);
    }

    if (phrase) {
      this.applyThemeFromPhrase(phrase.text, inChorus, this.runtime.phraseIndex);
    }
  }

  applyPhraseChange(entered: IPhrase[], inChorus: boolean, phraseIndex: number): void {
    if (entered.length === 0) {
      return;
    }
    const phrase = entered[0];
    this.runtime.phraseIndex = phraseIndex;
    this.applyThemeFromPhrase(phrase.text, inChorus, phraseIndex);
    this.runtime.sceneFlash = 0.45;
  }

  private applyThemeFromPhrase(phraseText: string, inChorus: boolean, phraseIndex: number): void {
    this.handleNarrativeTrigger(phraseText);

    const nextTheme = pickThemeForPhrase(phraseText, inChorus, phraseIndex);
    if (nextTheme.id !== this.runtime.theme.id) {
      this.applyTheme(nextTheme);
    }
  }

  private handleNarrativeTrigger(phraseText: string): void {
    const trigger = detectNarrativeTrigger(phraseText);
    if (trigger === "smogStart") {
      this.smogElapsedMs = 0;
      this.smog.activate();
      this.runtime.sceneFlash = 0.5;
    } else if (trigger === "colorAwaken") {
      this.runtime.colorSpreadTarget = 1;
      this.runtime.narrativePhase = "living";
      this.runtime.sceneFlash = 0.85;
    } else if (trigger === "voiceFinale") {
      this.runtime.wordRevealTarget = 1;
      this.runtime.narrativePhase = "finale";
      this.runtime.sceneFlash = 1;
    }
  }

  private onSmogCleared(): void {
    this.runtime.smogRevealed = true;
    this.runtime.smogRevealGlow = 0.3;
    this.runtime.hiddenMelody = 0.4;
    this.runtime.colorSpreadTarget = Math.max(this.runtime.colorSpreadTarget, 0.75);
    this.runtime.sceneFlash = 0.9;
  }

  private applyTheme(next: StageTheme): void {
    this.runtime.previousTheme = this.runtime.theme;
    this.runtime.theme = next;
    this.transitionElapsed = 0;
  }

  pointerPressed(x: number, y: number): void {
    if (!this.session.isReady || !this.smog.active) {
      return;
    }
    this.wipeSmogAt(x, y);
  }

  pointerDragged(x: number, y: number): void {
    if (!this.session.isReady || !this.smog.active) {
      return;
    }
    this.wipeSmogAt(x, y);
  }

  private wipeSmogAt(x: number, y: number): void {
    this.smog.wipe(x, y, SMOG_BRUSH_RADIUS);
    if (this.smog.markRevealed(SMOG_CLEAR_THRESHOLD)) {
      this.onSmogCleared();
    }
  }
}
