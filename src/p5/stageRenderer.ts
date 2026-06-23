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

export function drawSky(
  p: p5,
  theme: StageTheme,
  w: number,
  h: number,
  plainness = 0,
  jikanKasoku = 0,
  scroll = 0,
): void {
  const rush = Math.max(0, Math.min(1, jikanKasoku));
  const emptiness = Math.max(0, Math.min(1, plainness));
  const top = applyDesaturate(theme.skyTop, theme.desaturate);
  const bottom = applyDesaturate(theme.skyBottom, theme.desaturate);
  const ground = applyDesaturate(theme.ground, theme.desaturate);

  const paleSky: [number, number, number] = [238, 240, 244];
  const paleHaze: [number, number, number] = [231, 233, 237];
  const palePlain: [number, number, number] = [224, 226, 230];
  const rushTint: [number, number, number] = [248, 250, 255];

  let skyTop = mixRgb(p, top, paleSky, emptiness);
  let skyBottom = mixRgb(p, bottom, paleHaze, emptiness);
  const plainTone = mixRgb(p, ground, palePlain, emptiness);
  if (rush > 0.05) {
    skyTop = mixRgb(p, skyTop, rushTint, rush * 0.45);
    skyBottom = mixRgb(p, skyBottom, rushTint, rush * 0.35);
  }

  const horizonY = h * p.lerp(0.66, 0.26, emptiness);
  const stageFloorTop = h * p.lerp(0.66, horizonY, emptiness * 0.85);
  const scrollShift = (scroll * 0.035) % 1;

  p.push();
  if (rush > 0.08) {
    p.translate(-scroll * 0.06, 0);
  }

  for (let y = 0; y < h; y++) {
    let rgb: [number, number, number];
    if (emptiness > 0.04) {
      if (y <= horizonY) {
        const t = y / Math.max(horizonY, 1);
        rgb = mixRgb(p, skyTop, skyBottom, t);
      } else {
        const t = (y - horizonY) / Math.max(h - horizonY, 1);
        rgb = mixRgb(p, skyBottom, plainTone, t * Math.min(1, emptiness * 0.42));
      }
    } else {
      const t = ((y / h) + scrollShift * rush) % 1;
      rgb = mixRgb(p, skyTop, skyBottom, t);
    }
    p.stroke(rgb[0], rgb[1], rgb[2]);
    p.line(0, y, w, y);
  }

  if (emptiness < 0.88) {
    p.noStroke();
    const floor = mixRgb(p, ground, plainTone, emptiness * 0.55);
    p.fill(floor[0], floor[1], floor[2]);
    p.rect(0, stageFloorTop, w, h - stageFloorTop);
  }

  if (emptiness > 0.18) {
    drawQuietPlainGrain(p, w, h, horizonY, emptiness);
    p.stroke(212, 216, 222, emptiness * 16);
    p.strokeWeight(1);
    p.line(0, horizonY, w, horizonY);
  }

  p.pop();
}

function mixRgb(
  p: p5,
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): [number, number, number] {
  return [p.lerp(from[0], to[0], t), p.lerp(from[1], to[1], t), p.lerp(from[2], to[2], t)];
}

/** ふわっとした雲 — 複数の楕円を重ねる（各 puff は相対配置） */
const CLOUD_PUFFS = [
  { ox: 0, oy: -0.38, ew: 1.05, eh: 1.0 },
  { ox: -0.34, oy: 0.12, ew: 1.0, eh: 0.96 },
  { ox: 0.34, oy: 0.12, ew: 1.0, eh: 0.96 },
  { ox: 0.1, oy: 0.3, ew: 0.94, eh: 0.92 },
] as const;

function drawFluffyCloud(
  p: p5,
  cx: number,
  cy: number,
  puffW: number,
  puffH: number,
  rgb: [number, number, number],
  alpha: number,
  seed = 0,
): void {
  p.noStroke();
  for (let i = 0; i < CLOUD_PUFFS.length; i++) {
    const puff = CLOUD_PUFFS[i];
    const jx = (p.noise(seed + i * 1.7) - 0.5) * 0.1;
    const jy = (p.noise(seed + i * 1.7 + 20) - 0.5) * 0.08;
    const js = 0.94 + p.noise(seed + i * 2.3 + 40) * 0.14;
    const px = cx + (puff.ox + jx) * puffW;
    const py = cy + (puff.oy + jy) * puffH;
    const pw = puffW * puff.ew * js;
    const ph = puffH * puff.eh * js;
    const layerAlpha = alpha * (1 - i * 0.03);
    p.fill(rgb[0], rgb[1], rgb[2], layerAlpha);
    p.ellipse(px, py, pw, ph);
  }
}

/** 無色の平原 — ごく薄い粒状テクスチャ */
function drawQuietPlainGrain(
  p: p5,
  w: number,
  h: number,
  horizonY: number,
  plainness: number,
): void {
  const step = 12;
  const alpha = plainness * 5.5;
  p.noStroke();

  for (let y = Math.floor(horizonY); y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const n = p.noise(x * 0.012, y * 0.012);
      if (n < 0.52) continue;
      const g = 218 + n * 28;
      p.fill(g, g, g + 3, alpha * (n - 0.48));
      p.rect(x, y, step - 1, step - 1);
    }
  }
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
    const puffW = rx * 1.35;
    const puffH = ry * 1.05;

    drawFluffyCloud(p, x, y, puffW, puffH, [168, 192, 218], alpha, seed);
    drawFluffyCloud(p, x + puffW * 0.04, y + puffH * 0.06, puffW * 0.88, puffH * 0.9, [178, 200, 224], alpha * 0.55, seed + 50);
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

/** エピローグ — 右へ流れる雲と光速線 */
export function drawJikanKasokuLayer(
  p: p5,
  w: number,
  h: number,
  scroll: number,
  intensity: number,
  frame: number,
): void {
  if (intensity < 0.03) return;

  const speed = scroll * 0.12 + frame * (0.8 + intensity * 16);
  p.noStroke();

  const cloudCount = 18 + Math.floor(intensity * 26);
  for (let i = 0; i < cloudCount; i++) {
    const seed = i * 173.17;
    const y = (seed * 47) % (h * 0.72) + h * 0.06;
    const x = ((seed * 97 + speed * (1.2 + (i % 5) * 0.15)) % (w + 520)) - 260;
    const alpha = (14 + intensity * 52) * (0.55 + 0.45 * p.noise(i * 0.4, frame * 0.01));
    const puffW = 52 + intensity * 118 + (i % 4) * 22 + p.noise(seed) * 28;
    const puffH = puffW * (0.28 + p.noise(seed + 11) * 0.08);

    drawFluffyCloud(p, x, y, puffW, puffH, [255, 255, 255], alpha, seed);
    drawFluffyCloud(
      p,
      x + puffW * 0.03,
      y + puffH * 0.05,
      puffW * 0.82,
      puffH * 0.88,
      [228, 236, 255],
      alpha * 0.5,
      seed + 80,
    );
  }

  p.stroke(255, 252, 245, intensity * 42);
  p.strokeWeight(1);
  const lineCount = 8 + Math.floor(intensity * 14);
  for (let i = 0; i < lineCount; i++) {
    const y = h * (0.08 + (i / lineCount) * 0.78);
    const x = ((i * 241 + speed * 2.2) % (w + 420)) - 210;
    const len = 60 + intensity * 280;
    p.line(x, y, x + len, y + (i % 2 === 0 ? 1 : -1));
  }
}
