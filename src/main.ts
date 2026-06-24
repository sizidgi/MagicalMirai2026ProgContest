import { APP_TOKEN } from "./config/song";
import { createSketch } from "./p5/sketch";
import { UserSession } from "./session/UserSession";
import { StageManager } from "./stage/StageManager";
import { createTextAlivePlayer } from "./textalive/player";
import "./style.css";

function main(): void {
  if (!APP_TOKEN || APP_TOKEN === "your_app_token_here") {
    document.getElementById("token-error")?.classList.remove("hidden");
    document.getElementById("loading")?.classList.add("hidden");
    return;
  }

  const canvasHost = document.getElementById("canvas-host");
  const mediaElement = document.getElementById("media");
  if (!canvasHost || !mediaElement) {
    throw new Error("Required DOM elements not found");
  }

  const session = new UserSession();
  const stageManager = new StageManager(session);
  createSketch(stageManager, canvasHost);

  createTextAlivePlayer(mediaElement, stageManager, session, {
    playBtn: document.getElementById("btn-play") as HTMLButtonElement,
    pauseBtn: document.getElementById("btn-pause") as HTMLButtonElement,
    stopBtn: document.getElementById("btn-stop") as HTMLButtonElement,
    lyricDisplay: document.getElementById("lyric-display") as HTMLElement,
    chiriPhraseHost: document.getElementById("chiri-phrase-host") as HTMLElement,
    floatingCollectHost: document.getElementById("floating-collect-host") as HTMLElement,
    noteCount: document.getElementById("note-count") as HTMLElement,
    beatIndicator: document.getElementById("beat-indicator") as HTMLElement,
    volumeSlider: document.getElementById("volume-slider") as HTMLInputElement,
    loadingOverlay: document.getElementById("loading") as HTMLElement,
    introOverlay: document.getElementById("intro-overlay") as HTMLElement,
    startBtn: document.getElementById("btn-start") as HTMLButtonElement,
    maruHikariTextHost: document.getElementById("maru-hikari-text-host") as HTMLElement,
  });
}

main();
