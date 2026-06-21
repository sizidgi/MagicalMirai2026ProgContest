import p5 from "p5";
import type { StageManager } from "../stage/StageManager";
import {
  drawDataSmogLayer,
  drawHiddenUnderSmog,
  drawSceneFlash,
  drawSky,
  drawWhiteVignette,
  ParticleField,
} from "./stageRenderer";

export function createSketch(stageManager: StageManager, host: HTMLElement): p5 {
  const particles = new ParticleField();
  let lastFrameMs = performance.now();

  const sketch = (p: p5) => {
    p.setup = () => {
      const canvas = p.createCanvas(host.clientWidth, host.clientHeight);
      canvas.parent(host);
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
      const isWhitePhase = runtime.colorSpread < 0.35 && runtime.narrativePhase !== "finale";
      const underSmog = smog.active || runtime.smogRevealed;

      drawSky(p, displayTheme, w, h);

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

      notes.drawMusicBand(p, displayTheme, w, h, runtime.beatPulse);

      if (notes.collectedCount > 0 && !smog.active) {
        const members = notes.getMemberPositions(p, w, h, runtime.beatPulse);
        particles.spawnFromBandMembers(p, members, displayTheme, runtime.beatPulse);
      }
      particles.update(p, w, h);
      particles.draw(p, displayTheme, runtime.beatPulse);

      smog.drawSmog(p, w, h, p.frameCount);

      drawWhiteVignette(p, w, h, isWhitePhase && !smog.active ? 0.9 - runtime.colorSpread : 0);
      drawSceneFlash(p, w, h, runtime.sceneFlash);
    };

    p.mousePressed = () => {
      stageManager.pointerPressed(p.mouseX, p.mouseY);
    };

    p.mouseDragged = () => {
      stageManager.pointerDragged(p.mouseX, p.mouseY);
    };
  };

  return new p5(sketch, host);
}
