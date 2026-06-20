export type Rgb = [number, number, number];

/** 歌詞「青、かな」で世界に広がる色（空のテーマ反映用） */
export const LYRIC_BLUE: Rgb = [72, 132, 255];

export class UserSession {
  get primaryColor(): Rgb {
    return LYRIC_BLUE;
  }

  get isReady(): boolean {
    return true;
  }
}
