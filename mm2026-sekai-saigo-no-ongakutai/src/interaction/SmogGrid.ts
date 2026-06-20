const CELL = 28;

/** マウスで払えるデータスモッグ */
export class SmogGrid {
  private cols = 0;
  private rows = 0;
  private cells: boolean[] = [];
  active = false;
  revealed = false;
  clearedRatio = 0;

  resize(width: number, height: number): void {
    this.cols = Math.ceil(width / CELL);
    this.rows = Math.ceil(height / CELL);
    this.cells = new Array(this.cols * this.rows).fill(false);
    if (this.active && !this.revealed) {
      this.fillAll();
    }
  }

  activate(): void {
    this.active = true;
    this.revealed = false;
    this.clearedRatio = 0;
    this.fillAll();
  }

  private fillAll(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = true;
    }
    this.clearedRatio = 0;
  }

  wipe(x: number, y: number, radius: number): void {
    if (!this.active || this.revealed) {
      return;
    }
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    const r = Math.ceil(radius / CELL);
    for (let gy = cy - r; gy <= cy + r; gy++) {
      for (let gx = cx - r; gx <= cx + r; gx++) {
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) {
          continue;
        }
        const dx = gx - cx;
        const dy = gy - cy;
        if (dx * dx + dy * dy <= r * r) {
          this.cells[gy * this.cols + gx] = false;
        }
      }
    }
    this.recalcCleared();
  }

  private recalcCleared(): void {
    if (this.cells.length === 0) {
      return;
    }
    let remaining = 0;
    for (const hasSmog of this.cells) {
      if (hasSmog) {
        remaining++;
      }
    }
    this.clearedRatio = 1 - remaining / this.cells.length;
  }

  markRevealed(threshold: number): boolean {
    if (this.revealed) {
      return false;
    }
    if (this.clearedRatio >= threshold) {
      this.revealAll();
      return true;
    }
    return false;
  }

  /** 1回目スモッグなど、時間経過で自動的に晴らす */
  autoClearAll(): void {
    this.revealAll();
  }

  private revealAll(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = false;
    }
    this.clearedRatio = 1;
    this.revealed = true;
    this.active = false;
  }

  drawSmog(
    p: import("p5"),
    _width: number,
    _height: number,
    frame: number,
  ): void {
    if (!this.active || this.revealed) {
      return;
    }
    p.noStroke();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.cells[y * this.cols + x]) {
          continue;
        }
        const px = x * CELL;
        const py = y * CELL;
        const n = p.noise(x * 0.08, y * 0.08, frame * 0.008);
        p.fill(130 + n * 40, 150 + n * 30, 170 + n * 20, 155);
        p.rect(px, py, CELL + 1, CELL + 1);
        if (n > 0.62) {
          p.fill(180, 210, 230, 90);
          p.textSize(10);
          p.textAlign(p.CENTER, p.CENTER);
          p.text((x + y + frame) % 2 === 0 ? "0" : "1", px + CELL / 2, py + CELL / 2);
        }
      }
    }
  }
}
