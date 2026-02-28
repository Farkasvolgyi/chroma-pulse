import { Injectable, signal, computed } from '@angular/core';

export interface GameColor {
  name: string;
  key: string;
  hex: string;
  glow: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  maxCombo: number;
}

type TargetSlot = 'circle' | 'edge-left' | 'edge-right';

export const GAME_COLORS: GameColor[] = [
  { name: 'Red', key: 'r', hex: '#FF3B5C', glow: 'rgba(255, 59, 92, 0.5)' },
  { name: 'Blue', key: 'b', hex: '#4D9FFF', glow: 'rgba(77, 159, 255, 0.5)' },
  { name: 'Green', key: 'g', hex: '#00E676', glow: 'rgba(0, 230, 118, 0.5)' },
  { name: 'Yellow', key: 'y', hex: '#FFD740', glow: 'rgba(255, 215, 64, 0.5)' },
  { name: 'Purple', key: 'p', hex: '#AA46FF', glow: 'rgba(170, 70, 255, 0.5)' },
];

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly gameState = signal<'menu' | 'countdown' | 'playing' | 'gameOver'>('menu');
  readonly countdownValue = signal(3);

  readonly score = signal(0);
  readonly displayScore = signal(0);
  readonly combo = signal(0);
  readonly maxCombo = signal(0);
  readonly lives = signal(3);
  readonly correctHits = signal(0);
  readonly totalAttempts = signal(0);

  readonly activeCircle = signal(-1);
  readonly activeEdge = signal<'left' | 'right' | null>(null);
  readonly activeTarget = signal<TargetSlot | null>(null);
  readonly activeColor = signal<GameColor | null>(null);
  readonly interval = signal(3000);

  readonly lastResult = signal<'correct' | 'wrong' | null>(null);
  readonly lastHitCircle = signal(-1);
  readonly lastHitTarget = signal<TargetSlot | null>(null);
  readonly lastFailureTarget = signal<TargetSlot | null>(null);
  readonly failureText = signal<'' | 'MISS' | 'OUT OF TIME'>('');
  readonly scorePopAmount = signal(0);

  readonly leftRectColor = signal<GameColor | null>(null);
  readonly rightRectColor = signal<GameColor | null>(null);
  readonly edgeLeftColor = signal<GameColor | null>(null);
  readonly edgeRightColor = signal<GameColor | null>(null);

  readonly speedMultiplier = computed(() => +(3000 / (this.interval()) * this.speedReductionFactor).toFixed(1));
  speedReductionFactor = 1;

  readonly showKeyLegend = computed(() => this.correctHits() < 30);
  readonly keyLegendOpacity = computed(() => {
    const hits = this.correctHits();
    if (hits < 20) return 1;
    if (hits >= 30) return 0;
    return 1 - (hits - 20) / 10;
  });

  readonly showCircleKey = computed(() => this.correctHits() < 150);
  readonly circleKeyOpacity = computed(() => {
    const hits = this.correctHits();
    if (hits < 130) return 1;
    if (hits >= 150) return 0;
    return 1 - (hits - 130) / 20;
  });

  readonly accuracy = computed(() => {
    const total = this.totalAttempts();
    return total === 0 ? 100 : Math.round((this.correctHits() / total) * 100);
  });

  readonly comboText = computed(() => {
    const c = this.combo();
    const speed = this.speedMultiplier();
    if (c >= 100 && speed >= 3) return 'LEGENDARY!!!!!!!!!!!!';
    if (c >= 85) return 'PERFECT!';
    if (c >= 55) return 'AMAZING';
    if (c >= 35) return 'GREAT';
    if (c >= 20) return 'NICE';
    return 'OK';
  });

  readonly comboLevel = computed(() => {
    const c = this.combo();
    const speed = this.speedMultiplier();
    if (c >= 100 && speed >= 3) return 'legendary';
    if (c >= 85) return 'amazing';
    if (c >= 55) return 'amazing';
    if (c >= 35) return 'great';
    if (c >= 20) return 'nice';
    return '';
  });

  readonly leaderboard = signal<LeaderboardEntry[]>(this.loadLeaderboard());

  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private scoreAnimTimer: ReturnType<typeof setInterval> | null = null;
  private waitingForInput = false;

  private loadLeaderboard(): LeaderboardEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem('chromapulse_lb');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLeaderboard(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('chromapulse_lb', JSON.stringify(this.leaderboard()));
  }

  startGame(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.scoreAnimTimer) clearInterval(this.scoreAnimTimer);

    this.speedReductionFactor = 1;
    this.score.set(0);
    this.displayScore.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.lives.set(3);
    this.activeCircle.set(-1);
    this.activeEdge.set(null);
    this.activeTarget.set(null);
    this.activeColor.set(null);
    this.interval.set(3000);
    this.correctHits.set(0);
    this.totalAttempts.set(0);
    this.lastResult.set(null);
    this.lastHitCircle.set(-1);
    this.lastHitTarget.set(null);
    this.lastFailureTarget.set(null);
    this.failureText.set('');
    this.scorePopAmount.set(0);
    this.leftRectColor.set(null);
    this.rightRectColor.set(null);
    this.edgeLeftColor.set(null);
    this.edgeRightColor.set(null);
    this.waitingForInput = false;
 

    this.gameState.set('countdown');
    this.countdownValue.set(3);

    this.countdownTimer = setInterval(() => {
      const val = this.countdownValue();
      if (val <= 1) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.gameState.set('playing');
        this.scheduleNextRound();
      } else {
        this.countdownValue.set(val - 1);
      }
    }, 800);
  }

  private scheduleNextRound(): void {
    setTimeout(() => this.nextRound(), 300);
  }

  private nextRound(): void {
    if (this.gameState() !== 'playing') return;

    this.lastHitCircle.set(-1);
    this.lastHitTarget.set(null);
    this.lastFailureTarget.set(null);
    this.failureText.set('');
    this.lastResult.set(null);

    const colorIndex = Math.floor(Math.random() * GAME_COLORS.length);
    const targetColor = GAME_COLORS[colorIndex];
    const targetIndex = Math.floor(Math.random() * 12);

    this.activeColor.set(targetColor);

    if (targetIndex < 10) {
      let circleIndex: number;
      do {
        circleIndex = Math.floor(Math.random() * 10);
      } while (circleIndex === this.activeCircle());
      this.activeCircle.set(circleIndex);
      this.activeEdge.set(null);
      this.activeTarget.set('circle');
    } else if (targetIndex === 10) {
      this.activeCircle.set(-1);
      this.activeEdge.set('left');
      this.activeTarget.set('edge-left');
      this.edgeLeftColor.set(targetColor);
    } else {
      this.activeCircle.set(-1);
      this.activeEdge.set('right');
      this.activeTarget.set('edge-right');
      this.edgeRightColor.set(targetColor);
    }

    this.waitingForInput = true;

    // Assign random colors to decorative side rectangles
    this.leftRectColor.set(GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]);
    this.rightRectColor.set(GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]);

    // Keep active edge synced with the required input color
    if (this.activeTarget() === 'edge-left') {
      this.edgeLeftColor.set(targetColor);
      this.edgeRightColor.set(GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]);
    } else if (this.activeTarget() === 'edge-right') {
      this.edgeRightColor.set(targetColor);
      this.edgeLeftColor.set(GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]);
    } else {
      this.edgeLeftColor.set(GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]);
      this.edgeRightColor.set(GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]);
    }

    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => {
      if (this.waitingForInput) {
        this.handleMiss();
      }
    }, this.interval());
  }

  handleKeyPress(key: string): void {
    if (this.gameState() !== 'playing' || !this.waitingForInput || !this.activeColor()) return;

    const normalizedKey = key.toLowerCase();
    const isGameKey = GAME_COLORS.some(c => c.key === normalizedKey);
    if (!isGameKey) return;

    this.waitingForInput = false;
    this.totalAttempts.update(v => v + 1);

    if (normalizedKey === this.activeColor()!.key) {
      this.handleCorrect();
    } else {
      this.handleWrong();
    }
  }

  private handleCorrect(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);

    this.combo.update(v => v + 1);
    this.correctHits.update(v => v + 1);
    this.lastHitCircle.set(this.activeCircle());
    this.lastHitTarget.set(this.activeTarget());
    this.lastFailureTarget.set(null);
    this.failureText.set('');

    const combo = this.combo();
    const speedMult = Math.min(Math.sqrt(this.speedMultiplier()), 128);
    const basePoints = 2;
    const comboBonus = 1 + Math.min(combo, 50) * 0.1;
    const speedBonus = speedMult;
    const points = Math.round(basePoints * comboBonus * speedBonus * speedBonus);

    if (combo >= 10) {
      this.playLargeComboSound();
    }

    this.score.update(v => v + points);
    this.scorePopAmount.set(points);
    this.lastResult.set('correct');
    this.animateScore();

    if (this.combo() > this.maxCombo()) {
      this.maxCombo.set(this.combo());
    }

    if (this.correctHits() % 5 === 0 && this.interval() > 600) {
      this.interval.update(v => Math.max(v - 80 + ((3000 - v) / 60), 600));
    }
    const randomSchedule = Math.random() * 150;

    const scheduleNextRound = Math.max(50, 350 - Math.sqrt(this.speedMultiplier()) * 50) + randomSchedule;

    setTimeout(() => {
      this.activeCircle.set(-1);
      this.activeEdge.set(null);
      this.activeTarget.set(null);
      this.activeColor.set(null);
      this.scheduleNextRound();
    }, scheduleNextRound);
  }

  private playLargeComboSound(): void {
    return;
  }

  private handleWrong(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);

    this.combo.set(0);
    this.lives.update(v => v - 1);
    this.lastResult.set('wrong');
    this.lastFailureTarget.set(this.activeTarget());
    this.failureText.set('MISS');
    //this.score.update(v => Math.max(0, v - 50));
    this.animateScore();



    setTimeout(() => {
    if (this.lives() <= 0) {
      this.endGame();
      return;
    }
      this.activeCircle.set(-1);
      this.activeEdge.set(null);
      this.activeTarget.set(null);
      this.activeColor.set(null);
      this.failureText.set('');
      this.scheduleNextRound();
    }, 600);
  }

  private handleMiss(): void {
    this.waitingForInput = false;
    this.totalAttempts.update(v => v + 1);
    this.combo.set(0);
    this.lives.update(v => v - 1);
    this.lastResult.set('wrong');
    this.lastFailureTarget.set(this.activeTarget());
    this.failureText.set('OUT OF TIME');
    this.interval.update(v => Math.max(v + 500, 600));


    setTimeout(() => {
            if (this.lives() <= 0) {
      this.endGame();
      return;
    }
        this.speedMultiplier();
      this.activeCircle.set(-1);
      this.activeEdge.set(null);
      this.activeTarget.set(null);
      this.activeColor.set(null);
      this.failureText.set('');
      this.scheduleNextRound();
    }, 600);
  }

  private endGame(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.waitingForInput = false;
    this.activeCircle.set(-1);
    this.activeEdge.set(null);
    this.activeTarget.set(null);
    this.activeColor.set(null);
    this.displayScore.set(this.score());
    this.gameState.set('gameOver');
  }

  private animateScore(): void {
    if (this.scoreAnimTimer) clearInterval(this.scoreAnimTimer);
    const target = this.score();
    const current = this.displayScore();
    const diff = target - current;
    const steps = 30;
    const increment = diff / steps;
    let step = 0;

    this.scoreAnimTimer = setInterval(() => {
      step++;
      if (step >= steps) {
        this.displayScore.set(target);
        if (this.scoreAnimTimer) clearInterval(this.scoreAnimTimer);
      } else {
        this.displayScore.set(Math.round(current + increment * step));
      }
    }, 30);
  }

  addToLeaderboard(name: string): void {
    const entry: LeaderboardEntry = {
      name: name.trim() || 'Anonymous',
      score: this.score(),
      date: new Date().toLocaleDateString(),
      maxCombo: this.maxCombo(),
    };
    this.leaderboard.update(lb =>
      [...lb, entry].sort((a, b) => b.score - a.score).slice(0, 10)
    );
    this.saveLeaderboard();
  }

  isHighScore(): boolean {
    const lb = this.leaderboard();
    return this.score() > 0 && (lb.length < 10 || this.score() > (lb.at(-1)?.score ?? 0));
  }

  returnToMenu(): void {
    this.gameState.set('menu');
  }

  destroy(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.scoreAnimTimer) clearInterval(this.scoreAnimTimer);
  }
}
