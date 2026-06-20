/**
 * 世界最後の音楽隊 — 楽曲・音楽地図のバージョン固定
 * @see https://developer.textalive.jp/events/magicalmirai2026/
 */
export const SONG = {
  title: "世界最後の音楽隊",
  artists: "夏山よつぎ × ど～ぱみん",
  url: "https://piapro.jp/t/B3yJ/20251215061727",
  video: {
    beatId: 4827296,
    chordId: 2963757,
    repetitiveSegmentId: 3086264,
    lyricId: 126594,
    lyricDiffId: 28629,
  },
} as const;

export const APP_TOKEN = import.meta.env.VITE_TEXTALIVE_APP_TOKEN as string | undefined;

/** フレーズ切り替え時のクロスフェード時間 [ms] */
export const SCENE_TRANSITION_MS = 2200;

/** データスモッグを払い切ったとみなす割合 */
export const SMOG_CLEAR_THRESHOLD = 0.48;

/** スモッグ払いのブラシ半径 [px] */
export const SMOG_BRUSH_RADIUS = 42;

/** 1回目のデータスモッグが自動で晴れるまでの時間 [ms] */
export const SMOG_AUTO_CLEAR_MS = 10000;

/** ドラッグで動かせる視点の最大オフセット（px） */
export const CAMERA_DRAG_MAX = 180;

/** ホイールズーム範囲 */
export const CAMERA_ZOOM_MIN = 0.82;
export const CAMERA_ZOOM_MAX = 1.35;
