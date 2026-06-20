import type p5 from "p5";
import type { StageTheme } from "../stage/themes";
import { isSpanKeyInPhrase } from "./keywords";

export interface OngakutaiMemberPos {
  x: number;
  y: number;
}

export type BandMemberPos = OngakutaiMemberPos;

/**
 * 歌詞から集めた音符の数と、画面下の音楽隊（ongakutai）の描画を管理する。
 * 同じ種類（例: uta）でも出現箇所ごとに別々に収集できる。
 */
export class OngakutaiBand {
  collectedCount = 0;

  private readonly collectedSpanKeys = new Set<string>();

  reset(): void {
    this.collectedCount = 0;
    this.collectedSpanKeys.clear();
  }

  isSpanCollected(spanKey: string): boolean {
    return this.collectedSpanKeys.has(spanKey);
  }

  /** 1か所分の出現を収集（同じスパンは1回まで） */
  collectSpan(spanKey: string): boolean {
    if (this.collectedSpanKeys.has(spanKey)) {
      return false;
    }
    this.collectedSpanKeys.add(spanKey);
    this.collectedCount++;
    return true;
  }

  /**
   * 同じフレーズが再び流れたとき、再収集できるようにする。
   * 既に増えた音楽隊の人数は維持する。
   */
  clearPhraseCollection(phraseStartTime: number): void {
    for (const key of this.collectedSpanKeys) {
      if (isSpanKeyInPhrase(phraseStartTime, key)) {
        this.collectedSpanKeys.delete(key);
      }
    }
  }

  getBandScale(): number {
    return 0.68 + Math.min(this.collectedCount, 20) * 0.07;
  }

  getMemberPositions(
    p: p5,
    width: number,
    height: number,
    beatPulse: number,
  ): OngakutaiMemberPos[] {
    const count = this.collectedCount;
    if (count <= 0) return [];

    const scale = this.getBandScale();
    const cx = width / 2;
    const cy = height * 0.72;
    const members = Math.min(count, 21);
    const positions: OngakutaiMemberPos[] = [];

    for (let i = 0; i < members; i++) {
      const angle = p.map(i, 0, members, p.PI * 0.15, p.PI * 0.85);
      const r = 80 + (i % 3) * 18;
      const lx = p.cos(angle) * r * (i % 2 === 0 ? 1 : 0.85);
      const ly = -p.sin(angle) * r * 0.35 - 10;
      const bob = p.sin(p.frameCount * 0.05 + i * 0.7) * 3 + beatPulse * 5;
      positions.push({ x: cx + lx * scale, y: cy + (ly + bob) * scale });
    }
    return positions;
  }

  getBandMemberPositions(
    p: p5,
    width: number,
    height: number,
    beatPulse: number,
  ): OngakutaiMemberPos[] {
    return this.getMemberPositions(p, width, height, beatPulse);
  }

  drawOngakutai(
    p: p5,
    theme: StageTheme,
    width: number,
    height: number,
    beatPulse: number,
  ): void {
    const count = this.collectedCount;
    if (count <= 0) return;

    const scale = this.getBandScale();
    const cx = width / 2;
    const cy = height * 0.72;
    const members = Math.min(count, 21);

    p.push();
    p.translate(cx, cy);
    p.scale(scale);
    p.textAlign(p.CENTER, p.CENTER);

    for (let i = 0; i < members; i++) {
      const angle = p.map(i, 0, members, p.PI * 0.15, p.PI * 0.85);
      const r = 80 + (i % 3) * 18;
      const x = p.cos(angle) * r * (i % 2 === 0 ? 1 : 0.85);
      const y = -p.sin(angle) * r * 0.35 - 10;
      const bob = p.sin(p.frameCount * 0.05 + i * 0.7) * 3 + beatPulse * 5;

      p.fill(theme.accent[0], theme.accent[1], theme.accent[2], 180);
      p.noStroke();
      p.circle(x, y + bob, 32 + (i % 4));
      p.fill(255, 245, 220);
      p.textSize(19);
      p.text("♪", x, y + bob);
    }

    p.pop();
  }

  drawMusicBand(
    p: p5,
    theme: StageTheme,
    width: number,
    height: number,
    beatPulse: number,
  ): void {
    this.drawOngakutai(p, theme, width, height, beatPulse);
  }
}

export class NoteCreatureField extends OngakutaiBand {}
