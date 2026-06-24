# 世界最後の音楽隊 — リリックアプリ

[初音ミク「マジカルミライ 2026」プログラミング・コンテスト](https://magicalmirai.com/2026/procon/) 応募作品

**対象楽曲:** 世界最後の音楽隊 / 夏山よつぎ × ど～ぱみん  
**技術:** Vite + TypeScript + p5.js + TextAlive App API  
**動作環境:** PC 向け Web ブラウザ（Chrome / Edge 推奨）

## 作品概要

歌詞のキーワード（オンガク・旋律・メロディ・歌・コエ）を集めて、画面下の「音楽隊」を育てていくリリック体験です。
インタラクティブな要素は世界観に合わせ、できる限りこれだと思ったものを実装していますが、ゲーム型のリリックアプリと比べると物足りなさを感じるかもしれませんが
その分曲の世界観にこだわって演出を考えうる限りの実装を行っています。

主な演出など
- **操作説明** — 初回のみ、中央パネルと「再生」ボタンで体験開始
- **データスモッグ** — 歌詞「データスモッグ」でグリッド状のスモッグが出現。マウスドラッグ/タッチスワイプで払う
- **歌詞ごとの感情表現を背景の色で演出** — 空の色が広がる演出、ミライへの希望など
- **音符収集** — 収集ワードが歌い終わると浮遊。クリックで集め、音楽隊が構成
- **エピローグの時間加速** — 雲と光が右へ流れ、曲の終わりで停止　※世界観の表現上ミクが停止するための表現として多重エフェクトを組んでおりますが、お使いの端末が悪いわけではございません。

ほか、世界最後の音楽隊の儚く、美しい世界観に限りなく合わせられるよう、楽曲の歌詞の意味を持たせられるように画面に演出を加えています。

## 操作

| 操作 | 効果 |
|------|------|
| 初回「再生」（中央パネル） | 体験開始（以降はヘッダーの再生で再開） |
| 再生 / Space | 楽曲の再生・一時停止 |
| 浮遊ワードをクリック | 音符を収集 |
| ドラッグ / タッチスワイプ（データスモッグ出現時） | スモッグを払う |
| 音量スライダー | 再生音量（0〜100） |

## スマホ対応について

**URL にアクセスすればスマホでも開けます、操作もPCと同じです**が、**快適な体験は PC 向け**です。

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
  style.css               … HUD・歌詞・浮遊ワード・操作説明等
  config/song.ts          … 楽曲 ID・各種定数（TextAlive 公式値を固定）
  shushu/
    keywords.ts           … 収集対象ワードの検出
    ongakutaiBand.ts      … 音楽隊の管理と p5 描画
  kashi/
    display.ts            … カラオケ歌詞の DOM 描画
    spanAnchorCache.ts    … 浮遊ワードの位置アンカー
    ukabuWord.ts          … 浮遊ワード UI
    chiriPhrase.ts        … 特定フレーズの塵演出
  textalive/
    player.ts             … TextAlive 同期・物語トリガー
  stage/
    StageManager.ts       … 物語進行
    StageState.ts         … ステージ内部状態
    themes.ts             … フレーズごとの配色
  interaction/SmogGrid.ts   … データスモッグ
  narrative/triggers.ts   … 歌詞・時間トリガー
  p5/
    sketch.ts             … p5 メインループ
    stageRenderer.ts      … 空・加速・パーティクル
    maruHikariLayer.ts    … 心の球体（WEBGL）
  session/UserSession.ts    … セッション状態
```

### データの流れ

1. `textalive/player.ts` が TextAlive から再生位置・歌詞を受け取る
2. `kashi/display.ts` が歌詞を描画し、収集対象ワードを青く表示
3. ワードが歌い終わると `kashi/ukabuWord.ts` が浮遊体を出す（画面外へ出たら消える）
4. クリックで `stage/StageManager.ts` → `shushu/ongakutaiBand.ts` に渡り、音楽隊が増える
5. `p5/sketch.ts` が背景・スモッグ・音楽隊・maruHikari 等を描画

### 命名について

ドメイン語はローマ字（`shushu`, `kashi`, `ukabu`, `ongakutai`, `jikanKasoku`, `maruHikari`, `chiri`）、処理名は英名で統一しています。

## 楽曲データ

`src/config/song.ts` に TextAlive 公式の ID を固定しています。

- 公式: https://developer.textalive.jp/events/magicalmirai2026/

## 応募時メモ

- GitHub プライベートリポジトリに本ソースを含め、`magicalmirai-procon` と共有
- 募集期間中（〜 2026/6/29 正午）はデモ動画・詳細公開禁止（[応募のきまり](https://magicalmirai.com/2026/procon/) 参照）
- 静的サイトとして `dist/` をホスティング可能（PHP / Node サーバ不要）

## ライセンス・権利

- 楽曲・歌詞: マジカルミライ 2026 プロコン対象曲として TextAlive 経由で利用
- 本アプリのソースコード: 応募者著作物
- 使用ライブラリ: textalive-app-api, p5.js（各ライセンスに従う）
