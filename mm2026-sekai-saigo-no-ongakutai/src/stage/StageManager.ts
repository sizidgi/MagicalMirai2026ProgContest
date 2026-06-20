import type { IPhrase } from "textalive-app-api";
import type { ShushuKeywordKind } from "../shushu/keywords";
import { OngakutaiBand } from "../shushu/ongakutaiBand";
import { SmogGrid } from "../interaction/SmogGrid";
import { detectNarrativeTrigger } from "../narrative/triggers";
import {
  CAMERA_DRAG_MAX,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  SCENE_TRANSITION_MS,
  SMOG_BRUSH_RADIUS,
  SMOG_CLEAR_THRESHOLD,
  SMOG_AUTO_CLEAR_MS,
} from "../config/song";
import type { UserSession } from "../session/UserSession";
import {
  createInitialCamera,
  createInitialStageRuntime,
  type CameraState,
  type StageRuntime,
} from "./StageState";
import {
  applyUserNarrativeToTheme,
  blendThemes,
  pickThemeForPhrase,
  STAGE_THEMES,
  type StageTheme,
} from "./themes";

export interface StageSnapshot {
  runtime: StageRuntime;
  camera: CameraState;
  displayTheme: StageTheme;
  session: UserSession;
  smog: SmogGrid;
  notes: OngakutaiBand;
}

export class StageManager {
  private runtime: StageRuntime;
  private camera: CameraState;
  private transitionElapsed = SCENE_TRANSITION_MS;
  readonly smog = new SmogGrid();
  readonly notes = new OngakutaiBand();
  private canvasW = 1;
  private canvasH = 1;
  private smogElapsedMs = 0;

