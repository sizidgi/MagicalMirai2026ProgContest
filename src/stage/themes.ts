/** ステージセットのビジュアルテーマ */
export interface StageTheme {
  id: string;
  label: string;
  skyTop: [number, number, number];
  skyBottom: [number, number, number];
  ground: [number, number, number];
  stageWood: [number, number, number];
  accent: [number, number, number];
  spotlight: [number, number, number];
  particleHue: number;
  /** 背景モチーフ */
  backdrop: "ruins" | "datasmog" | "march" | "sorrow" | "light" | "finale" | "future";
  /** データスモッグの濃さ 0–1 */
  smogDensity: number;
  /** 空の色有无（「色なんてない」→ 低彩度） */
  desaturate: number;
}

/** 空っぽな心・無色の空 */
const THEME_EMPTY: StageTheme = {
  id: "empty",
  label: "空っぽなココロ",
  skyTop: [28, 32, 42],
  skyBottom: [62, 66, 74],
  ground: [20, 22, 28],
  stageWood: [48, 44, 40],
  accent: [180, 188, 200],
  spotlight: [210, 215, 225],
  particleHue: 220,
  backdrop: "ruins",
  smogDensity: 0.15,
  desaturate: 0.85,
};

/** 機械の上で踊る・データスモッグ */
const THEME_DATASMOG: StageTheme = {
  id: "datasmog",
  label: "データスモッグ",
  skyTop: [10, 16, 28],
  skyBottom: [36, 52, 68],
  ground: [14, 20, 26],
  stageWood: [40, 48, 56],
  accent: [120, 200, 255],
  spotlight: [160, 220, 255],
  particleHue: 195,
  backdrop: "datasmog",
  smogDensity: 0.72,
  desaturate: 0.4,
};

/** 小さなマーチ */
const THEME_MARCH: StageTheme = {
  id: "march",
  label: "小さなマーチ",
  skyTop: [22, 28, 48],
  skyBottom: [130, 88, 52],
  ground: [32, 26, 22],
  stageWood: [78, 56, 38],
  accent: [255, 176, 72],
  spotlight: [255, 210, 140],
  particleHue: 28,
  backdrop: "march",
  smogDensity: 0.25,
  desaturate: 0.1,
};

/** カナシミは青 */
const THEME_SORROW: StageTheme = {
  id: "sorrow",
  label: "青いカナシミ",
  skyTop: [8, 18, 48],
  skyBottom: [40, 72, 120],
  ground: [16, 22, 36],
  stageWood: [52, 58, 72],
  accent: [120, 180, 255],
  spotlight: [160, 200, 255],
  particleHue: 215,
  backdrop: "sorrow",
  smogDensity: 0.35,
  desaturate: 0.2,
};

/** ヒカリの中で歌う */
const THEME_LIGHT: StageTheme = {
  id: "light",
  label: "ヒカリの中で",
  skyTop: [18, 14, 32],
  skyBottom: [200, 140, 64],
  ground: [24, 18, 22],
  stageWood: [88, 62, 42],
  accent: [255, 228, 140],
  spotlight: [255, 245, 210],
  particleHue: 42,
  backdrop: "light",
  smogDensity: 0.12,
  desaturate: 0,
};

/** サビ — 最後のオンガク */
const THEME_FINALE: StageTheme = {
  id: "finale",
  label: "最後のオンガク",
  skyTop: [6, 6, 20],
  skyBottom: [220, 72, 40],
  ground: [16, 10, 18],
  stageWood: [96, 60, 38],
  accent: [255, 220, 96],
  spotlight: [255, 240, 200],
  particleHue: 14,
  backdrop: "finale",
  smogDensity: 0.08,
  desaturate: 0,
};

/** 未来・新しい文明 */
const THEME_FUTURE: StageTheme = {
  id: "future",
  label: "託されたコエ",
  skyTop: [4, 8, 24],
  skyBottom: [48, 80, 120],
  ground: [12, 16, 28],
  stageWood: [72, 68, 80],
  accent: [200, 230, 255],
  spotlight: [220, 240, 255],
  particleHue: 200,
  backdrop: "future",
  smogDensity: 0.05,
  desaturate: 0,
};

