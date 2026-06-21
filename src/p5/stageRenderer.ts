import type p5 from "p5";
import { applyDesaturate, type StageTheme } from "../stage/themes";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  kind: "note" | "spark" | "ember" | "tear" | "pixel";
}

export class ParticleField {
  private particles: Particle[] = [];

  spawnFromBandMembers(
    p: p5,
    members: { x: number; y: number }[],
    theme: StageTheme,
    beatPulse: number,
  ): void {
    if (members.length === 0) {
      return;
    }
    const rate = 0.22 + beatPulse * 0.45;
    for (const member of members) {
      if (p.random() > rate) {
        continue;
      }
      this.particles.push({
        x: member.x + p.random(-8, 8),
        y: member.y + p.random(-8, 8),
        vx: p.random(-1.4, 1.4),
        vy: p.random(-3.2, -0.4),
        life: p.random(0.45, 1),
        size: p.random(4, 10),
        kind: p.random() > 0.35 ? "note" : "spark",
      });
    }
    void theme;
  }

  update(p: p5, w: number, h: number): void {
    for (const pt of this.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      if (pt.kind === "tear") {
        pt.vy += 0.015;
      } else {
        pt.vy += 0.02;
      }
      pt.life -= 0.007;
    }
    this.particles = this.particles.filter(
      (pt) => pt.life > 0 && pt.x > -40 && pt.x < w + 40 && pt.y > -80 && pt.y < h + 40,
    );
    void p;
  }

  draw(p: p5, theme: StageTheme, beatPulse: number): void {
    p.noStroke();
    for (const pt of this.particles) {
      const alpha = pt.life * 220;
      if (pt.kind === "note") {
        p.fill(theme.accent[0], theme.accent[1], theme.accent[2], alpha);
        p.textSize(pt.size * 3);
        p.textAlign(p.CENTER, p.CENTER);
        p.text("♪", pt.x, pt.y);
      } else if (pt.kind === "spark") {
        p.fill(255, 240, 200, alpha);
        p.circle(pt.x, pt.y, pt.size * (1 + beatPulse * 0.6));
      } else if (pt.kind === "tear") {
        p.fill(100, 170, 255, alpha * 0.85);
        p.ellipse(pt.x, pt.y, pt.size * 0.8, pt.size * 1.6);
      } else if (pt.kind === "pixel") {
        p.fill(120, 200, 255, alpha * 0.6);
        p.rect(pt.x, pt.y, pt.size, pt.size, 1);
      } else {
        p.fill(theme.particleHue, 70, 100, alpha * 0.65);
        p.circle(pt.x, pt.y, pt.size);
      }
    }
  }
}

export function drawSky(p: p5, theme: StageTheme, w: number, h: number): void {
  const top = applyDesaturate(theme.skyTop, theme.desaturate);
  const bottom = applyDesaturate(theme.skyBottom, theme.desaturate);

  for (let y = 0; y < h; y++) {
    const t = y / h;
    const r = p.lerp(top[0], bottom[0], t);
    const g = p.lerp(top[1], bottom[1], t);
    const b = p.lerp(top[2], bottom[2], t);
    p.stroke(r, g, b);
    p.line(0, y, w, y);
  }

  p.noStroke();
  const ground = applyDesaturate(theme.ground, theme.desaturate);
  p.fill(ground[0], ground[1], ground[2]);
  p.rect(0, h * 0.66, w, h * 0.34);
}

/** スモッグの下に隠れていた光と旋律 */
export function drawHiddenUnderSmog(
  p: p5,
  theme: StageTheme,
  w: number,
  h: number,
  glow: number,
  melody: number,
  lyricColor: [number, number, number],
): void {
  if (glow <= 0.02 && melody <= 0.02) {
    return;
  }

  p.push();
  p.blendMode(p.ADD);
  p.noStroke();
  p.fill(lyricColor[0], lyricColor[1], lyricColor[2], 40 * glow);
  p.ellipse(w / 2, h * 0.42, w * 0.55 * glow, h * 0.28 * glow);
  p.blendMode(p.BLEND);

  if (melody > 0.05) {
    p.stroke(theme.accent[0], theme.accent[1], theme.accent[2], 80 * melody);
    p.strokeWeight(2);
    p.noFill();
    for (let i = 0; i < 5; i++) {
      p.beginShape();
      for (let x = 0; x <= w; x += 12) {
        const y =
          h * 0.38 +
          p.sin(x * 0.012 + i * 1.2 + p.frameCount * 0.03) * (28 + i * 8) * melody;
        p.vertex(x, y);
      }
      p.endShape();
    }
  }
  p.pop();
}

export function drawDataSmogLayer(p: p5, theme: StageTheme, w: number, h: number): void {
  if (theme.smogDensity < 0.05) {
    return;
  }
  p.noStroke();
  const density = theme.smogDensity;
  const count = 16 + Math.floor(density * 10);

  for (let i = 0; i < count; i++) {
    const seed = i * 97.13;
    const x =
      ((seed * 173 + p.frameCount * (0.18 + (i % 5) * 0.04)) % (w + 260)) - 130;
    const y = h * (0.18 + (i % 6) * 0.11) + p.sin(p.frameCount * 0.008 + seed) * 12;
    const rx = 70 + (i % 4) * 28 + p.noise(i * 0.3, p.frameCount * 0.003) * 60;
    const ry = 22 + (i % 3) * 14 + p.noise(i * 0.5 + 10, p.frameCount * 0.003) * 24;
    const alpha = (42 + (i % 5) * 10) * density;

    p.fill(168, 192, 218, alpha);
    p.ellipse(x, y, rx * 2, ry * 2);
    p.fill(178, 200, 224, alpha * 0.75);
    p.ellipse(x + rx * 0.25, y - ry * 0.1, rx * 1.4, ry * 1.5);
  }
}

export function drawSceneFlash(p: p5, w: number, h: number, flash: number): void {
  if (flash <= 0.01) {
    return;
  }
  p.noStroke();
  p.fill(255, 245, 220, flash * 90);
  p.rect(0, 0, w, h);
}

export function drawWhiteVignette(p: p5, w: number, h: number, amount: number): void {
  if (amount <= 0.02) {
    return;
  }
  p.noStroke();
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    p.fill(255, 255, 255, amount * 22 * (1 - t));
    p.rect(0, 0, w, h * t * 0.15);
    p.rect(0, h * (1 - t * 0.15), w, h * t * 0.15);
  }
}
