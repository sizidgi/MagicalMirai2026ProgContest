import { Player, type IPhrase, type IPlayerApp, type PlayerListener } from "textalive-app-api";
import { APP_TOKEN, SONG } from "../config/song";
import {
  makeSpanKey,
  detectShushuSpans,
  isSpanFinished,
  isLabelEndChar,
  isSpanEndWord,
  isSpanAtPhraseTail,
  type ShushuSpan,
} from "../shushu/keywords";
import type { UserSession } from "../session/UserSession";
import { StageManager } from "../stage/StageManager";
import { isAnataMouNanimoIwanakatta, isJikanKasokuKaishi, isKyokuOwari } from "../narrative/triggers";
import { ChiriPhraseLayer } from "../kashi/chiriPhrase";
import { UkabuWordLayer } from "../kashi/ukabuWord";
import { measureSpanAnchor, renderPhraseKashi } from "../kashi/display";
import {
  clearSpanAnchorCache,
  getRememberedSpanAnchor,
  rememberSpanAnchors,
} from "../kashi/spanAnchorCache";

export interface PlayerUi {
  playBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  lyricDisplay: HTMLElement;
  floatingCollectHost: HTMLElement;
  chiriPhraseHost: HTMLElement;
  noteCount: HTMLElement;
  beatIndicator: HTMLElement;
  volumeSlider: HTMLInputElement;
  loadingOverlay: HTMLElement;
  introOverlay: HTMLElement;
  startBtn: HTMLButtonElement;
}

function syncNoteCountDisplay(stageManager: StageManager, ui: PlayerUi): void {
  ui.noteCount.textContent = String(stageManager.getSnapshot().notes.collectedCount);
}

function buildKashiRenderOptions(stageManager: StageManager, floating: UkabuWordLayer, chiri: ChiriPhraseLayer) {
  return {
    isSpanCollected: (spanKey: string) => stageManager.isSpanCollected(spanKey),
    activeFloatingSpanKeys: floating.getActiveFloatingSpanKeys(),
    spawnedSpanKeys: floating.getSpawnedSpanKeys(),
    hiddenPhraseStartTime: chiri.getHiddenPhraseStartTime(),
  };
}

function spawnUkabuWord(
  phrase: IPhrase,
  span: ShushuSpan,
  floating: UkabuWordLayer,
  stageManager: StageManager,
  lyricDisplay: HTMLElement,
): void {
  const spanKey = makeSpanKey(phrase.startTime, span);
  if (stageManager.isSpanCollected(spanKey) || floating.hasSpawnedSpan(spanKey)) {
    return;
  }
  const fallback = measureSpanAnchor(lyricDisplay, spanKey);
  const anchor = getRememberedSpanAnchor(spanKey, fallback);
  floating.spawn(spanKey, span.kind, span.label, anchor.x, anchor.y);
}

