import { styleText } from "node:util";
import { log } from "./log";

export class ProgressBar {
  private total: number;
  private current = 0;
  private currentDate = "";
  private barWidth = 30;
  private startTime: number;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  update(current: number, date: string): void {
    this.current = current;
    this.currentDate = date;
    this.render();
  }

  private render(): void {
    const percent = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * this.barWidth);
    const empty = this.barWidth - filled;

    const bar =
      styleText("green", "█".repeat(filled)) +
      styleText("gray", "░".repeat(empty));
    const stats = `${this.current}/${this.total}`;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);

    process.stdout.write(
      `\r  [${bar}] ${styleText("cyan", percent.toString().padStart(3))}% ${styleText("gray", `(${stats})`)} ${styleText("yellow", this.currentDate)} ${styleText("gray", `${elapsed}s`)}`,
    );
  }

  complete(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write("\n");
    log.success(`Synced ${this.current}/${this.total} commits in ${elapsed}s`);
  }
}
