import p5 from "p5";
import type { StageManager } from "../stage/StageManager";
import {
  drawDataSmogLayer,
  drawHiddenUnderSmog,
  drawJikanKasokuLayer,
  drawSceneFlash,
  drawSky,
  drawWhiteVignette,
  ParticleField,
} from "./stageRenderer";
import { MaruHikariLayer } from "./maruHikariLayer";

export function createSketch(stageManager: StageManager, host: HTMLElement): p5 {
  const particles = new ParticleField();
  const maruHikari = new MaruHikariLayer();
  let lastFrameMs = performance.now();
  let canvasEl: HTMLCanvasElement | null = null;

  const sketch = (p: p5) => {
    p.setup = () => {
      const canvas = p.createCanvas(host.clientWidth, host.clientHeight);
      canvas.parent(host);
      canvasEl = canvas.elt as HTMLCanvasElement;
      canvasEl.style.pointerEvents = "none";
      p.textFont("Noto Sans JP, sans-serif");
      p.angleMode(p.RADIANS);
      stageManager.initCanvas(p.width, p.height);
    };

    p.windowResized = () => {
      p.resizeCanvas(host.clientWidth, host.clientHeight);
      stageManager.initCanvas(p.width, p.height);
    };

    p.draw = () => {
      const deltaMs = performance.now() - lastFrameMs;
      lastFrameMs = performance.now();

      stageManager.updateFrame(deltaMs);
      const { runtime, displayTheme, session, smog, notes } = stageManager.getSnapshot();
      const w = p.width;
      const h = p.height;
      const maruActive = runtime.maruHikariAlpha > 0.01;
      const smogWipe = stageManager.isSmogWipeActive();

      document.getElementById("app")?.classList.toggle("maru-hikari-chu", maruActive);
      document.getElementById("app")?.classList.toggle("smog-chu", smogWipe);
      if (canvasEl) 
      {
        canvasEl.style.pointerEvents = smogWipe ? "auto" : "none";
      }

      if (maruActive) 
      {
        maruHikari.draw(p, w, h, runtime.maruHikariFade, runtime.maruHikariAlpha, p.frameCount);
        return;
      }

      const isWhitePhase = runtime.colorSpread < 0.35 && runtime.narrativePhase !== "finale";
      const underSmog = smog.active || runtime.smogRevealed;
      const plainness =
        smog.active || runtime.narrativePhase === "finale"
          ? 0
          : Math.max(0, 1 - runtime.colorSpread * 2.4);
      const kasoku = runtime.jikanKasoku;

      drawSky(p, displayTheme, w, h, plainness, kasoku, runtime.jikanKasokuScroll);

      if (underSmog) {
        drawHiddenUnderSmog(
          p,
          displayTheme,
          w,
          h,
          runtime.smogRevealed ? runtime.smogRevealGlow : smog.clearedRatio * 0.6,
          runtime.hiddenMelody,
          session.primaryColor,
        );
      }

      if (!smog.active) {
        drawDataSmogLayer(p, displayTheme, w, h);
      }

      drawJikanKasokuLayer(p, w, h, runtime.jikanKasokuScroll, kasoku, p.frameCount);

      p.push();
      p.translate(kasoku * 18, 0);
      notes.drawMusicBand(p, displayTheme, w, h, runtime.beatPulse * (1 + kasoku * 0.4));
      p.pop();

      const members = notes.getMemberPositions(p, w, h, runtime.beatPulse);
      
      if (notes.collectedCount > 0 && !smog.active) {
        particles.spawnFromBandMembers(p, members, displayTheme, runtime.beatPulse);
      }

      particles.update(p, w, h);
      particles.draw(p, displayTheme, runtime.beatPulse);

      smog.drawSmog(p, w, h, p.frameCount);

      const vignetteAmount =
        isWhitePhase && !smog.active ? (0.9 - runtime.colorSpread) * (1 - plainness * 0.55) : 0;
      drawWhiteVignette(p, w, h, vignetteAmount);
      drawJikanKasokuLayer(p, w, h, runtime.jikanKasokuScroll * 1.08, kasoku * 0.55, p.frameCount + 40);
      drawSceneFlash(p, w, h, runtime.sceneFlash);
    };

    const emitSmogPointer = (x: number, y: number, drag: boolean): void => {
      
      if (!stageManager.isSmogWipeActive()) return;

      if (drag) 
      {
        stageManager.pointerDragged(x, y);
      } 
      else 
      {
        stageManager.pointerPressed(x, y);
      }
    };

    p.mousePressed = () => {
      emitSmogPointer(p.mouseX, p.mouseY, false);
    };

    p.mouseDragged = () => {
      emitSmogPointer(p.mouseX, p.mouseY, true);
    };

    p.touchStarted = () => {
      emitSmogPointer(p.mouseX, p.mouseY, false);
      return false;
    };

    p.touchMoved = () => {
      emitSmogPointer(p.mouseX, p.mouseY, true);
      return false;
    };
  };

  return new p5(sketch, host);
}