export function createTextAlivePlayer(
  mediaElement: HTMLElement,
  stageManager: StageManager,
  session: UserSession,
  ui: PlayerUi,
): { player: Player; requestPlayback: () => void } {
  const player = new Player({
    app: { token: APP_TOKEN ?? "" },
    mediaElement,
  });

  let lastPosition = 0;
  let lastPhrase: IPhrase | null = null;
  let timerReady = false;
  let experienceStarted = false;
  let introAcknowledged = false;
  let jikanKasokuKaishiZumi = false;
  let kyokuOwariShoriZumi = false;
  let chiriPhraseZumi = false;

  const appRoot = document.getElementById("app");

  const chiriPhrase = new ChiriPhraseLayer(ui.chiriPhraseHost);

  const floating = new UkabuWordLayer(
    ui.floatingCollectHost,
    (spanKey, kind) => {
      const ok = stageManager.collectFromKashi(spanKey, kind);
      if (ok) {
        syncNoteCountDisplay(stageManager, ui);
      }
      return ok;
    },
    (spanKey) => stageManager.isSpanCollected(spanKey),
  );

  const applyStopState = (): void => {
    ui.playBtn.disabled = true;
    ui.pauseBtn.disabled = true;
    ui.stopBtn.disabled = true;
    ui.lyricDisplay.replaceChildren();
    floating.reset();
    chiriPhrase.reset();
    clearSpanAnchorCache();
    stageManager.reset();
    lastPhrase = null;
    lastPosition = 0;
    jikanKasokuKaishiZumi = false;
    kyokuOwariShoriZumi = false;
    chiriPhraseZumi = false;
    experienceStarted = false;
    appRoot?.classList.remove("jikan-kasoku-chu", "experience-chu");
    syncNoteCountDisplay(stageManager, ui);
    if (!introAcknowledged) {
      showIntro();
    } else {
      ui.playBtn.disabled = false;
      ui.pauseBtn.disabled = true;
      ui.stopBtn.disabled = true;
    }
  };

  const showIntro = (): void => {
    if (introAcknowledged) return;
    ui.introOverlay.classList.remove("hidden");
    ui.startBtn.disabled = !timerReady;
    setTransportEnabled(false);
  };

  const beginExperience = (): void => {
    if (!timerReady || experienceStarted) return;
    introAcknowledged = true;
    experienceStarted = true;
    ui.introOverlay.classList.add("hidden");
    appRoot?.classList.add("experience-chu");
    setTransportEnabled(true);
    player.requestPlay();
  };

  const kaishiJikanKasoku = (): void => {
    if (jikanKasokuKaishiZumi) return;
    jikanKasokuKaishiZumi = true;
    stageManager.beginJikanKasoku();
    appRoot?.classList.add("jikan-kasoku-chu");
  };

  const setTransportEnabled = (enabled: boolean) => {
    ui.playBtn.disabled = !enabled;
    ui.pauseBtn.disabled = !enabled;
    ui.stopBtn.disabled = !enabled;
  };

  const trySpawnUkabuOnTiming = (
    phrase: IPhrase,
    position: number,
    prevPosition: number,
    charChange: ReturnType<NonNullable<Player["video"]>["findCharChange"]>,
    wordChange: ReturnType<NonNullable<Player["video"]>["findWordChange"]>,
    phraseEnding = false,
  ): void => {
    const checkTime = Math.max(position, prevPosition);

    for (const exitedChar of charChange.left) {
      for (const span of detectShushuSpans(phrase)) {
        if (!isLabelEndChar(phrase, span, exitedChar)) continue;
        spawnUkabuWord(phrase, span, floating, stageManager, ui.lyricDisplay);
      }
    }

    for (const exitedWord of wordChange.left) {
      const wordIndex = phrase.children.indexOf(exitedWord);
      if (wordIndex < 0) continue;
      for (const span of detectShushuSpans(phrase)) {
        if (!isSpanEndWord(span, wordIndex)) continue;
        if (exitedWord.children.length > 0) continue;
        spawnUkabuWord(phrase, span, floating, stageManager, ui.lyricDisplay);
      }
    }

    for (const span of detectShushuSpans(phrase)) {
      const finished =
        isSpanFinished(span, position, prevPosition) ||
        (phraseEnding && isSpanAtPhraseTail(phrase, span) && checkTime >= span.endTime);
      if (!finished) continue;
      spawnUkabuWord(phrase, span, floating, stageManager, ui.lyricDisplay);
    }
  };

  const tryBeginChiriPhrase = (phrase: IPhrase, position: number, prevPosition: number): void => {
    if (chiriPhraseZumi || chiriPhrase.isAnimating() || chiriPhrase.getHiddenPhraseStartTime() !== null) {
      return;
    }
    if (!isAnataMouNanimoIwanakatta(phrase.text)) return;
    if (position < phrase.endTime || prevPosition >= phrase.endTime) return;

    const renderOptions = buildKashiRenderOptions(stageManager, floating, chiriPhrase);
    renderPhraseKashi(ui.lyricDisplay, phrase, phrase.endTime, renderOptions);
    chiriPhrase.begin(ui.lyricDisplay, phrase.startTime);
    chiriPhraseZumi = true;
    ui.lyricDisplay.replaceChildren();
  };

  const listener: PlayerListener = {
    onAppReady(app: IPlayerApp) {
      if (!app.managed) {
        void player.createFromSongUrl(SONG.url, { video: { ...SONG.video } });
      }
    },

    onVideoReady() {
      ui.loadingOverlay.classList.add("hidden");
      if (player.video && player.video.phraseCount > 0) {
        stageManager.bootstrapInitialScene(player.video.getPhrase(0), 0);
      }
      syncNoteCountDisplay(stageManager, ui);
      showIntro();
    },

    onTimerReady() {
      timerReady = true;
      ui.startBtn.disabled = false;
    },

    onPlay() {
      ui.playBtn.disabled = true;
      ui.pauseBtn.disabled = false;
      floating.resume();
      chiriPhrase.resume();
    },

    onPause() {
      ui.playBtn.disabled = false;
      ui.pauseBtn.disabled = true;
      floating.pause();
      chiriPhrase.pause();
    },

    onStop() {
      applyStopState();
    },

    onTimeUpdate(position: number) {
      if (!player.video || !session.isReady || !experienceStarted) return;

      if (isKyokuOwari(position, player.video.duration) && !kyokuOwariShoriZumi) {
        kyokuOwariShoriZumi = true;
        player.requestStop();
        return;
      }

      const phrase = player.video.findPhrase(position);
      const chorus = player.findChorus(position);
      const beat = player.findBeat(position);

      const beatStrength = beat ? beat.progress(position) : 0;
      const inChorus = chorus !== null;

      const phraseChange = player.video.findPhraseChange(lastPosition, position);
      const wordChange = player.video.findWordChange(lastPosition, position);
      const charChange = player.video.findCharChange(lastPosition, position);
      let renderOptions = buildKashiRenderOptions(stageManager, floating, chiriPhrase);

      if (!jikanKasokuKaishiZumi && phrase && isJikanKasokuKaishi(phrase.text)) {
        kaishiJikanKasoku();
      }

      if (phraseChange.entered.some((entry) => isJikanKasokuKaishi(entry.text))) {
        kaishiJikanKasoku();
      }

      const chiriCandidate =
        phrase &&
        lastPosition < phrase.endTime &&
        position >= phrase.endTime &&
        isAnataMouNanimoIwanakatta(phrase.text)
          ? phrase
          : lastPhrase &&
              lastPosition < lastPhrase.endTime &&
              position >= lastPhrase.endTime &&
              isAnataMouNanimoIwanakatta(lastPhrase.text)
            ? lastPhrase
            : null;

      if (chiriCandidate) {
        tryBeginChiriPhrase(chiriCandidate, position, lastPosition);
      }

      renderOptions = buildKashiRenderOptions(stageManager, floating, chiriPhrase);

      if (phraseChange.entered.length > 0) {
        if (lastPhrase) {
          renderPhraseKashi(
            ui.lyricDisplay,
            lastPhrase,
            Math.min(lastPosition, lastPhrase.endTime),
            renderOptions,
          );
          rememberSpanAnchors(ui.lyricDisplay);
          trySpawnUkabuOnTiming(
            lastPhrase,
            position,
            lastPosition,
            charChange,
            wordChange,
            true,
          );
        }
        const enteredPhrase = phraseChange.entered[0];
        chiriPhrase.releaseHiddenPhrase(enteredPhrase.startTime);
        stageManager.onPhraseReenter(enteredPhrase.startTime);
        floating.clearPhraseSpawn(enteredPhrase.startTime);

        const phraseIndex = resolvePhraseIndex(player.video, enteredPhrase);
        stageManager.applyPhraseChange(phraseChange.entered, inChorus, phraseIndex);
      } else {
        stageManager.onTimeUpdate(position, phrase, inChorus, beatStrength);
      }

      // フレーズ間の無歌詞区間（メロディ終了→次フレーズまで約5秒など）でも浮遊を開始する
      const gapPhrase =
        !phrase && lastPhrase && position > lastPhrase.endTime ? lastPhrase : null;
      if (gapPhrase) {
        renderPhraseKashi(ui.lyricDisplay, gapPhrase, gapPhrase.endTime, renderOptions);
        rememberSpanAnchors(ui.lyricDisplay);
        trySpawnUkabuOnTiming(
          gapPhrase,
          position,
          lastPosition,
          charChange,
          wordChange,
          true,
        );
      }

      if (phrase) {
        if (phraseChange.entered.length === 0) {
          trySpawnUkabuOnTiming(
            phrase,
            position,
            lastPosition,
            charChange,
            wordChange,
            false,
          );
        }
        renderPhraseKashi(ui.lyricDisplay, phrase, position, renderOptions);
        rememberSpanAnchors(ui.lyricDisplay);
        lastPhrase = phrase;
      } else if (!gapPhrase) {
        ui.lyricDisplay.replaceChildren();
      }

      syncNoteCountDisplay(stageManager, ui);
      ui.beatIndicator.style.opacity = String(0.25 + beatStrength * 0.75);
      ui.beatIndicator.style.transform = `scale(${1 + beatStrength * 0.45})`;
      lastPosition = position;
    },
  };

  player.addListener(listener);

  player.volume = Number(ui.volumeSlider.value);
  ui.volumeSlider.addEventListener("input", () => {
    player.volume = Number(ui.volumeSlider.value);
  });

  ui.playBtn.addEventListener("click", () => {
    if (!timerReady) return;
    if (!experienceStarted) {
      if (introAcknowledged) {
        experienceStarted = true;
        appRoot?.classList.add("experience-chu");
        setTransportEnabled(true);
        player.requestPlay();
      }
      return;
    }
    player.requestPlay();
  });
  ui.pauseBtn.addEventListener("click", () => player.requestPause());
  ui.stopBtn.addEventListener("click", () => player.requestStop());
  ui.startBtn.addEventListener("click", () => beginExperience());

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (!timerReady) return;
      if (!experienceStarted) {
        if (introAcknowledged) {
          experienceStarted = true;
          appRoot?.classList.add("experience-chu");
          setTransportEnabled(true);
          player.requestPlay();
        }
        return;
      }
      if (player.isPlaying) {
        player.requestPause();
      } else {
        player.requestPlay();
      }
    }
  });

  const requestPlayback = (): void => {
    beginExperience();
  };

  return { player, requestPlayback };
}

function resolvePhraseIndex(
  video: NonNullable<Player["video"]>,
  phrase: IPhrase,
): number {
  for (let i = 0; i < video.phraseCount; i++) {
    if (video.getPhrase(i).startTime === phrase.startTime) {
      return i;
    }
  }
  return 0;
}