export const STAGE_THEMES: StageTheme[] = [
  THEME_EMPTY,
  THEME_DATASMOG,
  THEME_MARCH,
  THEME_SORROW,
  THEME_LIGHT,
  THEME_FINALE,
  THEME_FUTURE,
];

/** 歌詞テキストとサビ判定からテーマを選ぶ */
export function pickThemeForPhrase(
  phraseText: string,
  inChorus: boolean,
  phraseIndex: number,
): StageTheme {
  if (inChorus) {
    return THEME_FINALE;
  }

  const t = phraseText;

  if (/データスモッグ|空っぽ|機械/.test(t)) return THEME_DATASMOG;
  if (/マーチ|進んで|止まって|踏み出/.test(t)) return THEME_MARCH;
  if (/青|カナシミ|ナミダ|涙|カタチをして/.test(t)) return THEME_SORROW;
  if (/ヒカリ|光|歌った|潤んだ/.test(t)) return THEME_LIGHT;
  if (/ミライ|未来|文明|コエ|最後|木霊|終わり/.test(t)) return THEME_FUTURE;
  if (/イロ|ソラ|色/.test(t)) return THEME_EMPTY;

  return STAGE_THEMES[phraseIndex % STAGE_THEMES.length];
}

export function blendThemes(from: StageTheme, to: StageTheme, t: number): StageTheme {
  const ease = t * t * (3 - 2 * t);
  return {
    id: to.id,
    label: to.label,
    skyTop: lerp3(from.skyTop, to.skyTop, ease),
    skyBottom: lerp3(from.skyBottom, to.skyBottom, ease),
    ground: lerp3(from.ground, to.ground, ease),
    stageWood: lerp3(from.stageWood, to.stageWood, ease),
    accent: lerp3(from.accent, to.accent, ease),
    spotlight: lerp3(from.spotlight, to.spotlight, ease),
    particleHue: from.particleHue + (to.particleHue - from.particleHue) * ease,
    backdrop: ease < 0.5 ? from.backdrop : to.backdrop,
    smogDensity: from.smogDensity + (to.smogDensity - from.smogDensity) * ease,
    desaturate: from.desaturate + (to.desaturate - from.desaturate) * ease,
  };
}

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function applyDesaturate(
  color: [number, number, number],
  amount: number,
): [number, number, number] {
  const gray = (color[0] + color[1] + color[2]) / 3;
  return [
    color[0] + (gray - color[0]) * amount,
    color[1] + (gray - color[1]) * amount,
    color[2] + (gray - color[2]) * amount,
  ];
}

const WHITE: [number, number, number] = [244, 244, 248];

/** ユーザーの色と白い世界の物語をテーマに反映 */
export function applyUserNarrativeToTheme(
  base: StageTheme,
  userColor: [number, number, number],
  colorSpread: number,
  wordReveal: number,
): StageTheme {
  const spread = Math.max(0, Math.min(1, colorSpread));
  const whiteAmount = 1 - spread;

  const skyTop = lerp3(WHITE, lerp3(WHITE, userColor, 0.35), 1 - whiteAmount * 0.85);
  const skyBottom = lerp3(
    lerp3(WHITE, userColor, 0.25),
    lerp3(userColor, base.skyBottom, 0.5),
    spread,
  );
  const accent = lerp3(base.accent, userColor, 0.55 + spread * 0.35);
  const ground = lerp3(lerp3(WHITE, userColor, 0.08), base.ground, spread);

  return {
    ...base,
    skyTop,
    skyBottom,
    ground,
    accent,
    spotlight: lerp3(base.spotlight, userColor, spread * 0.45 + wordReveal * 0.25),
    desaturate: base.desaturate * (1 - spread) * (1 - wordReveal * 0.3),
    smogDensity: base.smogDensity * (0.6 + spread * 0.4),
  };
}
