export interface OngakutaiMemberPos {
  x: number;
  y: number;
}

const PI = Math.PI;

function mapValue(value: number, start1: number, stop1: number, start2: number, stop2: number): number {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

/** 音楽隊メンバーの canvas 座標（p5 と同じ式） */
export function computeOngakutaiMemberPositions(
  totalCount: number,
  width: number,
  height: number,
  beatPulse: number,
  frameCount: number,
): OngakutaiMemberPos[] {
  if (totalCount <= 0) return [];

  const scale = 0.68 + Math.min(totalCount, 20) * 0.07;
  const cx = width / 2;
  const cy = height * 0.72;
  const members = Math.min(totalCount, 21);
  const positions: OngakutaiMemberPos[] = [];

  for (let i = 0; i < members; i++) {
    const angle = mapValue(i, 0, members, PI * 0.15, PI * 0.85);
    const r = 80 + (i % 3) * 18;
    const lx = Math.cos(angle) * r * (i % 2 === 0 ? 1 : 0.85);
    const ly = -Math.sin(angle) * r * 0.35 - 10;
    const bob = Math.sin(frameCount * 0.05 + i * 0.7) * 3 + beatPulse * 5;
    positions.push({ x: cx + lx * scale, y: cy + (ly + bob) * scale });
  }

  return positions;
}

/** 次の収集で増えるメンバーの着地点（canvas 座標） */
export function getNextCollectLandingPosition(
  currentCount: number,
  width: number,
  height: number,
  beatPulse: number,
  frameCount: number,
): OngakutaiMemberPos {
  const positions = computeOngakutaiMemberPositions(
    currentCount + 1,
    width,
    height,
    beatPulse,
    frameCount,
  );

  return positions[positions.length - 1] ?? { x: width / 2, y: height * 0.72 };
}

export function canvasPointToScreen(
  x: number,
  y: number,
  canvas: HTMLCanvasElement | null,
): OngakutaiMemberPos {
  
  if (!canvas) 
  {
    return { x, y };
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / (canvas.width || rect.width);
  const scaleY = rect.height / (canvas.height || rect.height);
  return { x: rect.left + x * scaleX, y: rect.top + y * scaleY };
}