  constructor(private readonly session: UserSession) {
    this.runtime = createInitialStageRuntime(STAGE_THEMES[0]);
    this.camera = createInitialCamera();
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
      camera: this.camera,
      displayTheme,
      session: this.session,
      smog: this.smog,
      notes: this.notes,
    };
  }

  reset(): void {
    this.runtime = createInitialStageRuntime(STAGE_THEMES[0]);
    this.camera = createInitialCamera();
    this.transitionElapsed = SCENE_TRANSITION_MS;
    this.smog.active = false;
    this.smog.revealed = false;
    this.smog.clearedRatio = 0;
    this.notes.reset();
    this.smog.resize(this.canvasW, this.canvasH);
    this.smogElapsedMs = 0;
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

  tryCollectFromLyric(spanKey: string, kind: ShushuKeywordKind): boolean {
    return this.collectFromKashi(spanKey, kind);
  }

  bootstrapInitialScene(phrase: IPhrase, phraseIndex: number): void {
    this.runtime.phraseIndex = phraseIndex;
    this.runtime.phraseText = phrase.text;
    const theme = pickThemeForPhrase(phrase.text, false, phraseIndex);
    this.runtime.previousTheme = theme;
    this.runtime.theme = theme;
    this.runtime.sectionLabel = "無色の空";
    this.transitionElapsed = SCENE_TRANSITION_MS;
    this.runtime.themeBlend = 1;
    this.runtime.narrativePhase = "white";
  }

  updateFrame(deltaMs: number): void {
    const lerp = Math.min(1, deltaMs * 0.006);
    this.runtime.beatPulse *= 0.88;
    this.runtime.charGlow *= 0.9;
    this.runtime.sceneFlash = Math.max(0, this.runtime.sceneFlash - deltaMs * 0.002);
    this.transitionElapsed = Math.min(
      SCENE_TRANSITION_MS,
      this.transitionElapsed + deltaMs,
    );
    this.runtime.themeBlend = this.transitionElapsed / SCENE_TRANSITION_MS;

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

    this.camera.x += (this.camera.targetX - this.camera.x) * lerp;
    this.camera.y += (this.camera.targetY - this.camera.y) * lerp;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * lerp;

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
    currentChar: string,
    chordName: string,
  ): void {
    if (beatStrength > 0.05) {
      this.runtime.beatPulse = Math.max(this.runtime.beatPulse, beatStrength);
    }
    if (currentChar && currentChar !== this.runtime.currentChar) {
      this.runtime.currentChar = currentChar;
      this.runtime.charGlow = 1;
    }
    if (chordName) {
      this.runtime.chordName = chordName;
    }

    this.runtime.inChorus = inChorus;

    if (phrase) {
      this.runtime.phraseText = phrase.text;
      this.applyThemeFromPhrase(phrase.text, inChorus, this.runtime.phraseIndex);
    }
  }

  spawnFromLyricWord(_wordText: string): void {
    // 収集は浮遊ワードのクリックで行う（ここでは何もしない）
  }

  applyPhraseChange(entered: IPhrase[], inChorus: boolean, phraseIndex: number): void {
    if (entered.length === 0) {
      return;
    }
    const phrase = entered[0];
    this.onPhraseEnter(phrase, phraseIndex, inChorus);
  }

  private onPhraseEnter(phrase: IPhrase, phraseIndex: number, inChorus: boolean): void {
    this.runtime.phraseIndex = phraseIndex;
    this.runtime.phraseText = phrase.text;
    this.applyThemeFromPhrase(phrase.text, inChorus, phraseIndex);
    this.runtime.sceneFlash = 0.45;
  }

  private applyThemeFromPhrase(phraseText: string, inChorus: boolean, phraseIndex: number): void {
    this.handleNarrativeTrigger(phraseText);

    const nextTheme = pickThemeForPhrase(phraseText, inChorus, phraseIndex);
    if (nextTheme.id !== this.runtime.theme.id) {
      this.applyTheme(nextTheme);
    } else {
      this.runtime.sectionLabel = nextTheme.label;
    }
  }

  private handleNarrativeTrigger(phraseText: string): void {
    const trigger = detectNarrativeTrigger(phraseText);
    if (trigger === "smogStart") {
      this.smogElapsedMs = 0;
      this.smog.activate();
      this.runtime.sectionLabel = "データスモッグ — 払って";
      this.runtime.sceneFlash = 0.5;
    } else if (trigger === "colorAwaken") {
      this.runtime.colorSpreadTarget = 1;
      this.runtime.narrativePhase = "living";
      this.runtime.sectionLabel = "青、かな";
      this.runtime.sceneFlash = 0.85;
    } else if (trigger === "voiceFinale") {
      this.runtime.wordRevealTarget = 1;
      this.runtime.narrativePhase = "finale";
      this.runtime.sectionLabel = "託したコエ";
      this.runtime.sceneFlash = 1;
    }
  }

  private onSmogCleared(): void {
    this.runtime.smogRevealed = true;
    this.runtime.smogRevealGlow = 0.3;
    this.runtime.hiddenMelody = 0.4;
    this.runtime.colorSpreadTarget = Math.max(this.runtime.colorSpreadTarget, 0.75);
    this.runtime.sectionLabel = "晴れた空";
    this.runtime.sceneFlash = 0.9;
  }

  private applyTheme(next: StageTheme): void {
    this.runtime.previousTheme = this.runtime.theme;
    this.runtime.theme = next;
    this.runtime.sectionLabel = next.label;
    this.transitionElapsed = 0;
    this.runtime.themeBlend = 0;
  }

  pointerPressed(x: number, y: number, _canvasW: number, _canvasH: number): void {
    if (!this.session.isReady) {
      return;
    }

    if (this.smog.active) {
      this.smog.wipe(x, y, SMOG_BRUSH_RADIUS);
      if (this.smog.markRevealed(SMOG_CLEAR_THRESHOLD)) {
        this.onSmogCleared();
      }
      this.camera.dragging = false;
      return;
    }

    this.camera.dragging = true;
    this.camera.lastPointerX = x;
    this.camera.lastPointerY = y;
  }

  pointerDragged(x: number, y: number): void {
    if (!this.session.isReady) {
      return;
    }

    if (this.smog.active) {
      this.smog.wipe(x, y, SMOG_BRUSH_RADIUS);
      if (this.smog.markRevealed(SMOG_CLEAR_THRESHOLD)) {
        this.onSmogCleared();
      }
      return;
    }

    if (!this.camera.dragging) {
      return;
    }
    const dx = x - this.camera.lastPointerX;
    const dy = y - this.camera.lastPointerY;
    this.camera.lastPointerX = x;
    this.camera.lastPointerY = y;

    this.camera.targetX = clamp(
      this.camera.targetX + dx * 0.65,
      -CAMERA_DRAG_MAX,
      CAMERA_DRAG_MAX,
    );
    this.camera.targetY = clamp(
      this.camera.targetY + dy * 0.45,
      -CAMERA_DRAG_MAX * 0.55,
      CAMERA_DRAG_MAX * 0.55,
    );
  }

  pointerReleased(): void {
    this.camera.dragging = false;
  }

  wheelZoom(delta: number): void {
    if (!this.session.isReady || this.smog.active) {
      return;
    }
    this.camera.targetZoom = clamp(
      this.camera.targetZoom - delta * 0.0012,
      CAMERA_ZOOM_MIN,
      CAMERA_ZOOM_MAX,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
