# 世界最後の音楽隊 — リリック・ステージ

[初音ミク「マジカルミライ 2026」プログラミング・コンテスト](https://magicalmirai.com/2026/procon/) 応募作品

**対象楽曲:** 世界最後の音楽隊 / 夏山よつぎ × ど～ぱみん  
**技術:** Vite + TypeScript + p5.js + TextAlive App API  
**動作環境:** PC 向け Web ブラウザ（Chrome / Edge 推奨）

## 作品概要

歌詞のキーワード（オンガク・旋律・メロディ・歌・コエ）を集めて、画面下の「音楽隊」を育てていくリリック体験です。

- **データスモッグ** — 歌詞「データスモッグ」でグリッド状のスモッグが出現。マウスドラッグで払う
- **青、かな** — 空の色が広がる演出
- **音符収集** — 収集ワードが歌い終わると浮遊。クリックで集め、音楽隊が成長
- **繰り返し収集** — サビ等で同じワードが再登場するたび、また集められる

## 操作

| 操作 | 効果 |
|------|------|
| 再生 / Space | 楽曲の再生・一時停止 |
| 浮遊ワードをクリック | 音符を収集 |
| ドラッグ（スモッグ時） | スモッグを払う |
| ドラッグ（通常時） | 視点移動 |
| ホイール | ズーム |

## セットアップ

```bash
npm install
cp .env.example .env
# .env に VITE_TEXTALIVE_APP_TOKEN を設定
npm run dev
```

本番ビルド:

```bash
npm run build
npm run preview
```

## ソース構成（審査員向け）

```
src/
  main.ts                 … エントリーポイント
  config/song.ts          … 楽曲 ID・各種定数（TextAlive 公式値を固定）
  shushu/
    keywords.ts           … 収集対象ワードの検出（ongaku / senritsu / melody / uta / koe）
    ongakutaiBand.ts      … 収集数の管理と p5 による音楽隊（ongakutai）描画
  kashi/
    display.ts            … カラオケ歌詞（kashi）の DOM 描画
    ukabuWord.ts          … 浮遊ワード（ukabu word）の UI とクリック収集
  textalive/
    player.ts             … TextAlive Player の初期化・再生同期
  stage/
    StageManager.ts       … 物語進行（スモッグ / 色 / テーマ切替）
    StageState.ts         … ステージ内部状態
    themes.ts             … フレーズごとの配色テーマ
  interaction/SmogGrid.ts   … データスモッグ（グリッド + 0/1 表現）
  narrative/triggers.ts   … 歌詞トリガー（データスモッグ / 青、かな 等）
  p5/
    sketch.ts             … p5.js メインループ
    stageRenderer.ts      … 空・パーティクル・演出描画
  session/UserSession.ts    … セッション状態
```

### データの流れ

1. `textalive/player.ts` が TextAlive から再生位置・歌詞を受け取る
2. `kashi/display.ts` が歌詞を描画し、収集対象ワードを青く表示
3. ワードが歌い終わると `kashi/ukabuWord.ts` が浮遊体を出す
4. クリックで `stage/StageManager.ts` → `shushu/ongakutaiBand.ts` に渡り、音楽隊が増える
5. `p5/sketch.ts` が背景・スモッグ・音楽隊を描画

### 命名について

ドメイン語はローマ字（`shushu`, `kashi`, `ukabu`, `ongakutai`）、処理名は一般的な英語（`render`, `spawn`, `collect`）で統一しています。

## 楽曲データ

`src/config/song.ts` に TextAlive 公式の `beatId` / `chordId` / `lyricDiffId` を固定しています。

- 公式: https://developer.textalive.jp/events/magicalmirai2026/

## 応募時メモ

- GitHub プライベートリポジトリに本ソースを含め、`magicalmirai-procon` と共有
- 募集期間中（〜 2026/6/29 正午）はデモ動画・詳細公開禁止（[応募のきまり](https://magicalmirai.com/2026/procon/) 参照）
- 静的サイトとして `dist/` をホスティング可能（PHP / Node サーバ不要）

## ライセンス・権利

- 楽曲・歌詞: マジカルミライ 2026 プロコン対象曲として TextAlive 経由で利用
- 本アプリのソースコード: 応募者著作物
- 使用ライブラリ: textalive-app-api, p5.js（各ライセンスに従う）
