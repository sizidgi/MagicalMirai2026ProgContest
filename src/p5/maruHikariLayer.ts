import type p5 from "p5";

/**
 * 心を象る球体（WEBGL）— 球体全体が発光し、50% → 0% で光が弱まる。
 */
export class MaruHikariLayer {
  private gfx: p5.Graphics | null = null;
  private lastW = 0;
  private lastH = 0;

  /** 区間開始時の発光量（0–1） */
  private static readonly GLOW_START = 0.5;

  resize(host: p5, w: number, h: number): void 
  {
    if (w === this.lastW && h === this.lastH && this.gfx) return;

    this.gfx?.remove();
    this.gfx = host.createGraphics(w, h, host.WEBGL);
    this.lastW = w;
    this.lastH = h;
  }

  /**
   * fadeProgress: 0 = 区間開始, 1 = 区間終了
   * 戻り値: 0–0.5 の発光量
   */
  static glowFromFade(fadeProgress: number): number {
    return MaruHikariLayer.GLOW_START * (1 - Math.max(0, Math.min(1, fadeProgress)));
  }

  draw(host: p5, w: number, h: number, fadeProgress: number, sceneAlpha: number, frameCount: number): void {
    this.resize(host, w, h);
    const g = this.gfx!;
    const sphereR = Math.min(w, h) * 0.34;
    const sphereY = sphereR * 0.55;
    const glow = MaruHikariLayer.glowFromFade(fadeProgress);
    const k = glow / MaruHikariLayer.GLOW_START;

    g.push();
    g.resetMatrix();
    g.background(2, 4, 14);

    g.camera(
      0,
      -sphereR * 2.35,
      sphereR * 0.95,
      0,
      sphereY,
      0,
      0,
      0,
      -1,
    );

    g.push();
    g.translate(0, sphereY, 0);
    g.rotateY(frameCount * 0.0012 + 0.42);
    g.noStroke();

    g.ambientLight(8 + 18 * k, 10 + 20 * k, 16 + 28 * k);
    g.directionalLight(110 * k, 118 * k, 150 * k, 0.55, -0.15, -0.82);
    g.directionalLight(36 * k, 42 * k, 58 * k, -0.4, 0.1, 0.25);

    g.fill(14, 22, 38);
    g.sphere(sphereR);

    if (k > 0.004) {
      g.noLights();
      g.emissiveMaterial(92 * k, 102 * k, 132 * k);
      g.sphere(sphereR);
    }

    g.noLights();
    g.fill(90, 150, 210, 4 + 28 * k);
    g.sphere(sphereR * 1.045);

    g.pop();
    g.pop();

    host.push();
    host.tint(255, 255 * sceneAlpha);
    host.image(g, 0, 0, w, h);
    host.pop();
  }
}
