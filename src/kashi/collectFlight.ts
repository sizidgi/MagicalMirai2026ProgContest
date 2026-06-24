const FLIGHT_MS = 520;

export type CollectLandingTarget = () => { x: number; y: number };

interface ActiveFlight {
  el: HTMLElement;
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  startTime: number;
  onArrive: () => void;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function quadBezier(t: number, p0: number, p1: number, p2: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/** 収集ワード → 光の玉 → 音楽隊へ飛ぶ DOM アニメーション */
export class CollectFlightLayer {
  private flights: ActiveFlight[] = [];

  constructor(private readonly host: HTMLElement) {}

  launch(options: {
    originX: number;
    originY: number;
    label: string;
    resolveTarget: CollectLandingTarget;
    onArrive: () => void;
  }): void {
    const target = options.resolveTarget();
    const arcLift = 72 + Math.min(140, Math.abs(options.originY - target.y) * 0.18);

    const el = document.createElement("div");
    el.className = "collect-flight";
    el.setAttribute("aria-hidden", "true");

    const labelEl = document.createElement("span");
    labelEl.className = "collect-flight__label";
    labelEl.textContent = options.label;

    const orbEl = document.createElement("span");
    orbEl.className = "collect-flight__orb";
    orbEl.textContent = "♪";

    el.append(labelEl, orbEl);
    el.style.left = `${options.originX}px`;
    el.style.top = `${options.originY}px`;
    this.host.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add("collect-flight--active");
    });

    this.flights.push({
      el,
      startX: options.originX,
      startY: options.originY,
      controlX: (options.originX + target.x) / 2,
      controlY: Math.min(options.originY, target.y) - arcLift,
      endX: target.x,
      endY: target.y,
      startTime: performance.now(),
      onArrive: options.onArrive,
    });

    if (this.flights.length === 1) {
      requestAnimationFrame(this.tick);
    }
  }

  reset(): void {
    for (const flight of this.flights) {
      flight.el.remove();
    }
    this.flights = [];
  }

  private tick = (now: number): void => {
    this.flights = this.flights.filter((flight) => {
      const raw = Math.min(1, (now - flight.startTime) / FLIGHT_MS);
      const t = easeOutCubic(raw);
      const x = quadBezier(t, flight.startX, flight.controlX, flight.endX);
      const y = quadBezier(t, flight.startY, flight.controlY, flight.endY);

      flight.el.style.left = `${x}px`;
      flight.el.style.top = `${y}px`;
      flight.el.style.setProperty("--flight-t", String(raw));

      if (raw >= 1) {
        
        flight.el.classList.add("collect-flight--landed");
        flight.onArrive();
        window.setTimeout(() => flight.el.remove(), 160);

        return false;
      }

      return true;
    });

    if (this.flights.length > 0) {
      requestAnimationFrame(this.tick);
    }
  };
}
